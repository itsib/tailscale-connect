const { GLib, GObject, Gio, Soup  } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var TailscaleSocketClient = class TailscaleSocketClient {
  _base = 'http://local-tailscaled.sock';
  _defaultSock = '/var/run/tailscale/tailscaled.sock';
  _encoder = new TextEncoder();
  _decoder = new TextDecoder();

  constructor(socketPath) {
    socketPath = socketPath || this._defaultSock;
    const address = new Gio.UnixSocketAddress(socketPath);

    this._cancelable = new Gio.Cancellable();

    const connection = new Gio.SocketClient().connect(address, this._cancelable)


    log('Soup Version' + Soup.__version__);

    this._session = new Soup.Session({
      local_address : address,
      timeout: 0,
      idle_timeout: 0,
    });



    const message = new Soup.Message({
      http_version: Soup.HTTPVersion.HTTP_1_1,
      method: 'GET',
      uri: new Soup.URI(this._url('/localapi/v0/prefs')),
    });
    message.request_headers.append('Host', 'local-tailscaled.sock');

    this._session.send_async(message, this._cancelable, (_, res, data) => {
      log(res);
      log(`RESULT ${data}`);
    })
  }

  async* stream(method, path, cancellable) {
    const message = Soup.Message.new(method, this._url(path));

    const base_stream = this._session.send(message, null);
    const stream = new Gio.DataInputStream({ base_stream });
    try {
      const content_type = message.response_headers.get_one('Content-Type');
      while (true) {
        Gio._promisify(Gio.DataInputStream.prototype, 'read_line_async');
        const [_response, length] = await stream.read_line_async(GLib.PRIORITY_DEFAULT, cancellable);
        if (length === 0) {
          break;
        }
        const response = this._decoder.decode(_response);
        yield content_type === 'application/json' ? JSON.parse(response) : response;
      }
    } finally {
      stream.close(null);
    }
  }

  async request(method, path, body = null) {
    const message = Soup.Message.new(method, this._url(path));
    if (body) {
      const bytes = this._encoder.encode(JSON.stringify(body));
      message.set_request_body_from_bytes('application/json', new GLib.Bytes(bytes));
    }

    Gio._promisify(Soup.Session.prototype, 'send_and_read_async');

    const response_bytes = await this.session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

    const response = this._decoder.decode(response_bytes.get_data());
    const content_type = message.response_headers.get_one("Content-Type");

    return content_type === "application/json" ? JSON.parse(response) : response;
  }

  destroy() {
    this._cancelable.cancel();
  }

  listen() {

    this.loop()
      .then(() => {
        log('Loop Finish')
      })
      .catch(error => {
        logError(error)
      });
  }

  async loop() {
    // const delay = (delay) => new Promise(resolve => setTimeout(resolve, delay));

    while (true) {
      try {
        for await (const update of this.stream('GET', '/localapi/v0/watch-ipn-bus', this._cancelable)) {
          log(update)
        }
      } catch (error) {
        if (this._cancelable.is_cancelled()) {
          break;
        }
        logError(error)
      }
      await delay(5000);
    }
  }

  _url(path) {
    return this._base + path;
  }
}