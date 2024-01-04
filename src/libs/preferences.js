/**
 * @module libs/preferences
 *
 * @class
 * @typedef {Object} PeersListModel - List model of peer connection info
 * @extends GObject.Object
 * @implements Gio.ListModel
 *
 * @class
 * @typedef {Object} PeerModel - Peer model, stores common servers data
 * @extends GObject.Object
 * @property {string} id
 * @property {string} domain
 * @property {string} name
 * @property {string} os
 * @property {string} tags
 * @property {string} ipV4
 * @property {string} ipV6
 * @property {boolean} active
 * @property {boolean} online
 * @property {boolean} exitActive
 * @property {boolean} exitSupport
 *
 * @class
 * @typedef {Object} Preferences - Stores and watch with data provider tailscale states and preferences
 * @extends {import(@girs/gobject-2.0).Object}
 * @extends {import(@girs/gobject-2.0).Binding}
 * @property {boolean} loggedIn
 * @property {boolean} enabled
 * @property {string} networkName
 * @property {string} myNodeId
 * @property {string} loginPageUrl
 * @property {string} domain
 * @property {string} health
 * @property {boolean} acceptRoutes
 * @property {boolean} shieldsUp
 * @property {boolean} allowLanAccess
 * @property {boolean} webClient
 * @property {string} exitNode
 * @property {PeersListModel} nodes
 */
