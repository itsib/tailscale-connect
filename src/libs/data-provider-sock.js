/**
 * @module libs/data-provider-sock
 */
const { GObject, Gio, GLib } = imports.gi;

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

var DataProviderSock = class DataProviderSock extends GObject.Object {
  static [GObject.properties] = {
    status: GObject.ParamSpec.string('status', 'status', 'status', GObject.ParamFlags.READWRITE, ''),
    prefs: GObject.ParamSpec.string('prefs', 'prefs', 'prefs', GObject.ParamFlags.READWRITE, ''),
  }

  static { GObject.registerClass(this) }

  _sock = '/var/run/tailscale/tailscaled.sock';

  _encoder = new TextEncoder();

  _decoder = new TextDecoder();
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

  constructor() {
    super();

    this._subprocess = Gio.Subprocess.new(this._commands, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
  }

  listen() {
    this.interrupt();
    this.refresh();

    console.log('listen')
    this._loop().catch(error => {
      logError(error);
    })
  }

  interrupt() {
    if (this._cancelable !== null) {
      this._cancelable.cancel()
      this._cancelable = null;
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
  }

  destroy() {
    this.interrupt();
  }

  _extractJson(rawResponse) {
    return rawResponse
      .replace(/\s+/g, ' ')
      .replace(/^[a-zA-Z0-9-;,_:./'\s]+{/, '{')
      .replace(/}[a-zA-Z0-9\s]+?$/, '}');
  }

  _onPrefsUpdateByLoop(prefsRaw) {
    const prefs = JSON.stringify(prefsRaw);
    if (prefs !== this.prefs) {
      this.prefs = prefs;
    }
  }

  _onNetMapUpdateByLoop(netmapRaw) {

    for (let i = 0; i < netmapRaw.Peers.length; i++) {
      const peerRawV2 = netmapRaw.Peers[i];
    }

    const Peer = {
      "nodekey:01ae403ec6d29869c1c0b57b2bd8a69d7ff2b9299409703c4d4b89e8de61ef13": {
        "ID": "nqSwpNgvzN11CNTRL",
        "PublicKey": "nodekey:01ae403ec6d29869c1c0b57b2bd8a69d7ff2b9299409703c4d4b89e8de61ef13",
        "HostName": "my-home.local",
        "DNSName": "my-home.faun-boga.ts.net.",
        "OS": "linux",
        "UserID": 8137555580851953,
        "TailscaleIPs": [
        "100.97.239.20",
        "fd7a:115c:a1e0::de61:ef14"
      ],
        "Tags": [
        "tag:client",
        "tag:exit",
        "tag:home"
      ],
        "PrimaryRoutes": [
        "192.168.0.0/24"
      ],
        "Addrs": null,
        "CurAddr": "95.188.71.189:49716",
        "Relay": "ams",
        "RxBytes": 1423992,
        "TxBytes": 660188,
        "Created": "2023-12-06T08:43:15.979805982Z",
        "LastWrite": "2023-12-10T13:48:06.214572764+07:00",
        "LastSeen": "0001-01-01T00:00:00Z",
        "LastHandshake": "2023-12-10T16:43:32.425675003+07:00",
        "Online": true,
        "ExitNode": false,
        "ExitNodeOption": false,
        "Active": true,
        "PeerAPIURL": [
        "http://100.97.239.20:50011",
        "http://[fd7a:115c:a1e0::de61:ef14]:50011"
      ],
        "InNetworkMap": true,
        "InMagicSock": true,
        "InEngine": true
      },
    };
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
          this._onPrefsUpdateByLoop(object.Prefs);
        }
        if (object.NetMap) {
          this._onNetMapUpdateByLoop(object.NetMap);
        }
        console.log(JSON.stringify(object, null, '  '));
        console.log('-------------------------------------------');
      } catch (e) {
        logError('Loop error' + e);
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