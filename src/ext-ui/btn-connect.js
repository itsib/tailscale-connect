/**
 * @module ext-ui/btn-connect
 */
const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;

const { networkUp, networkDown, setExitNode, login, logout } = require('libs/shell');
const { firstUpper } = require('libs/utils');

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
    this._connections = [];
    this._connections.push(this._preferences.connect('notify::enabled', this.rerender.bind(this)));
    this._connections.push(this._preferences.connect('notify::exitNode', this.rerender.bind(this)));
    this._connections.push(this._preferences.connect('notify::loggedIn', this.rerender.bind(this)));
    this._connections.push(this._preferences.connect('notify::nodes', this.rerender.bind(this)));
    this.rerender(true);

    this.menu.connect('open-state-changed', this._setIsOpenState.bind(this));
  }

  destroy() {
    if (this._preferences) {
      for (let i = 0; i < this._connections.length; i++) {
        this._preferences.disconnect(this._connections[i]);
      }
      this._preferences = null;
      this._connections = null;
    }
    this._logger = null;
  }

  /**
   * Rerender label by changed state
   * @param {boolean} force
   */
  rerender(force) {
    if (!force && !this.expanded) {
      return;
    }
    if (!this._preferences.loggedIn) {
      return this._rerenderLoggedOut();
    }
    if (this._preferences.loggedIn && !this._preferences.enabled) {
      return this._rerenderDisabled();
    }

    return this._rerenderEnabled();
  }

  /**
   * Manage connection button click handler
   */
  onClickConnect() {
    networkUp().then(() => this._preferences.refresh(true));
  }

  /**
   * Disconnect means tailscale down command
   */
  onClickDisconnect() {
    this._logger.debug('Disconnect');
    networkDown().then(() => this._preferences.refresh(true));
  }

  /**
   * Call logout command
   */
  onClickLogout() {
    this._logger.debug('Logout');
    logout();
  }

  /**
   * Login to tailnet
   */
  onClickLogin() {
    const settings = ExtensionUtils.getSettings();

    const flags = {
      loginServer: settings.get_string('login-server'),
      operator: settings.get_string('operator'),
      advertiseExitNode: settings.get_string('advertise-exit-node'),
      advertiseTags: settings.get_strv('advertise-tags'),
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
    this.expanded = open;
    if (open) {
      this.rerender(true);
    }
  }

  /**
   * Remove buttons with linked nodes
   * @private
   */
  _clearSubmenu() {
    const menuItems = this.menu.box.get_children().map(a => a._delegate).filter(item => {
      return item instanceof PopupMenu.PopupMenuItem || item instanceof PopupMenu.PopupSeparatorMenuItem;
    });

    for (let i = 0; i < menuItems.length; i++) {
      menuItems[i].destroy();
    }
  }

  /**
   * Display "Login" button
   * @private
   */
  _rerenderLoggedOut() {
    // 1) Set main button icon
    this.icon.icon_name = this._icons[-1];
    // 2) Change main button label
    this.label.text = _('Logged Out');
    // 3) Clear submenu
    this._clearSubmenu();

    // 4) Add necessary buttons
    const loginButton = new PopupMenu.PopupMenuItem(_('Login'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    loginButton.connect('activate', this.onClickLogin.bind(this));
    this.menu.addMenuItem(loginButton);
  }

  /**
   * Update labels and submenu
   * @private
   */
  _rerenderDisabled() {
    // 1) Set main button icon
    this.icon.icon_name = this._icons[0];
    // 2) Change main button label
    this.label.text = _('Offline');
    // 3) Clear submenu
    this._clearSubmenu();

    // 4) Add necessary buttons
    const connectButton = new PopupMenu.PopupMenuItem(_('Connect'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    connectButton.connect('activate', this.onClickConnect.bind(this))
    this.menu.addMenuItem(connectButton);

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const logoutButton = new PopupMenu.PopupMenuItem(_('Logout'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    logoutButton.connect('activate', this.onClickLogout.bind(this));
    this.menu.addMenuItem(logoutButton);
  }

  /**
   * Set labels and update buttons handlers
   * @private
   */
  _rerenderEnabled() {
    const exitNodeId = this._preferences.exitNode;
    const nodes = this._preferences.nodes || [];
    const exitNode = exitNodeId && nodes.find(exitNodeId) || null;

    // 1) Set main button icon
    this.icon.icon_name = this._icons[exitNodeId ? 2 : 1];
    // 2) Change main button label
    this.label.text = exitNode ? (_('Exit Node') + ': ' + firstUpper(exitNode.name)) : _('Online');
    // 3) Clear submenu
    this._clearSubmenu();

    // 4) Add necessary buttons
    const noneButton = new ConnectExitNodePopupMenuItem(this._logger, this._preferences);
    this.menu.addMenuItem(noneButton);

    for (let i = 0; i < nodes.length; i++) {
      let node = nodes.at(i);
      if (!node.exitSupport) {
        continue;
      }

      let submenuItem = new ConnectExitNodePopupMenuItem(this._logger, this._preferences, node);
      this.menu.addMenuItem(submenuItem);
    }

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const disconnectButton = new PopupMenu.PopupMenuItem(_('Disconnect'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    disconnectButton.connect('activate', this.onClickDisconnect.bind(this));
    this.menu.addMenuItem(disconnectButton);
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
   * @param {?PeerModel} node
   */
  constructor(logger, preferences, node) {
    const exitNodeId = preferences.exitNode;
    const label = firstUpper(node?.name ?? 'none');

    super(label, { style_class: 'ts-popup-sub-menu-item' });

    this._preferences = preferences;
    this._logger = logger;

    const enabled = (!exitNodeId && !node) || exitNodeId === node?.id;

    this.connect('notify::enabled', self => {
      this.setOrnament(self.enabled ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
    });
    this.set_property('enabled', enabled);

    this.connect('activate', this._onClick.bind(this, preferences, node));
  }

  /**
   * Menu item click handler switch exit node
   * @param {Preferences} preferences
   * @param {?PeerModel} node
   * @private
   */
  _onClick(preferences, node) {
    if (this.enabled) {
      this._logger.info('Already enabled');
      return;
    }
    this._logger.debug('Set exit node to', node?.name ?? 'none');
    setExitNode(node?.name).then(() => preferences.refresh(true));
  }
}