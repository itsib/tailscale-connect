/**
 * @module libs/data-provider-shell
 */
const { GObject, Gio, GLib } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;
const { extractPrefs, extractJson, extractNetwork, extractHealth, extractNodes } = require('libs/utils');

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

/**
 * @class
 * @typedef {Object} DataProviderShell
 * @property {string} network - Network info [networkName, domain]
 * @property {string} health - Health messages [string, string, ...]
 * @property {string} prefs - Stringify data struct [enabled, loggedIn, loginPageUrl, acceptRoutes, shieldsUp, webClient, exitNode, allowLanAccess];
 * @property {string} nodes - Network nodes [[id, domain, name, os, [tags], ipV4, ipV6, active, online, exitActive, exitSupport], ...]
 * @type {DataProviderShell}
 */
var DataProviderShell = class DataProviderShell extends GObject.Object {
  static [GObject.properties] = {
    network: GObject.ParamSpec.string('network', 'network', 'network', GObject.ParamFlags.READWRITE, '[]'),
    health: GObject.ParamSpec.string('health', 'health', 'health', GObject.ParamFlags.READWRITE, '[]'),
    prefs: GObject.ParamSpec.string('prefs', 'prefs', 'prefs', GObject.ParamFlags.READWRITE, '[]'),
    nodes: GObject.ParamSpec.string('nodes', 'nodes', 'nodes', GObject.ParamFlags.READWRITE, '[]'),
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
      this._execute('status').then(extractJson),
      this._execute('prefs').then(extractJson),
    ])
      .then(([statusRaw, prefsRaw]) => {
        this.network = extractNetwork(statusRaw)
        this.health = extractHealth(statusRaw)
        this.prefs = extractPrefs(prefsRaw);
        this.nodes = extractNodes(statusRaw);
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
}