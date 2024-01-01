/**
 * @module libs/shell
 *
 * @typedef {object} NetworkUpFlags
 * @property {?string} operator --operator=
 * @property {?boolean} acceptRoutes --accept-routes
 * @property {?boolean} reset --accept-routes
 *
 * @typedef {object} EntityId
 * @property {(string|number)} ID
 *
 * @typedef PeerBase
 * @extends EntityId
 * @property {boolean} Online
 * @property {[string,string]} TailscaleIPs
 *
 * @typedef Peer
 * @extends PeerBase
 * @property {boolean} Online
 * @property {string} PublicKey
 * @property {string} HostName
 * @property {string} DNSName
 * @property {string} OS
 * @property {number} UserID
 * @property {string[]} Tags
 * @property {null} Addrs
 * @property {string} CurAddr
 * @property {string} Relay
 * @property {number} RxBytes
 * @property {number} TxBytes
 * @property {string} Created
 * @property {string} LastWrite
 * @property {string} LastSeen
 * @property {string} LastHandshake
 * @property {boolean} ExitNode
 * @property {boolean} ExitNodeOption
 * @property {boolean} Active
 * @property {boolean} InNetworkMap
 * @property {boolean} InMagicSock
 * @property {boolean} InEngine
 *
 * @typedef SelfPeer
 * @extends Peer
 * @property {string[]} CapMap
 *
 * @typedef User
 * @extends EntityId
 * @property {string} LoginName "itsib.su@gmail.com",
 * @property {string} DisplayName
 * @property {string} ProfilePicURL
 * @property {string[]} Roles
 *
 * @typedef {object} CurrentTailnet
 * @property {string} Name
 * @property {string} MagicDNSSuffix
 * @property {boolean} MagicDNSEnabled
 *
 * @typedef NetworkState
 * @type {Object}
 * @property {string} Version
 * @property {boolean} TUN
 * @property {string} BackendState
 * @property {string} AuthURL
 * @property {CurrentTailnet} CurrentTailnet
 * @property {string[]} TailscaleIPs
 * @property {SelfPeer} Self
 * @property {?PeerBase} ExitNodeStatus
 * @property {string[]|null} Health
 * @property {string} MagicDNSSuffix
 * @property {string[]} CertDomains
 * @property {Record<string, Peer>} Peer
 * @property {Record<string, User>} User
 *
 * --------------------------------------------------
 *
 * @typedef NetworkPrefsUserProfile
 * @type {Object}
 * @property {string} ID
 * @property {string} LoginName
 * @property {string} DisplayName
 * @property {string} ProfilePicURL
 * @property {string[]} Roles
 *
 * @typedef NetworkPrefsConfig
 * @type {Object}
 * @property {string} NodeID
 * @property {string} PrivateMachineKey
 * @property {string} PrivateNodeKey
 * @property {string} OldPrivateNodeKey
 * @property {string} Provider
 * @property {string} NetworkLockKey
 * @property {NetworkPrefsUserProfile} UserProfile
 *
 * @typedef NetworkPrefs
 * @type {Object}
 * @property {string} ControlURL
 * @property {boolean} RouteAll
 * @property {boolean} AllowSingleHosts
 * @property {string} ExitNodeID
 * @property {string} ExitNodeIP
 * @property {boolean} ExitNodeAllowLANAccess
 * @property {boolean} CorpDNS
 * @property {boolean} RunSSH
 * @property {boolean} RunWebClient
 * @property {boolean} WantRunning
 * @property {boolean} LoggedOut
 * @property {boolean} ShieldsUp
 * @property {string[]|null} AdvertiseTags
 * @property {string} Hostname
 * @property {boolean} NotepadURLs
 * @property {string[]|null} AdvertiseRoutes
 * @property {boolean} NoSNAT
 * @property {number} NetfilterMode
 * @property {string} OperatorUser
 * @property {Object} AutoUpdate
 * @property {boolean} AutoUpdate.Check
 * @property {boolean} AutoUpdate.Apply
 * @property {NetworkPrefsConfig} Config
 */

const { Gio } = imports.gi;
const Main = imports.ui.main;

function showNotifyError(error) {
  const msg = `${error}`.split(/[;.]/).map(sen => {
    sen = sen.trim();
    return sen.charAt(0).toUpperCase() + sen.substring(1) + '. ';
  }).join('')
  Main.notifyError('Command execution error.', msg);
}

/**
 * Run shell command
 *
 * @param commands {string[]}
 * @param flags {Gio.SubprocessFlags}
 * @return {Promise<string>}
 */
