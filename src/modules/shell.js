const { Gio } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Logger } = Me.imports.modules.logger;
const { StoreKey } = Me.imports.modules.utils;

function showNotifyError(error) {
  const msg = `${error}`.split(/[;.]/).map(sen => {
    sen = sen.trim();
    return sen.charAt(0).toUpperCase() + sen.substring(1) + '. ';
  }).join('')
  Main.notifyError('Command execution error.', msg);
}

/**
 * Run shell command
 * @param commands {string[]}
 * @param flags {Gio.SubprocessFlags}
 * @return {Promise<string>}
 */
var shell = (commands, flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE) => {
  return new Promise((resolve, reject) => {
    try {

      const proc = Gio.Subprocess.new(commands, flags);
      proc.communicate_utf8_async(null, null, (_, result) => {
          try {
            let [, stdout, stderr] = proc.communicate_utf8_finish(result);
            if (proc.get_successful() || stderr === null) {
              return resolve(stdout?.trim() || '');
            }
            return reject(new Error(stderr));
          } catch (e) {
            return reject(e);
          }
      });
    } catch (e) {
      return reject(e);
    }
  });
};

/**
 * Try to get tailscale status
 * @return {Promise<TailscaleStateJson>}
 */
var getStatus = () => {
  return shell(['tailscale', 'status', '--json']).then(result => {
    try {
      return JSON.parse(result);
    } catch (e) {
      Logger.warn(result);
      throw e;
    }
  });
};

/**
 * Login in network
 * @param {string} flags.operator --operator=
 * @param {boolean} flags.acceptRoutes --accept-routes
 * @return {Promise<string | void>}
 */
var login = (flags) => {
  const commands = ['pkexec', 'tailscale', 'up', '--reset', '--timeout=3s'];

  if (flags.operator) commands.push(`--operator=${flags.operator}`);
  if (flags.acceptRoutes) commands.push('--accept-routes');

  return shell(commands, Gio.SubprocessFlags.STDERR_MERGE | Gio.SubprocessFlags.STDOUT_PIPE)
    .then(output => {
      const result = output.match(new RegExp('(https?://[a-z0-9./?=&]+)'))
      if (!result) {
        throw new Error('Cannot parce url');
      }
      return result[1];
    })
    .catch(() => {
      return getStatus().then(status => status.AuthURL);
    })
    .then(authUrl => {
      Logger.info(`💻  Auth URL: ${authUrl}`);
      return shell(['xdg-open', authUrl], Gio.SubprocessFlags.STDOUT_SILENCE);
    })
    .catch(error => showNotifyError(error));
}

/**
 * Logout from login server
 * @return {Promise<void>}
 */
var logout = () => {
  return this.shell(['tailscale', 'logout'])
    .catch(error => {
      if (`${error}`.includes('access denied')) {
        const commands = ['pkexec', 'tailscale', 'logout'];
        return shell(commands);
      }

      throw error;
    })
    .then(() => {
      Main.notify(_('You\'re logged out from Tailscale'));
    })
    .catch(error => showNotifyError(error));
}

/**
 *
 * @param flags startup flags
 * @param {string} flags.operator --operator=
 * @param {boolean} flags.acceptRoutes --accept-routes
 * @return {Promise<string | void>}
 */
var networkUp = (flags = {}) => {
  return shell(['tailscale', 'up'])
    .catch(error => {
      if (`${error}`.includes('access denied')) {
        const commands = ['pkexec', 'tailscale', 'up', '--reset'];

        if (flags.operator) commands.push(`--operator=${flags.operator}`);
        if (flags.acceptRoutes) commands.push('--accept-routes');

        Logger.info(...commands);

        return shell(commands);
      }

      throw error;
    })
    .then(result => {
      Logger.info('Connection enabled', result);
      return result;
    })
    .catch(error => showNotifyError(error));
}

/**
 * Disconnect
 * @return {Promise<string>}
 */
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
      Logger.info(nodeName ? `Connected exit node ${nodeName}` : 'Disconnected exit node');
      return result;
    });
}

/**
 * Update accept routes flag
 * @param enabled
 * @return {Promise<string>}
 */
var setAcceptRoutes = enabled => {
  return shell(['tailscale', 'set', `--accept-routes=${enabled}`])
    .then(result => {
      Logger.info(`Accept routes changed: --accept-routes=${enabled}`, result);
      return result;
    });
}


