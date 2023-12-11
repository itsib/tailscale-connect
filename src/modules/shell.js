const { Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Logger } = Me.imports.modules.logger;
const { StoreKey } = Me.imports.modules.utils;

/**
 * Run shell command
 * @param commands {string[]}
 * @param sudo {boolean}
 * @return {Promise<string>}
 */
var shell = (commands, sudo = false) => {
  return new Promise((resolve, reject) => {
    try {
      commands = sudo ? ['pkexec', ...commands] : commands;
      const proc = Gio.Subprocess.new(commands, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

      proc.communicate_utf8_async(null, null, (_, result) => {
          try {
            let [, stdout, stderr] = proc.communicate_utf8_finish(result);
            if (proc.get_successful()) {
              return resolve(stdout.trim());
            }
            return reject(stderr);
          } catch (e) {
            Logger.error(`ERROR_1: ${e.message} ${e?.toString()}`);
            return reject(e.message);
          }
      });
    } catch (e) {
      Logger.error(`ERROR_2: ${e.message} ${e?.stackTrace}`);
      return reject(e.message);
    }
  });
};

/**
 * Try to get tailscale status
 * @return {Promise<TailscaleStateJson>}
 */
var getStatus = () => {
  return shell(['tailscale', 'status', '--json']).then(JSON.parse);
};

var networkUp = ({ operator, acceptRoutes = true, reset = false }) => {
  const commands= ['tailscale', 'up'];

  // if (operator) commands.push(`--operator=${operator}`);
  // if (acceptRoutes) commands.push('--accept-routes');
  // if (reset) commands.push('--reset');

  Logger.info(...commands);

  return shell(commands)
    .then(result => {
      Logger.info('Connection enabled', result);
      return result;
    })
    .catch(error => {
      log(`${error.message}`);
      log(`${error.code}`);
      log(`${error}`);
    });
}

var networkDown = () => {
  return shell(['tailscale', 'down'])
    .then(result => {
      Logger.info('Connection disabled', result);
      return result;
    });
}

/**
 * Choose active exit node or null, to disconnect all nodes
 * @param nodeName
 */
var setExitNode = nodeName => {
  return shell(['tailscale', 'set', `--exit-node=${nodeName ?? ''}`])
    .then(result => {
      Logger.info('Connection disabled', result);
      return result;
    });
}


