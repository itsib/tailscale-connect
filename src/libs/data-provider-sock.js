/**
 * @module libs/data-provider-sock
 */
const { GObject, Gio, GLib } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;
const { extractPrefs, extractJson, extractNetwork, extractHealth, extractNodes } = require('libs/utils');

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

var DataProviderSock = class DataProviderSock extends GObject.Object {
  static [GObject.properties] = {
    network: GObject.ParamSpec.string('network', 'network', 'network', GObject.ParamFlags.READWRITE, '[]'),
    health: GObject.ParamSpec.string('health', 'health', 'health', GObject.ParamFlags.READWRITE, '[]'),
    prefs: GObject.ParamSpec.string('prefs', 'prefs', 'prefs', GObject.ParamFlags.READWRITE, '[]'),
    nodes: GObject.ParamSpec.string('nodes', 'nodes', 'nodes', GObject.ParamFlags.READWRITE, '[]'),
  }

  static { GObject.registerClass(this) }
  /**
   * Local sock address
   * @type {string}
   * @private
   */
  _socket = '/var/run/tailscale/tailscaled.sock';
  /**
   * Command for watch tailscale status
   * @type {string[]}
   * @private
   */
  _commands = ['tailscale', 'debug', 'watch-ipn'];
  /**
   *
   * @type {Gio.Cancellable|null}
   * @private
   */
  _cancelable = null;
  /**
   * Refresh timer
   * @private {number|null}
   */
  _timerId = null;
  /**
   * Refresh interval for network state
   * @type {number}
   * @private
   */
  _updIntervalSec = 10;

  constructor(logger, settings) {
    super();
    this._settings = settings;
    this._logger = logger;

    this._socket = this._settings.get_string('socket');
    this._subprocess = Gio.Subprocess.new(this._commands, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
  }

  listen() {
    this.interrupt();
    this.refresh();

    this._logger.debug('Listen socket');
    this._loop().catch(error => {
      logError(error);
    });

    this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._updIntervalSec, this.refresh.bind(this));
  }

  interrupt() {
    if (this._cancelable !== null) {
      this._cancelable.cancel();
      this._cancelable = null;
    }

    if (this._timerId !== null) {
      GLib.Source.remove(this._timerId);
      this._timerId = null;
    }
  }

  refresh() {
    Promise.all([this._refreshPrefs(), this._refreshStatus()])
      .catch(error => this._logger.error(error));

    return GLib.SOURCE_CONTINUE;
  }

  destroy() {
    this.interrupt();
  }

  async _loop() {
    this._cancelable = new Gio.Cancellable();
    const inputStream = new Gio.DataInputStream({
      base_stream: this._subprocess.get_stdout_pipe(),
      close_base_stream: true,
    });

    // let data = null;
    let frame;
    while ((frame = await this._read(inputStream, this._cancelable)) !== null) {
      try {
        if (!frame) continue;
        const object = JSON.parse(frame);
        if (!object) continue;

        if (object.Prefs) {
          this._logger.debug('Receive new prefs')
          this.prefs = extractPrefs(object.Prefs);
        }
        this._refreshStatus();
      } catch (e) {
        this._logger.error(e, 'Loop error');
      }
    }
  }

  /**
   * Read one line in stream and return result
   * @param {Gio.DataInputStream} stream
   * @param {Gio.Cancellable | null} cancellable
   * @returns {Promise<string>};
   */
  async _readLine(stream, cancellable = null) {
    return new Promise((resolve, reject) => {
      stream.read_line_async(GLib.PRIORITY_DEFAULT, cancellable, (_stream, res) => {
        try {
          const [data] = _stream.read_line_finish_utf8(res);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      });
    })
  }

  /**
   * Read one object in stream and return result
   * @param {Gio.DataInputStream} stream
   * @param {Gio.Cancellable | null} cancellable
   * @returns {Promise<string>};
   */
  async _read(stream, cancellable = null) {
    let data = '';
    let line;
    while ((line = await this._readLine(stream, cancellable)) !== null) {
      data += line;
      if (line === '}') {
        break;
      }
    }

    return data;
  }

  /**
   * Send command to UNIX socket
   * @param {'prefs'|'status'} param
   * @param {Gio.Cancellable|null} cancellable
   * @return {Promise<string>}
   * @private
   */
  async _execute(param, cancellable = null) {
    let cancelId = 0;
    const commands = [
      '/bin/bash',
      '-c',
      `echo -e "GET /localapi/v0/${param} HTTP/1.1\\r\\nHost: local-tailscaled.sock\\r\\n" | nc -U -N ${this._socket}`,
    ];
    const proc = Gio.Subprocess.new(commands, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

    const [stdout, stderr] = await proc.communicate_utf8_async(null, cancellable);

    if (cancellable instanceof Gio.Cancellable) {
      cancelId = cancellable.connect(() => proc.force_exit());
    }

    try {
      if (proc.get_successful() || stderr === null) {
        return stdout?.trim() || '';
      }
      throw new Error({ code: Gio.IOErrorEnum.FAILED, message: `Command "${param}" failed` });
    } finally {
      if (cancelId > 0)
        cancellable.disconnect(cancelId);
    }
  }

  /**
   * Refresh prefs property
   * @return {Promise<void>}
   * @private
   */
  async _refreshPrefs() {
    try {
      const prefsRaw = await this._execute('prefs').then(extractJson);
      this.prefs = extractPrefs(prefsRaw);
    } catch (error) {
      this._logger.error(error);
    }
  }

  /**
   * Refresh network, health and nodes properties
   * @return {Promise<void>}
   * @private
   */
  async _refreshStatus() {
    try {
      const statusRaw = await this._execute('status').then(extractJson);
      this.network = extractNetwork(statusRaw)
      this.health = extractHealth(statusRaw)
      this.nodes = extractNodes(statusRaw);
    } catch (error) {
      this._logger.error(error);
    }
  }
}