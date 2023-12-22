/**
 * @module libs/storage
 *
 * @typedef {module:libs/shell} NetworkState
 */

const { GObject } = imports.gi;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const { require, SettingsKey, ConnectionState } = Extension.imports.libs.utils;

const { getNetworkState } = require('libs/shell');

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
 * @property {string} domain
 * @property {string} health
 * @property {string} exitNode
 */
var Storage = class Storage extends GObject.Object {
  static [GObject.properties] = {
    state: GObject.ParamSpec.int('state', 'state', 'state', GObject.ParamFlags.READWRITE, ConnectionState.NeedLogin, ConnectionState.Connected, 0),
    networkName: GObject.ParamSpec.string('networkName', 'networkName', 'networkName', GObject.ParamFlags.READWRITE, ''),
    domain: GObject.ParamSpec.string('domain', 'domain', 'domain', GObject.ParamFlags.READWRITE, ''),
    health: GObject.ParamSpec.string('health', 'health', 'health', GObject.ParamFlags.READWRITE, ''),
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

    getNetworkState()
      .then(networkState => {
        this.update(networkState, withNodes);
        this._loading = false;
      })
      .catch(error => {
        this._loading = false;
        this._logger.error(error, 'Refresh network store attempt error');
      });
  }

  /**
   * Update state values if changes
   * @param {NetworkState} networkState
   * @param {boolean} withNodes
   */
  update(networkState, withNodes = false) {
    switch (networkState.BackendState.trim()) {
      case 'NeedsLogin':
        this.set_property('state', ConnectionState.NeedLogin);
        break;
      case 'Running':
        if (networkState.ExitNodeStatus) {
          this.set_property('state', ConnectionState.Connected);
        } else {
          this.set_property('state', ConnectionState.Enabled);
        }
        break;
      default:
        this.set_property('state', ConnectionState.Disabled);
    }
    if (networkState.CurrentTailnet?.Name !== this.networkName) this.set_property('networkName', networkState?.CurrentTailnet?.Name || '');
    if (networkState.MagicDNSSuffix !== this.domain) this.set_property('domain', networkState.MagicDNSSuffix || '');

    const health = networkState.Health?.join(' ') ?? '';
    if (health !== this.health) this.set_property('health', health);

    let newExitNode = networkState.ExitNodeStatus?.ID ?? '';
    let exitNodeUpdated = false;
    if (newExitNode !== this.exitNode) {
      exitNodeUpdated = true;
    }

    if (withNodes || !this.nodes?.length || exitNodeUpdated) {
      this._compareNodes(networkState.Peer, newExitNode);

    } else if (exitNodeUpdated) {
      this.set_property('exitNode', newExitNode);
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
}