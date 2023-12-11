const { GObject, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { StoreKey } = Me.imports.modules.utils;
const { getStatus } = Me.imports.modules.shell;

const { Logger } = Me.imports.modules.logger;

let StateInstance;
let timerId = null;
let destroyed = false;
let callTimestamp = null;

function startUpdater(callback) {
  if (timerId) {
    GLib.Source.remove(timerId);
  }

  if (destroyed) {
    return GLib.SOURCE_REMOVE;
  }
  callTimestamp = Date.now();

  const interval = ExtensionUtils.getSettings().get_int(StoreKey.RefreshInterval);
  Logger.info(`⏰ Callback will call through ${interval} sec.`);

  timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
    if (destroyed) {
      return GLib.SOURCE_REMOVE;
    }
    const msFromLastUpdate = Date.now() - callTimestamp
    Logger.info(`⏰ Time left, sec:`, (msFromLastUpdate / 1000).toString());

    callback();

    return startUpdater(callback);
  });

  return GLib.SOURCE_REMOVE;
}

class TsNode {
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
          if (!TsNode.deepEquals(objA[i], objB[i])) {
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
        if (!TsNode.deepEquals(keysA[key], objB[key])) {
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
   * @param {TailscalePeer} peer
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
   * @param {TailscalePeer} peer
   * @return {boolean}
   */
  equals(peer) {
    return TsNode.deepEquals(peer, this._peer);
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

class State extends GObject.Object {
  static [GObject.properties] = {
    state: GObject.ParamSpec.int('state', 'state', 'state', GObject.ParamFlags.READWRITE, 0, 2, 0),
    tailNetName: GObject.ParamSpec.string('tailNetName', 'tailNetName', 'tailNetName', GObject.ParamFlags.READWRITE, ''),
    domain: GObject.ParamSpec.string('domain', 'domain', 'domain', GObject.ParamFlags.READWRITE, ''),
    exitNode: GObject.ParamSpec.string('exitNode', 'exitNode', 'exitNode', GObject.ParamFlags.READWRITE, ''),
    nodes: GObject.ParamSpec.jsobject('nodes', 'nodes', 'nodes', GObject.ParamFlags.READWRITE),
  }

  static { GObject.registerClass(this) }

  constructor(params = {}) {
    destroyed = false;
    super(params);

    this.refresh();

    startUpdater(() => {
      this.refresh();
    });
  }

  /**
   * Get status from backend and call update
   */
  refresh(withNodes = false) {
    getStatus()
      .then(statusObject => {
        this.update(statusObject, withNodes);
      })
      .catch(error => {
        Logger.error('Fetch status error:', error.message, error);
      });
  }

  /**
   * Update state values if changes
   * @param {TailscaleStateJson} status
   * @param withNodes
   */
  update(status, withNodes = false) {
    const state = status.BackendState === 'Running' ? (status.ExitNodeStatus ? 2 : 1) : 0;

    this.set_property('state', state);
    if (status.CurrentTailnet?.Name !== this.tailNetName) this.set_property('tailNetName', status.CurrentTailnet?.Name);
    if (status.MagicDNSSuffix !== this.domain) this.set_property('domain', status.MagicDNSSuffix);

    let newExitNode = status.ExitNodeStatus?.ID ?? '';
    let exitNodeUpdated = false;
    if (newExitNode !== this.exitNode) {
      exitNodeUpdated = true;
    }

    if (withNodes || !this.nodes?.length || exitNodeUpdated) {
      this._compareNodes(status.Peer, newExitNode);

    } else if (exitNodeUpdated) {
      this.set_property('exitNode', newExitNode);
    }
  }

  /**
   * Destroys state
   */
  destroy() {
    destroyed = true;
    if (timerId) {
      GLib.Source.remove(timerId);
      timerId = null;
    }
  }

  /**
   * Compare and update nodes if difference
   * @private
   * @param peersByKey
   * @param newExitNode
   */
  _compareNodes(peersByKey, newExitNode) {
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
      /** @type {TsNode | undefined} */
      let node = this.nodes?.find(node => node.id === peer.ID);

      if (node && node.equals(peer)) {
        nodes.push(node);
      } else {
        nodes.push(new TsNode(peer, this.domain))
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

var getState = () => {
  if (!StateInstance) {
    StateInstance = new State();
  }
  return StateInstance;
}

var destroyState = () => {
  if (StateInstance) {
    StateInstance.destroy();
    StateInstance = null;
  }
}