var shell = function shell(commands, flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)  {
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
}

/**
 * Login in network
 *
 * @param {string} flags.operator --operator=
 * @param {string} flags.authKey --auth-key=
 * @param {string} flags.hostname --hostname=
 * @param {string} flags.loginServer --login-server=
 * @param {boolean} flags.acceptDns --accept-dns
 * @param {boolean} flags.acceptRoutes --accept-routes
 * @param {boolean} flags.shieldsUp --shields-up
 * @param {boolean} flags.allowLanAccess --exit-node-allow-lan-access
 * @param {boolean} flags.snatSubnetRoutes --snat-subnet-routes
 * @param {boolean} flags.ssh --ssh
 * @param {boolean} flags.advertiseExitNode --advertise-exit-node
 * @param {string[]} flags.advertiseRoutes --advertise-routes=
 * @param {string[]} flags.advertiseTags --advertise-tags=
 * @return {Promise<string | void>}
 */
var login = function login(flags) {
  const commands = ['pkexec', 'tailscale', 'up', '--reset', '--timeout=3s'];

  if (flags.operator) commands.push(`--operator=${flags.operator}`);
  if (flags.authKey) commands.push(`--auth-key=${flags.authKey}`);
  if (flags.hostname) commands.push(`--auth-key=${flags.hostname}`);
  if (flags.loginServer) commands.push(`--login-server=${flags.loginServer}`);
  if (flags.acceptDns) commands.push('--accept-dns');
  if (flags.acceptRoutes) commands.push('--accept-routes');
  if (flags.shieldsUp) commands.push('--shields-up');
  if (flags.allowLanAccess) commands.push('--exit-node-allow-lan-access');
  if (flags.snatSubnetRoutes) commands.push('--snat-subnet-routes');
  if (flags.ssh) commands.push('--ssh');
  if (flags.advertiseExitNode) commands.push('--advertise-exit-node');
  if (flags.advertiseRoutes && flags.advertiseRoutes.length) commands.push(`--advertise-routes=${flags.advertiseRoutes.join(',')}`);
  if (flags.advertiseTags && flags.advertiseTags.length) commands.push(`--advertise-tags=${flags.advertiseTags.join(',')}`);

  return shell(commands, Gio.SubprocessFlags.STDERR_MERGE | Gio.SubprocessFlags.STDOUT_PIPE)
    .then(output => {
      const result = output.match(new RegExp('(https?://[a-z0-9./?=&]+)'))
      if (!result) {
        throw new Error('Cannot parce url');
      }
      return result[1];
    })
    .catch(() => {
      return getNetworkState().then(status => status.AuthURL);
    })
    .then(authUrl => {
      return shell(['xdg-open', authUrl], Gio.SubprocessFlags.STDOUT_SILENCE);
    })
    .catch(error => showNotifyError(error));
}

/**
 * Logout from login server
 * @return {Promise<void>}
 */
var logout = function logout() {
  return shell(['tailscale', 'logout'])
    .catch(error => {
      if (`${error}`.includes('access denied')) {
        const commands = ['pkexec', 'tailscale', 'logout'];
        return shell(commands);
      }

      throw error;
    })
    .catch(error => showNotifyError(error));
}

/**
 * Connect to network
 * @param {NetworkUpFlags} flags startup flags
 *
 * @return {Promise<string | void>}
 */
var networkUp = function networkUp(flags = {}) {
  return shell(['tailscale', 'up'])
    .catch(error => {
      if (`${error}`.includes('access denied')) {
        const commands = ['pkexec', 'tailscale', 'up', '--reset'];

        if (flags.operator) commands.push(`--operator=${flags.operator}`);
        if (flags.acceptRoutes) commands.push('--accept-routes');

        return shell(commands);
      }

      throw error;
    })
    .catch(error => showNotifyError(error));
}

/**
 * Disconnect
 * @return {Promise<string>}
 */
var networkDown = function networkDown() {
  return shell(['tailscale', 'down'])
    .then(result => {
      return result;
    });
}

/**
 * Choose active exit node or null, to disconnect all nodes
 * @param nodeName
 */
var setExitNode = function setExitNode(nodeName) {
  return shell(['tailscale', 'set', `--exit-node=${nodeName ?? ''}`])
    .then(result => {
      return result;
    });
}

/**
 * Try to get tailscale status
 *
 * @return {Promise<NetworkState>}
 */
var getNetworkState = function getNetworkState()  {
  return shell(['tailscale', 'status', '--json'])
    .then(result => JSON.parse(result))
}