const { GObject, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;

const ReadWriteFlags = GObject.ParamFlags.CONSTRUCT | GObject.ParamFlags.READWRITE;

/** @alias module:libs/preferences.PeerModel */
var PeerModel = class PeerModel extends GObject.Object {
  static [GObject.properties] = {
    id: GObject.ParamSpec.string('id', 'id', 'id', ReadWriteFlags, ''),
    domain: GObject.ParamSpec.string('domain', 'domain', 'domain', ReadWriteFlags, ''),
    name: GObject.ParamSpec.string('name', 'name', 'name', ReadWriteFlags, ''),
    os: GObject.ParamSpec.string('os', 'os', 'os', ReadWriteFlags, ''),
    tags: GObject.ParamSpec.string('tags', 'tags', 'Coma separated tags', ReadWriteFlags, ''),
    ipV4: GObject.ParamSpec.string('ipV4', 'ipV4', 'ipV4', ReadWriteFlags, '0.0.0.0'),
    ipV6: GObject.ParamSpec.string('ipV6', 'ipV6', 'ipV6', ReadWriteFlags, '::::'),
    active: GObject.ParamSpec.boolean('active', 'active', 'Is active', ReadWriteFlags, false),
    online: GObject.ParamSpec.boolean('online', 'online', 'Is online', ReadWriteFlags, false),
    exitActive: GObject.ParamSpec.boolean('exitActive', 'exitActive', 'Can be exit node', ReadWriteFlags, false),
    exitSupport: GObject.ParamSpec.boolean('exitSupport', 'exitSupport', 'Is exit node supports', ReadWriteFlags, false),
  };

  static { GObject.registerClass(this) }

  /**
   * @param {[string, string, string, string, string[], string, string, boolean, boolean, boolean, boolean]} peerRaw
   */
  constructor(peerRaw) {
    super();
    this.set_property('id',           peerRaw[0]);
    this.set_property('domain',       peerRaw[1]);
    this.set_property('name',         peerRaw[2]);
    this.set_property('os',           peerRaw[3]);
    this.set_property('tags',         peerRaw[4].join(','));
    this.set_property('ipV4',         peerRaw[5]);
    this.set_property('ipV6',         peerRaw[6]);
    this.set_property('active',       peerRaw[7]);
    this.set_property('online',       peerRaw[8]);
    this.set_property('exitActive',   peerRaw[9]);
    this.set_property('exitSupport',  peerRaw[10]);
  }

  /**
   * Compare this model and raw data
   * @type {[string, string, string, string, string[], string, string, boolean, boolean, boolean, boolean]} peerRaw
   * @return boolean true if fields is same
   */
  compare(peerRaw) {
    const [, domain, name, os,, ipV4, ipV6, active, online, exitActive, exitSupport] = peerRaw;
    const tags = peerRaw[4].join(',');

    return this.domain === domain &&
      this.name === name &&
      this.os === os &&
      this.tags === tags &&
      this.ipV4 === ipV4 &&
      this.ipV6 === ipV6 &&
      this.active === active &&
      this.online === online &&
      this.exitActive === exitActive &&
      this.exitSupport === exitSupport;
  }
}

/** @alias module:libs/preferences.PeersListModel */
var PeersListModel = class PeersListModel extends GObject.Object {
  static [GObject.interfaces] = [Gio.ListModel];
  static { GObject.registerClass(this) }

  /** @type {PeerModel[]} */
  _peers = [];
  /**
   * ID -> index map
   * @type {{[id: string]: number}}
   * @private
   */
  _ids = {};

  /**
   *
   * @return {Generator<PeerModel>}
   */
  *[Symbol.iterator]() {
    for (const peer of this._peers)
      yield peer;
  }

  constructor() {
    super();
  }

  /**
   * Implements Gio.ListModel interface method
   * @param {number} index
   * @return {GObject.GType<string>|null}
   */
  vfunc_get_item(index) {
    return this.at(index) || null;
  }

  vfunc_get_item_type() {
    return PeerModel;
  }

  vfunc_get_n_items() {
    return this.length;
  }

  /**
   * Sync peers and stored list
   * @param {[string, string, string, string, string[], string, string, boolean, boolean, boolean, boolean][]} peersRaw
   */
  changeAll(peersRaw) {
    const oldLen = this._peers.length;
    this._peers = new Array(peersRaw.length);
    this._ids = {};

    for(let i = 0; i < peersRaw.length; i++) {
      const peer = new PeerModel(peersRaw[i]);
      this._peers[i] = peer;
      this._ids[peer.id] = i;
    }

    this.items_changed(0, oldLen, this._peers.length);
  }

  /**
   * Insert peer to list end if not exists.
   * if peer exists check peer changes and replace
   * @param {[string, string, string, string, string[], string, string, boolean, boolean, boolean, boolean]} peerRaw
   */
  append(peerRaw) {
    if (!Array.isArray(peerRaw) || peerRaw.length !== 11) {
      throw TypeError(`Wrong peer type`);
    }

    const index = this._ids[peerRaw[0]] ?? -1;
    const peer = new PeerModel(peerRaw);

    // Add if not exists
    if (index === -1) {
      const i = this._peers.length;
      this._peers.push(peer);
      this._ids[peer.id] = i;
      this.items_changed(i, 0, 1);
    }
    // Replace if exists and different
    else {
      this._peers.splice(index, 1, peer);
      this.items_changed(index, 1, 1);
    }
  }

  /**
   * Remove peer model from list
   * @param {string} id
   */
  remove(id) {
    const index = this._ids[id] ?? -1;
    if (index === -1) {
      return;
    }
    this._peers.splice(index, 1);
    Reflect.deleteProperty(this._ids, id);
    this.items_changed(index, 1, 0);
  }

  /**
   * Get PeerModel by index
   * @param {number} index
   * @return {PeerModel}
   */
  at(index) {
    return this._peers[index];
  }

  /**
   * Find peer node by id
   * @param {string} id
   * @return {PeerModel|null}
   */
  find(id) {
    const index = this._ids[id] ?? -1;
    return index > -1 ? this._peers[index] : null;
  }

  /**
   * Destroy list model
   */
  destroy() {
    this._peers = null;
    this._ids = null;
  }

  get length() {
    return this._peers.length;
  }

  set length(len) {
    if (this._peers.length <= len) {
      return;
    }
    const removed = this._peers.splice(len);
    for (let i = 0; i < removed.length; i++) {
      Reflect.deleteProperty(this._ids, removed[i].id);
    }

    this.items_changed(len - 1, removed.length, 0);
  }
}

/** @alias module:libs/preferences.Preferences */
var Preferences = class Preferences extends GObject.Object {
  static [GObject.properties] = {
    loggedIn: GObject.ParamSpec.boolean('loggedIn', 'loggedIn', 'loggedIn', ReadWriteFlags, false),
    enabled: GObject.ParamSpec.boolean('enabled', 'enabled', 'enabled', ReadWriteFlags, false),
    loginPageUrl: GObject.ParamSpec.string('loginPageUrl', 'loginPageUrl', 'loginPageUrl', ReadWriteFlags, ''),
    networkName: GObject.ParamSpec.string('networkName', 'networkName', 'networkName', ReadWriteFlags, ''),
    myNodeId: GObject.ParamSpec.string('myNodeId', 'myNodeId', 'myNodeId', ReadWriteFlags, ''),
    domain: GObject.ParamSpec.string('domain', 'domain', 'domain', ReadWriteFlags, ''),
    health: GObject.ParamSpec.string('health', 'health', 'health', ReadWriteFlags, ''),
    acceptRoutes: GObject.ParamSpec.boolean('acceptRoutes', 'acceptRoutes', '--accept-routes', ReadWriteFlags, true),
    shieldsUp: GObject.ParamSpec.boolean('shieldsUp', 'shieldsUp', '--shields-up', ReadWriteFlags, false),
    webClient: GObject.ParamSpec.boolean('webClient', 'webClient', '--webclient', ReadWriteFlags, false),
    allowLanAccess: GObject.ParamSpec.boolean('allowLanAccess', 'allowLanAccess', '--exit-node-allow-lan-access', ReadWriteFlags, false),
    exitNode: GObject.ParamSpec.string('exitNode', 'exitNode', 'exitNode', ReadWriteFlags, ''),
    nodes: GObject.ParamSpec.object('nodes', 'nodes', 'nodes', ReadWriteFlags, PeersListModel),
  }

  static { GObject.registerClass(this) }

  _connections = [];
  /** @type {DataProvider} */
  _dataProvider

  /**
   * @class
   * @typedef {Object} DataProvider
   * @extends GObject.Object
   * @property {string} network
   * @property {string} health
   * @property {string} prefs
   * @property {string} nodes
   * @function listen - Begin to watch tailscale options
   * @method interrupt - Finish to watch tailscale options
   * @method refresh - Force refresh options
   * @method destroy - Destroy provider
   *
   * @param {DataProvider} dataProvider
   */
  constructor(dataProvider) {
    super({ nodes: new PeersListModel() });

    this._dataProvider = dataProvider;

    this._connections.push(this._dataProvider.connect('notify::prefs', this._changedPrefs.bind(this)));
    this._connections.push(this._dataProvider.connect('notify::network', this._changedNetwork.bind(this)));
    this._connections.push(this._dataProvider.connect('notify::health', this._changedHealth.bind(this)));
    this._connections.push(this._dataProvider.connect('notify::nodes', this._changedNodes.bind(this)));

    this._dataProvider.listen();
  }

  destroy() {
    this.nodes.destroy();
    this.nodes = null;

    for (let i = 0; i < this._connections.length; i++) {
      this._dataProvider.disconnect(this._connections[i])
    }
    this._connections = null;
    this._dataProvider.destroy();
    this._dataProvider = null;
  }

  refresh() {
    this._dataProvider.refresh();
  }

  /**
   * Returns warnings
   * @return string[]|null
   */
  getHealth() {
    if (!this.health || this.health === '[]') {
      return null;
    }
    return JSON.parse(this.health);
  }

  _changedPrefs() {
    const prefs = JSON.parse(this._dataProvider.prefs);

    this.enabled = !!prefs[0];
    this.loggedIn = !!prefs[1];
    this.loginPageUrl = prefs[2] ?? '';
    this.acceptRoutes = !!prefs[3];
    this.shieldsUp = !!prefs[4];
    this.webClient = !!prefs[5];
    this.exitNode = prefs[6] ?? '';
    this.allowLanAccess = !!prefs[7];
  }

  _changedNetwork() {
    const network = JSON.parse(this._dataProvider.network);
    this.networkName = network[0];
    this.domain = network[1];
    this.myNodeId = network[2];
  }

  _changedHealth() {
    this.health = this._dataProvider.health;
  }

  _changedNodes() {
    this.nodes.changeAll(JSON.parse(this._dataProvider.nodes));
  }
}

