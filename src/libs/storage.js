/**
 * @module libs/storage
 */
const { GObject } = imports.gi;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const { require, SettingsKey, ConnectionState } = Extension.imports.libs.utils;

const { getNetworkPrefs, getNetworkState } = require('libs/shell');
const { HeathTranslate } = require('libs/heath-translate');

var NetworkNode = class NetworkNode {
  _tags = [];

  static deepEquals(objA, objB) {
    if (objA === objB) {
      return true;
    }

    if (objA && objB && typeof objA === 'object' && typeof objB === 'object') {
      // Compare arrays
      if (Array.isArray(objA)) {
        if (objA.length !== objB.length) {
          return false;
        }
        for (let i = 0; i < objA.length; i++) {
          if (!NetworkNode.deepEquals(objA[i], objB[i])) {
            return false;
          }
        }
        return true;
      }

      // Compare objects
      const keysA = Object.keys(objA);
      const keysB = Object.keys(objB);
      if (keysA.length !== keysB.length) {
        return false;
      }

      for (const key in keysA) {
        if (!NetworkNode.deepEquals(keysA[key], objB[key])) {
          return false;
        }
      }
      return true;
    }

    // true if both NaN, false otherwise
    return objA !== objA && objB !== objB;
  }

  /**
   *
   * @param {Peer} peer
   * @param {string} domainSuffix
   */
  constructor(peer, domainSuffix) {
    this._peer = peer;
    this._name = peer.DNSName.split(`.${domainSuffix}`)[0];

    if (peer.Tags && Array.isArray(peer.Tags)) {
      this._tags = [...peer.Tags];
    }
  }

  /**
   * Compare inner prototype peer and passed peer
   * @param {Peer} peer
   * @return {boolean}
   */
  equals(peer) {
    return NetworkNode.deepEquals(peer, this._peer);
  }

  get id() {
    return this._peer.ID;
  }
  get pubkey() {
    return this._peer.PublicKey;
  }
  get domain() {
    return this._peer.DNSName;
  }
  get name() {
    return this._name;
  }
  get os() {
    return this._peer.OS;
  }
  get tags() {
    return this._tags;
  }
  get ipV4() {
    return this._peer.TailscaleIPs[0];
  }
  get ipV6() {
    return this._peer.TailscaleIPs[1];
  }
  get active() {
    return this._peer.Active;
  }
  get online() {
    return this._peer.Online;
  }
  get exitActive() {
    return this._peer.ExitNode;
  }
  get exitSupport() {
    return this._peer.ExitNodeOption;
  }
}

/**
 * Network state storage
 *
 * @class
 * @extends {import(@girs/gobject-2.0).Object}
 * @extends {import(@girs/gobject-2.0).Binding}
 * @property {ConnectionState} state
 * @property {string} networkName
 * @property {string} loginPegeUrl
 * @property {string} domain
 * @property {string} health
 * @property {boolean} acceptRoutes
 * @property {boolean} shieldsUp
 * @property {boolean} allowLanAccess
 * @property {string} exitNode
 * @exports
 */
