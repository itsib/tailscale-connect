/**
 * @module ext-ui/btn-connect
 */

const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require, SettingsKey } = Me.imports.libs.utils;

const { networkUp, networkDown, setExitNode, login, logout } = require('libs/shell');

const _ = ExtensionUtils.gettext;

class ConnectExitNodePopupMenuItem extends PopupMenu.PopupMenuItem {
  static [GObject.properties] = {
    enabled: GObject.ParamSpec.boolean('enabled', 'enabled', 'This node is used', GObject.ParamFlags.READWRITE, false),
  }
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Logger} logger
   * @param {Storage} storage
   * @param {?NetworkNode} networkNode
   */
  constructor(logger, storage, networkNode) {
    let exitNode = storage.exitNode;
    let label = networkNode?.name ?? 'none';
    label = label.charAt(0).toUpperCase() + label.slice(1);

    super(label, { style_class: 'ts-popup-sub-menu-item' });

    this._storage = storage;
    this._logger = logger;

    const enabled = (!exitNode && !networkNode) || exitNode === networkNode?.id;

    this.connect('notify::enabled', self => {
      this.setOrnament(self.enabled ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
    });
    this.set_property('enabled', enabled);

    this.connect('activate', this._onClick.bind(this, storage, networkNode));
  }

  /**
   * Menu item click handler switch exit node
   * @param {Storage} storage
   * @param {?NetworkNode} networkNode
   * @private
   */
  _onClick(storage, networkNode) {
    if (this.enabled) {
      this._logger.info('Already enabled');
      return;
    }
    this._logger.debug('Set exit node to', networkNode?.name ?? 'none');
    setExitNode(networkNode?.name).then(() => storage.refresh(true));
  }
}

/**
 * @typedef {import(@girs/gnome-shell/src/ui/popupMenu.d.ts)} PopupMenu
 * @property {PopupMenu.PopupSubMenuMenuItem} PopupSubMenuMenuItem
 * @property {PopupMenu.PopupBaseMenuItem} PopupBaseMenuItem
 *
 * @class
 * @extends PopupMenu.PopupSubMenuMenuItem
 * @extends PopupMenu.PopupBaseMenuItem
 * @type {TSBtnConnect}
 * @exports
 */
