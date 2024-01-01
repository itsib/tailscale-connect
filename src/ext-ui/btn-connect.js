/**
 * @module ext-ui/btn-connect
 */
const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;

const { SettingsKey } = require('libs/utils');
const { networkUp, networkDown, setExitNode, login, logout } = require('libs/shell');

const _ = ExtensionUtils.gettext;

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
   * @param {Preferences} preferences
   */
  constructor(logger, preferences) {
    super(_('Disconnected') , true);

    this._logger = logger;

    this._icons = {
      [-2]: 'network-error-symbolic',
      [-1]: 'network-error-symbolic', // Logged Out
      [0]: 'network-wired-disconnected-symbolic',
      [1]: 'network-wired-symbolic',
      [2]: 'network-workgroup-symbolic',
    };

    this.icon.icon_name = this._icons[0];
    this.icon.set_x_expand(false);

    // Menu item style
    this.style_class += ' ts-menu-item'

    this._preferences = preferences;
    this._preferences.connect('notify::state', this.rerender.bind(this));
    this._preferences.connect('notify::exitNode', this.rerender.bind(this));
    this._preferences.connect('notify::nodes', this.rerender.bind(this));

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

    this._loginBtn = new PopupMenu.PopupMenuItem(_('Login'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    this._loginBtn.connect('activate', this.onClickLogin.bind(this));
    this._loginBtn.hide();
    this.menu.addMenuItem(this._loginBtn);
  }

  /**
   * Rerender label by changed state
   * @param {Preferences} preferences
   */
  rerender(preferences) {
    if (this.expanded) {
      return;
    }

    this.icon.icon_name = this._icons[preferences.state];

    if (preferences.state === -1) {
      return this._applyNeedLoginState();
    } else if (preferences.state === 0) {
      return this._applyDisconnectState();
    } else {
      return this._applyConnectedState(preferences);
    }
  }

  /**
   * Manage connection button click handler
   */
  onClickConnectBtn() {
    const state = this._preferences.state;
    const acceptRoutes = this._preferences.acceptRoutes;
    const settings = ExtensionUtils.getSettings();
    const operator = settings.get_string(SettingsKey.Operator);

    switch (state) {
      case -1:
        login({ operator });
        break;
      case 0:
        networkUp({ operator, acceptRoutes }).then(() => this._preferences.refresh(true));
        break;
      default:
        networkDown().then(() => this._preferences.refresh(true));
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
   * Login to tailnet
   */
  onClickLogin() {
    const settings = ExtensionUtils.getSettings();

    const flags = {
      loginServer: settings.get_string(SettingsKey.LoginServer),
      operator: settings.get_string(SettingsKey.Operator),
      advertiseExitNode: settings.get_string(SettingsKey.AdvertiseExitNode),
      advertiseTags: settings.get_strv(SettingsKey.AdvertiseTags),
      acceptRoutes: this._preferences.acceptRoutes,
      shieldsUp: this._preferences.shieldsUp,
      allowLanAccess: this._preferences.allowLanAccess,
    }


    login(flags);
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
    this._loginBtn.hide();
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
    this._loginBtn.hide();
  }

  /**
   * Display "Login" button
   * @private
   */
  _applyNeedLoginState() {
    this._removeNodesSubmenuItems();
    this.label.text = _('Logged Out');
    this._connectSwitchBtn.hide();
    this._logoutBtn.hide();
    this._loginBtn.show();
  }

  /**
   * Set labels and update buttons handlers
   * @param {Preferences} preferences
   * @private
   */
  _applyConnectedState(preferences) {
    this._removeNodesSubmenuItems();
    this.label.text = '';

    if (preferences.nodes) {
      this._insertConnectExitNodeMenuItem(new ConnectExitNodePopupMenuItem(this._logger, preferences));

      for (let i = 0; i < preferences.nodes.length; i++) {
        let node = preferences.nodes.at(i);
        if (!node.exitSupport) {
          continue;
        }

        let submenuItem = new ConnectExitNodePopupMenuItem(this._logger, preferences, node);
        let hostname = node.domain?.split(`.${preferences.domain}`)?.[0];
        if (preferences.exitNode === node.id && hostname) {
          this.label.text = _('Exit Node') + (hostname ? `: ${hostname}` : '');
        }

        this._insertConnectExitNodeMenuItem(submenuItem);
      }
    }

    if (!this.label.text) {
      this.label.text = _('Online');
    }

    this._connectSwitchBtn.label.text = _('Disconnect');
    this._connectSwitchBtn.show();
  }
}

class ConnectExitNodePopupMenuItem extends PopupMenu.PopupMenuItem {
  static [GObject.properties] = {
    enabled: GObject.ParamSpec.boolean('enabled', 'enabled', 'This node is used', GObject.ParamFlags.READWRITE, false),
  }
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Logger} logger
   * @param {Preferences} preferences
   * @param {?PeerModel} peerModel
   */
  constructor(logger, preferences, peerModel) {
    let exitNode = preferences.exitNode;
    let label = peerModel?.name ?? 'none';
    label = label.charAt(0).toUpperCase() + label.slice(1);

    super(label, { style_class: 'ts-popup-sub-menu-item' });

    this._preferences = preferences;
    this._logger = logger;

    const enabled = (!exitNode && !peerModel) || exitNode === peerModel?.id;

    this.connect('notify::enabled', self => {
      this.setOrnament(self.enabled ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
    });
    this.set_property('enabled', enabled);

    this.connect('activate', this._onClick.bind(this, preferences, peerModel));
  }

  /**
   * Menu item click handler switch exit node
   * @param {Preferences} preferences
   * @param {?PeerModel} peerModel
   * @private
   */
  _onClick(preferences, peerModel) {
    if (this.enabled) {
      this._logger.info('Already enabled');
      return;
    }
    this._logger.debug('Set exit node to', peerModel?.name ?? 'none');
    setExitNode(peerModel?.name).then(() => preferences.refresh(true));
  }
}