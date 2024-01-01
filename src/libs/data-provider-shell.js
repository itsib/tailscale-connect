/**
 * @module libs/data-provider-shell
 */
const { GObject, Gio, GLib } = imports.gi;

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

var DataProviderShell = class DataProviderShell extends GObject.Object {
  static [GObject.properties] = {
    status: GObject.ParamSpec.string('status', 'status', 'status', GObject.ParamFlags.READWRITE, ''),
    prefs: GObject.ParamSpec.string('prefs', 'prefs', 'prefs', GObject.ParamFlags.READWRITE, ''),
  }
  static { GObject.registerClass(this) }
  /**
   * Local UNIX socket
   * @type {string}
   * @private
   */
  _sock = '/var/run/tailscale/tailscaled.sock';
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

  constructor() {
    super();
  }

  listen() {
    this.interrupt();

    this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._updIntervalSec, this.refresh.bind(this));
    this.refresh();
  }

  interrupt() {
    if (this._timerId !== null) {
      GLib.Source.remove(this._timerId);
      this._timerId = null;
    }
  }

  refresh() {
    Promise.all([
      this._execute('status').then(this._extractJson),
      this._execute('prefs').then(this._extractJson),
    ])
      .then(([status, prefs]) => {
        if (status !== this.status) {
          this.set_property('status', status);
        }
        if (prefs !== this.prefs) {
          this.set_property('prefs', prefs);
        }
      })
      .catch(logError);

    return GLib.SOURCE_CONTINUE;
  }

  destroy() {
    this.interrupt();
    typeof super.destroy === 'function' && super.destroy()
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
      `echo -e "GET /localapi/v0/${param} HTTP/1.1\\r\\nHost: local-tailscaled.sock\\r\\n" | nc -U -N ${this._sock}`,
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

  _extractJson(rawResponse) {
    return rawResponse
      .replace(/\s+/g, ' ')
      .replace(/^[a-zA-Z0-9-;,_:./'\s]+{/, '{')
      .replace(/}[a-zA-Z0-9\s]+?$/, '}');
  }
}