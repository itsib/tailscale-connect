/**
 * @module libs/preferences
 */
const { GObject, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;
const { ConnectionState } = require('libs/utils');

const ReadWriteFlags = GObject.ParamFlags.CONSTRUCT | GObject.ParamFlags.READWRITE;

const IGNORE_HEALTH_MSGS = [
  'state=Stopped, wantRunning=false',
  'state=NeedsLogin, wantRunning=false',
  'not in map poll',
];

/**
 * Peer model, stores common servers data
 * @typedef PeerRaw
 * @property {string} ID
 * @property {boolean} Online
 * @property {[string,string]} TailscaleIPs
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
 * @interface PeerProperties
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
 * @implements PeerProperties
 * @extends GObject.Object
 * @typedef PeerModel
 * @export
 */
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
   * @param {PeerRaw} peerRaw
   */
  constructor(peerRaw) {
    super();
    this.set_property('id', peerRaw.ID);
    this.set_property('domain', peerRaw.DNSName);
    this.set_property('name', peerRaw.DNSName.split('.')[0]);
    this.set_property('os', peerRaw.OS);
    this.set_property('tags', (peerRaw.Tags && Array.isArray(peerRaw.Tags)) ? peerRaw.Tags.join(',') : '');
    this.set_property('ipV4', peerRaw.TailscaleIPs[0]);
    this.set_property('ipV6', peerRaw.TailscaleIPs[1]);
    this.set_property('active', !!peerRaw.Active);
    this.set_property('online', !!peerRaw.Online);
    this.set_property('exitActive', !!peerRaw.ExitNode);
    this.set_property('exitSupport', !!peerRaw.ExitNodeOption);
  }

  /**
   * Compare this model and raw data
   * @type {PeerRaw} peerRaw
   * @return boolean true if fields is same
   */
  compare(peerRaw) {
    const tags = peerRaw.Tags && Array.isArray(peerRaw.Tags) ? peerRaw.Tags.join(',') : '';
    return this.domain === peerRaw.DNSName &&
      this.os === peerRaw.OS &&
      this.tags === tags &&
      this.ipV4 === peerRaw.TailscaleIPs[0] &&
      this.ipV6 === peerRaw.TailscaleIPs[1] &&
      this.active === !!peerRaw.Active &&
      this.online === !!peerRaw.Online &&
      this.exitActive === !!peerRaw.ExitNode &&
      this.exitSupport === !!peerRaw.ExitNodeOption;
  }
}

