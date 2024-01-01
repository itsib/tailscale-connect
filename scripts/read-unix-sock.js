const { GLib, GObject, Gio  } = imports.gi;

const PATH = '/var/run/tailscale/tailscaled.sock';

const Encoder = new TextEncoder();
const Decoder = new TextDecoder();

const loop = new GLib.MainLoop(null, false);

// 1) Use UNIX-domain sockets.  Cannot be used together with -F or -x.
// 2) shutdown(2) the network socket after EOF on the input. Some servers require this to finish their work.

function createConnection() {
  const client = new Gio.SocketClient({ family: Gio.SocketFamily.UNIX, timeout: 1000 });
  const address = new Gio.UnixSocketAddress({ path: PATH, address_type: Gio.UnixSocketAddressType.PATH });

  const connection = client.connect(address, null);
  if (!connection) {
    throw 'Connection failed'
  }
  return connection;
}

/**
 * Write data to stream
 * @param {Gio.DataOutputStream} stream
 * @param {string} data
 */
function write(stream, data) {
  return new Promise((resolve, reject) => {
    const buffer = Encoder.encode(data);

    try {
      stream.write_async(buffer, GLib.PRIORITY_DEFAULT, null, (source_object, res, data) => {
        console.log('is_closed:' + source_object.is_closed() + ' is_closed:' +source_object.is_closed() + ' data:' + res.get_user_data());


        return resolve(data)
      });
    } catch (e) {
      return  reject(e);
    }
  });


}

/**
 *
 * @param {Gio.DataInputStream} stream
 * @param {Gio.Cancellable | null} cancellable
 * @returns {Promise<unknown>}
 */
function read(stream, cancellable = null) {
  return new Promise((resolve, reject) => {
    stream.read_line_async(GLib.PRIORITY_DEFAULT, cancellable, (_stream, res) => {
      try {
        log(res)
        resolve(_stream.read_line_finish_utf8(res)[0]);
      } catch (e) {
        reject(e);
      }
    });
  });
}

(async () => {
  const connection = createConnection();

  const outputStream = Gio.DataOutputStream.new(connection.get_output_stream());
  const inputStream = Gio.DataInputStream.new(connection.get_input_stream());

  await write(outputStream, 'GET /localapi/v0/prefs HTTP/1.1\\r\\nHost: local-tailscaled.sock\\r\\n');

  // console.log(`Bytes Write: ${bytesWrote}`);
  //
  // let line = null;

  try {
    let line = null;

    while ((line = await read(inputStream)) !== null)
      console.log(line);

    // End of stream reached, no error
  } catch (e) {
    logError(e);
  }


  console.log('Finished');
  loop.quit();



  // input.read_bytes_async(4096, 0, null, (stream, res) => {
  //   console.log('Finished');
  //   const byresRead = input.read_bytes_finish(res);
  //
  //   const response = Decoder.decode(byresRead.get_data());
  //
  //   console.log('received response: '+response);
  //
  //   loop.quit();
  // });

  // loop.run();

})();

const proc = Gio.Subprocess.new(commands, flags);

loop.run();