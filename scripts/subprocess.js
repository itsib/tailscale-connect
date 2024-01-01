const { GLib, GObject, Gio  } = imports.gi;

const loop = new GLib.MainLoop(null, false);
const Decoder = new TextDecoder();

/**
 * Read one line in stream and return result
 * @param {Gio.DataInputStream} stream
 * @param {Gio.Cancellable | null} cancellable
 * @returns {Promise<string>};
 */
async function readLine(stream, cancellable = null) {
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
async function read(stream, cancellable = null) {
  let data = '';
  let line;
  while ((line = await readLine(stream, cancellable)) !== null) {
    data += line;
    if (line === '}') {
      break;
    }
  }

  return data;
}


(async () => {
  try {
    const commands = ['tailscale', 'debug', 'watch-ipn'];
    const proc = Gio.Subprocess.new(commands, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    const inputStream = new Gio.DataInputStream({
      base_stream: proc.get_stdout_pipe(),
      close_base_stream: true,
    });

    let data = null;
    let frame;
    while ((frame = await read(inputStream)) !== null) {
      const object = JSON.parse(frame);
      const prefs = object.Prefs;
      if (prefs) {
        console.log(`RouteAll:               ${prefs.RouteAll}`);
        console.log(`ExitNodeAllowLANAccess: ${prefs.ExitNodeAllowLANAccess}`);
        console.log(`ShieldsUp:              ${prefs.ShieldsUp}`);
        console.log(`---------------------------------------------------`);
      } else {
        console.log(object);
      }
    }
  } catch (e) {
    console.error(e);
  }

  loop.quit();
})()

loop.run();