var Storage = class Storage extends GObject.Object {
  static [GObject.properties] = {
    state: GObject.ParamSpec.int('state', 'state', 'state', GObject.ParamFlags.READWRITE, ConnectionState.NeedLogin, ConnectionState.Connected, 0),
    loginPegeUrl: GObject.ParamSpec.string('loginPegeUrl', 'loginPegeUrl', 'loginPegeUrl', GObject.ParamFlags.READWRITE, ''),
    networkName: GObject.ParamSpec.string('networkName', 'networkName', 'networkName', GObject.ParamFlags.READWRITE, ''),
    domain: GObject.ParamSpec.string('domain', 'domain', 'domain', GObject.ParamFlags.READWRITE, ''),
    health: GObject.ParamSpec.string('health', 'health', 'health', GObject.ParamFlags.READWRITE, ''),
    acceptRoutes: GObject.ParamSpec.boolean('acceptRoutes', 'acceptRoutes', '--accept-routes', GObject.ParamFlags.READWRITE, true),
    shieldsUp: GObject.ParamSpec.boolean('shieldsUp', 'shieldsUp', '--shields-up', GObject.ParamFlags.READWRITE, false),
    allowLanAccess: GObject.ParamSpec.boolean('allowLanAccess', 'allowLanAccess', '--exit-node-allow-lan-access', GObject.ParamFlags.READWRITE, false),
    exitNode: GObject.ParamSpec.string('exitNode', 'exitNode', 'exitNode', GObject.ParamFlags.READWRITE, ''),
    nodes: GObject.ParamSpec.jsobject('nodes', 'nodes', 'nodes', GObject.ParamFlags.READWRITE),
  }

  static { GObject.registerClass(this) }

  /**
   *
   * @param {Logger} logger
   */
  constructor(logger) {
    super({});
    this._logger = logger;
    this._loading = false;

    this.refresh(true);
  }

  /**
   * Refresh storage by network state
   * @param {?boolean} withNodes
   */
  refresh(withNodes = false) {
    if (this._loading) {
      this._logger.info('Refresh already process');
      return;
    }
    this._loading = true;

    Promise.all([
      getNetworkPrefs(),
      getNetworkState(),
    ])
      .then(([prefs, nodes]) => {
        this.update(prefs, nodes, withNodes);
        this._loading = false;
      })
      .catch(error => {
        this._loading = false;
        this._logger.error(error, 'Refresh network store attempt error');
      });
  }

  /**
   * Update state values if changes
   * @param {NetworkPrefs} prefs
   * @param {NetworkState} networkState
   * @param withNodes
   */
  update(prefs, networkState, withNodes = false) {
    if (prefs.LoggedOut || prefs.Config === null) {
      this.set_property('state', ConnectionState.NeedLogin);
    } else if (!prefs.WantRunning) {
      this.set_property('state', ConnectionState.Disabled);
    } else if (prefs.WantRunning && !prefs.ExitNodeID) {
      this.set_property('state', ConnectionState.Enabled);
    } else {
      this.set_property('state', ConnectionState.Connected);
    }

    if (networkState.CurrentTailnet?.Name !== this.networkName) this.set_property('networkName', networkState?.CurrentTailnet?.Name || '');
    if (networkState.MagicDNSSuffix !== this.domain) this.set_property('domain', networkState.MagicDNSSuffix || '');
    if (prefs.ControlURL !== this.loginPegeUrl) this.set_property('loginPegeUrl', prefs.ControlURL);
    if (prefs.RouteAll !== this.acceptRoutes) this.set_property('acceptRoutes', prefs.RouteAll);
    if (prefs.ShieldsUp !== this.shieldsUp) this.set_property('shieldsUp', prefs.ShieldsUp);
    if (prefs.ExitNodeAllowLANAccess !== this.allowLanAccess) this.set_property('allowLanAccess', prefs.ExitNodeAllowLANAccess);

    const health = this._parseHealthMessage(networkState.Health);
    if (health !== this.health) this.set_property('health', health);

    let exitNodeUpdated = false;
    if (prefs.ExitNodeID !== this.exitNode) {
      exitNodeUpdated = true;
    }

    if (withNodes || !this.nodes?.length || exitNodeUpdated) {
      this._compareNodes(networkState.Peer, prefs.ExitNodeID);

    } else if (exitNodeUpdated) {
      this.set_property('exitNode', prefs.ExitNodeID);
    }
  }

  /**
   * Destroys state
   */
  destroy() {
    this._logger = null;
    this.nodes = null;
  }

  /**
   * Compare and update nodes if difference
   * @private
   * @param peersByKey
   * @param newExitNode
   */
  _compareNodes(peersByKey, newExitNode = '') {
    peersByKey = peersByKey || {}
    let updated = false;
    let pubKeys = Object.keys(peersByKey);
    let nodes = [];

    for (let i = 0; i < pubKeys.length; i++) {
      let pubKey = pubKeys[i];
      let peer = peersByKey[pubKey];
      if (!peer) {
        Logger.warn('No peer with key', pubKey);
        continue;
      }
      /** @type {NetworkNode | undefined} */
      let node = this.nodes?.find(node => node.id === peer.ID);

      if (node && node.equals(peer)) {
        nodes.push(node);
      } else {
        nodes.push(new NetworkNode(peer, this.domain))
        updated = true;
      }
    }

    if (!this.nodes || nodes.length !== this.nodes?.length) {
      updated = true;
    }

    if (updated) {
      this.nodes = nodes;
      this.notify('nodes');
      this.set_property('exitNode', newExitNode);
    }
  }

  /**
   * Parce and translate tailscale heath messages
   * @param {string[]|null} messages
   * @returns {null}
   * @private
   */
  _parseHealthMessage(messages) {
    if(!messages || !messages.length) {
      return '';
    }
    const translated = [];
    for (let i = 0; i < messages.length; i++) {
      const src = messages[i];
      const msg = src ? (src in HeathTranslate ? HeathTranslate[src] : src) : null;
      if (msg) {
        translated.push(msg);
      }
    }
    if (!translated.length) {
      return '';
    }
    return JSON.stringify(translated);
  }
}