/**
 * List model of peer connection info
 * @class
 * @extends GObject.Object
 * @implements Gio.ListModel
 * @type {PeersListModel}
 */
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
   * @param {PeerRaw[]} peersRaw
   */
  put(peersRaw) {
    if (peersRaw.length === this._peers.length) {
      for (let i = 0; i < peersRaw.length; i++) {
        const peer = this._peers[i];
        if (!peer || !peer.compare(peersRaw[i])){
          break;
        }

        if (i === (peersRaw.length - 1)) {
          return;
        }
      }
    }

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
   * @param {PeerRaw} peerRaw
   */
  append(peerRaw) {
    if (typeof peerRaw !== 'object' || Array.isArray(peerRaw)) {
      throw TypeError(`Wrong peer type`);
    }
    if (!peerRaw.ID || !peerRaw.DNSName || !Array.isArray(peerRaw.TailscaleIPs)) {
      throw TypeError(`Not enough required fields - ID, DNSName and TailscaleIPs`);
    }

    const index = this._ids[peerRaw.ID] ?? -1;

    // Add if not exists
    if (index === -1) {
      const i = this._peers.length;
      this._peers.push(new PeerModel(peerRaw));
      this._ids[peerRaw.ID] = i;
      this.items_changed(i, 0, 1);
    }
    // Replace if exists and different
    else if (!this._peers[index].compare(peerRaw)) {
      this._peers.splice(index, 1, new PeerModel(peerRaw));
      this._ids[peerRaw.ID] = index;
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

/**
 * Tailscale preferences
 *
 * @class
 * @extends {import(@girs/gobject-2.0).Object}
 * @extends {import(@girs/gobject-2.0).Binding}
 * @property {ConnectionState} state
 * @property {string} networkName
 * @property {string} loginPageUrl
 * @property {string} domain
 * @property {string} health
 * @property {boolean} acceptRoutes
 * @property {boolean} shieldsUp
 * @property {boolean} allowLanAccess
 * @property {boolean} webClient
 * @property {string} exitNode
 * @property {PeersListModel} nodes
 * @exports
 */
var Preferences = class Preferences extends GObject.Object {
  static [GObject.properties] = {
    state: GObject.ParamSpec.int('state', 'state', 'state', ReadWriteFlags, ConnectionState.NeedLogin, ConnectionState.Connected, 0),
    loginPageUrl: GObject.ParamSpec.string('loginPageUrl', 'loginPageUrl', 'loginPageUrl', ReadWriteFlags, ''),
    networkName: GObject.ParamSpec.string('networkName', 'networkName', 'networkName', ReadWriteFlags, ''),
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

  constructor(dataProvider) {
    super({ nodes: new PeersListModel() });

    this._dataProvider = dataProvider;

    this._connections.push(this._dataProvider.connect('notify::status', this._changedStatus.bind(this)));
    this._connections.push(this._dataProvider.connect('notify::prefs', this._changedPrefs.bind(this)));

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

  _changedPrefs() {
    const prefs = JSON.parse(this._dataProvider.prefs);

    if (prefs.LoggedOut || prefs.Config === null) {
      this.set_property('state', ConnectionState.NeedLogin);
    } else if (!prefs.WantRunning) {
      this.set_property('state', ConnectionState.Disabled);
    } else if (prefs.WantRunning && !prefs.ExitNodeID) {
      this.set_property('state', ConnectionState.Enabled);
    } else {
      this.set_property('state', ConnectionState.Connected);
    }

    if (prefs.ControlURL !== this.loginPageUrl) this.set_property('loginPageUrl', prefs.ControlURL || '');
    if (prefs.RouteAll !== this.acceptRoutes) this.set_property('acceptRoutes', prefs.RouteAll);
    if (prefs.ShieldsUp !== this.shieldsUp) this.set_property('shieldsUp', prefs.ShieldsUp);
    if (prefs.RunWebClient !== this.webClient) this.set_property('webClient', prefs.RunWebClient);
    if (prefs.ExitNodeID !== this.exitNode) this.set_property('exitNode', prefs.ExitNodeID || '');
    if (prefs.ExitNodeAllowLANAccess !== this.allowLanAccess) this.set_property('allowLanAccess', prefs.ExitNodeAllowLANAccess);
  }

  _changedStatus() {
    const status = JSON.parse(this._dataProvider.status);

    if (status.CurrentTailnet?.Name !== this.networkName) this.set_property('networkName', status?.CurrentTailnet?.Name || '');
    if (status.MagicDNSSuffix !== this.domain) this.set_property('domain', status.MagicDNSSuffix || '');

    const health = this._parseHealthMessage(status.Health);
    if (health !== this.health) this.set_property('health', health);

    this.nodes.put(Object.values(status.Peer || {}));
  }

  /**
   * Parce and translate tailscale heath messages
   * @param {string[]|null} messages
   * @returns {string}
   * @private
   */
  _parseHealthMessage(messages) {
    if(!Array.isArray(messages)) {
      return '';
    }
    const translated = [];
    for (let i = 0; i < messages.length; i++) {
      const srcMessage = messages[i];
      if (IGNORE_HEALTH_MSGS.includes(srcMessage)) {
        continue;
      }

      translated.push(srcMessage);
    }
    if (!translated.length) {
      return '';
    }
    return JSON.stringify(translated);
  }
}