var TSBtnConnect = class TSBtnConnect extends PopupMenu.PopupSubMenuMenuItem {
  static [GObject.properties] = {
    expanded: GObject.ParamSpec.boolean('expanded', 'expanded', 'expanded', GObject.ParamFlags.READWRITE, false),
  }

  static { GObject.registerClass(this) }

  /**
   * @param {Logger} logger
   * @param {Storage} storage
   */
  constructor(logger, storage) {
    super(_('Disconnected') , true);

    this._logger = logger;

    this._icons = {
      [-2]: 'network-error-symbolic',
      [-1]: 'network-wired-no-route-symbolic', // Logged Out
      [0]: 'network-wired-disconnected-symbolic',
      [1]: 'network-wired-symbolic',
      [2]: 'network-workgroup-symbolic',
    };

    this.icon.icon_name = this._icons[0];
    this.icon.set_x_expand(false);

    // Menu item style
    this.style_class += ' ts-menu-item'

    this._storage = storage;
    this._storage.connect('notify::state', this.rerender.bind(this));
    this._storage.connect('notify::exitNode', this.rerender.bind(this));

    this.menu.connect('open-state-changed', this._setIsOpenState.bind(this));

    // Separator
    this._separator = new PopupMenu.PopupSeparatorMenuItem();
    this._separator.set_style('margin-top: 0px important; margin-bottom: 0px important;');
    this.menu.addMenuItem(this._separator);

    // Connect/Disconnect submenu item
    this._connectSwitchBtn = new PopupMenu.PopupMenuItem(_('Connect'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    this._connectSwitchBtn.connect('activate', this.onClickConnectBtn.bind(this))
    this.menu.addMenuItem(this._connectSwitchBtn);

    this._logoutBtn = new PopupMenu.PopupMenuItem(_('Logout'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    this._logoutBtn.connect('activate', this.onClickLogout.bind(this));
    this._logoutBtn.hide();
    this.menu.addMenuItem(this._logoutBtn);
  }

  /**
   * Rerender label by changed state
   * @param {Storage} storage
   */
  rerender(storage) {
    if (this.expanded) {
      return;
    }

    this.icon.icon_name = this._icons[storage.state];

    if (storage.state === -1) {
      return this._applyNeedLoginState();
    } else if (storage.state === 0) {
      return this._applyDisconnectState();
    } else {
      return this._applyConnectState(storage);
    }
  }

  /**
   * Manage connection button click handler
   */
  onClickConnectBtn() {
    const state = this._storage.state;
    const settings = ExtensionUtils.getSettings();
    const operator = settings.get_string(SettingsKey.Operator);
    const acceptRoutes = settings.get_string(SettingsKey.AcceptRoutes);

    switch (state) {
      case -1:
        login({ operator });
        break;
      case 0:
        networkUp({ operator, acceptRoutes }).then(() => this._storage.refresh(true));
        break;
      default:
        networkDown().then(() => this._storage.refresh(true));
    }
  }

  /**
   * Call logout command
   */
  onClickLogout() {
    this._logger.info('Logout');
    logout();
  }

  /**
   * Set open state (Block update nodes list)
   * @param menu
   * @param open
   * @private
   */
  _setIsOpenState(menu, open) {
    this.set_property('expanded', open);
  }

  /**
   * Returns all buttons for exit node manager
   * @return {ConnectExitNodePopupMenuItem[]}
   * @private
   */
  _getConnectExitNodeMenuItems() {
    return this.menu.box.get_children().map(a => a._delegate).filter(item => {
      return item instanceof ConnectExitNodePopupMenuItem;
    });
  }

  /**
   * Insert button before separator
   * @param {ConnectExitNodePopupMenuItem} item
   * @private
   */
  _insertConnectExitNodeMenuItem(item) {
    this._separator.show();
    const position = this._getConnectExitNodeMenuItems().length;
    this.menu.addMenuItem(item, position);
  }

  /**
   * Remove buttons with linked nodes
   * @private
   */
  _removeNodesSubmenuItems() {
    const menuItems = this._getConnectExitNodeMenuItems();
    for (let i = 0; i < menuItems.length; i++) {
      let item = menuItems[i];
      item.destroy();
    }
    this._separator.hide();
    this._logoutBtn.hide();
  }

  /**
   * Update labels and submenu
   * @private
   */
  _applyDisconnectState() {
    this._removeNodesSubmenuItems();
    this.label.text = _('Offline');
    this._connectSwitchBtn.label.text = _('Connect');
    this._logoutBtn.show();
  }

  /**
   * Display "Login" button
   * @private
   */
  _applyNeedLoginState() {
    this._removeNodesSubmenuItems();
    this.label.text = _('Logged Out');
    this._connectSwitchBtn.label.text = _('Login');
    this._logoutBtn.hide();
  }

  /**
   * Set labels and update buttons handlers
   * @param {Storage} storage
   * @private
   */
  _applyConnectState(storage) {
    this._removeNodesSubmenuItems();
    this.label.text = '';

    if (storage.nodes) {
      this._insertConnectExitNodeMenuItem(new ConnectExitNodePopupMenuItem(this._logger, storage));

      for (let i = 0; i < storage.nodes.length; i++) {
        let node = storage.nodes[i];
        if (!node.exitSupport) {
          continue;
        }

        let submenuItem = new ConnectExitNodePopupMenuItem(this._logger, storage, node);
        let hostname = node.domain?.split(`.${storage.domain}`)?.[0];
        if (storage.exitNode === node.id && hostname) {
          this.label.text = _('Exit Node') + (hostname ? `: ${hostname}` : '');
        }

        this._insertConnectExitNodeMenuItem(submenuItem);
      }
    }

    if (!this.label.text) {
      this.label.text = _('Online');
    }

    this._connectSwitchBtn.label.text = _('Disconnect');
  }
}