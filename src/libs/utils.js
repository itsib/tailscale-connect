/**
 * @module libs/utils
 */

const IGNORE_HEALTH_MSGS = [
  'state=Stopped, wantRunning=false',
  'state=NeedsLogin, wantRunning=false',
  'not in map poll',
];

/**
 * Replace first letter to upper case
 * @param {string} text
 * @return {string}
 */
var firstUpper = function firstUpper(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Bool to decimals opacity bind callback;
 * @param bind
 * @param source
 * @returns {[boolean,number]}
 */
var opacityBindTo = function opacityBindTo(bind, source) {
  return [true, source ? 255 : 0];
}

/**
 * Extract json string (remove any raw data before "{", and after "}").
 * Next to try to parce JSON string, or returns default value.
 *
 * @param {string} possibleJson
 * @param {Object} _default
 * @return {null|Object}
 */
var extractJson = function extractJson(possibleJson, _default = null) {
  try {
    const json = possibleJson
      .replace(/\s+/g, ' ')
      .replace(/^[a-zA-Z0-9-;*%,_?&:./'\s]+{/, '{')
      .replace(/}[a-zA-Z0-9-;*%,_?&:./'\s]+?$/, '}');
    return JSON.parse(json);
  } catch (error) {
    console.error('Json parse error', error);
    return _default;
  }
}

/**
 * Accepts a JSON string with the encoded Prefs model
 * and collects an array with the necessary data.
 * Then it transforms the string into JSON again.
 *
 * If cannot, returns empty string
 *
 *
 * @callback
 * @param {Object} prefs - Prefs raw should be Object like @see {tests/fixtures/prefs-0.json}
 * @return {string} [enabled, loggedIn, loginPageUrl, acceptRoutes, shieldsUp, webClient, exitNode, allowLanAccess]
 * @const
 */
var extractPrefs = function extractPrefs(prefs) {
  if (!prefs) {
    return '[]';
  }
  const loggedIn = !!prefs.Config && !prefs.LoggedOut
  return `[${prefs.WantRunning},${loggedIn},"${prefs.ControlURL}",${prefs.RouteAll},`+
          `${prefs.ShieldsUp},${prefs.RunWebClient},"${prefs.ExitNodeID}",${prefs.ExitNodeAllowLANAccess}]`;
}

/**
 * Accepts a JSON string with the encoded Status model
 * and collects an array with the necessary data.
 * Then it transforms the string into JSON again.
 *
 * If cannot, returns empty array-string
 *
 *
 * @callback
 * @param {Object} status - Status raw should be Object like @see {tests/fixtures/status-0.json}
 * @return {string} [networkName, domain]
 * @const
 */
var extractNetwork = function extractNetwork(status) {
  const networkName = status && status.CurrentTailnet && status.CurrentTailnet.Name || '';
  const domain = status && (status.MagicDNSSuffix || (status.CurrentTailnet && status.CurrentTailnet.Name)) || ''
  return `["${networkName}","${domain}"]`;
}

/**
 * Accepts a JSON string with the encoded Status model
 * and collects an array with the necessary data.
 * Then it transforms the string into JSON again.
 *
 * If cannot, returns empty array-string
 *
 *
 * @callback
 * @param {Object} status - Status raw should be Object like @see {tests/fixtures/status-0.json}
 * @return {string} Health messages [string, string, ...]
 * @const
 */
var extractHealth = function extractHealth(status) {
  if (!status || !Array.isArray(status.Health)) {
    return '[]';
  }

  let messages = '';
  for (let i = 0; i < status.Health.length; i++) {
    const msg = status.Health[i];
    if (IGNORE_HEALTH_MSGS.includes(msg)) {
      continue;
    }
    messages += `"${msg}",`
  }
  messages = messages.length ? messages.substring(0, messages.length - 1) : messages;
  return `[${messages}]`;
}

/**
 * Accepts a JSON string with the encoded Status model
 * and collects an array with the necessary data.
 * Then it transforms the string into JSON again.
 *
 * If cannot, returns empty array-string
 *
 *
 * @callback
 * @param {Object} status - Status raw should be Object like @see {tests/fixtures/status-0.json}
 * @return {string} Serialized nodes [[id, domain, name, os, [tags], ipV4, ipV6, active, online, exitActive, exitSupport], ...]
 * @const
 */
var extractNodes = function extractNodes(status) {
  const extract = p => {
    const name = p.DNSName.split('.')[0];
    const ips = p.TailscaleIPs ?? ['', ''];
    const tags = p.Tags ? JSON.stringify(p.Tags) : '[]';

    return `["${p.ID}","${p.DNSName}","${name}","${p.OS}",${tags},"${ips[0]}","${ips[1]}",` +
        `${!!p.Active},${!!p.Online},${!!p.ExitNode},${!!p.ExitNodeOption}]`
  };

  let nodes = '';
  if (status && status.Self) {
    nodes += extract(status.Self) + ','
  }

  if (status && status.Peer) {
    const peers = Object.values(status.Peer).sort((peerA, peerB) => {
      const crestedA = (new Date(peerA.Created)).getTime();
      const crestedB = (new Date(peerB.Created)).getTime();

      if (crestedA === crestedB) {
        return 0;
      }
      return crestedB > crestedA ? -1 : 1;
    });
    for (let i = 0; i < peers.length; i++) {
      nodes += extract(peers[i]) + ','
    }
  }
  nodes = nodes.length ? nodes.substring(0, nodes.length - 1) : nodes;
  return `[${nodes}]`;
}

// this.set_property('id', peerRaw.ID);
//     this.set_property('domain', peerRaw.DNSName);
//     this.set_property('name', peerRaw.DNSName.split('.')[0]);
//     this.set_property('os', peerRaw.OS);
//     this.set_property('tags', (peerRaw.Tags && Array.isArray(peerRaw.Tags)) ? peerRaw.Tags.join(',') : '');
//     this.set_property('ipV4', peerRaw.TailscaleIPs[0]);
//     this.set_property('ipV6', peerRaw.TailscaleIPs[1]);
//     this.set_property('active', !!peerRaw.Active);
//     this.set_property('online', !!peerRaw.Online);
//     this.set_property('exitActive', !!peerRaw.ExitNode);
//     this.set_property('exitSupport', !!peerRaw.ExitNodeOption);