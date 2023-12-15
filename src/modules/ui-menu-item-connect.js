const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { networkUp, networkDown, setExitNode, login, logout } = Me.imports.modules.shell;
const { Logger } = Me.imports.modules.logger;
const { StoreKey  } = Me.imports.modules.utils;

const _ = ExtensionUtils.gettext;

const getIcon = id => {

}

class ConnectExitNodePopupMenuItem extends PopupMenu.PopupMenuItem {
  static [GObject.properties] = {
    enabled: GObject.ParamSpec.boolean('enabled', 'enabled', 'This node is used', GObject.ParamFlags.READWRITE, false),
  }
  static { GObject.registerClass(this) }

  /**
   *
   * @param {GObject.Object} tsState
   * @param {TsNode | undefined} tsNode
   */
  constructor(tsState, tsNode) {
    let exitNode = tsState.exitNode;
    let label = tsNode?.name ?? 'none';
    label = label.charAt(0).toUpperCase() + label.slice(1);

    super(label, { style_class: 'ts-popup-sub-menu-item' });

    this._tsState = tsState;

    const enabled = (!exitNode && !tsNode) || exitNode === tsNode?.id;

    this.connect('notify::enabled', self => {
      this.setOrnament(self.enabled ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
    });
    this.set_property('enabled', enabled);

    this.connect('activate', this._onClick.bind(this, tsState, tsNode));
  }

  /**
   * Menu item click handler switch exit node
   * @param {GObject.Object} tsState
   * @param {TsNode | undefined} tsNode
   * @private
   */
  _onClick(tsState, tsNode) {
    if (this.enabled) {
      Logger.info('Already enabled');
      return;
    }
    Logger.info('Set exit node to', tsNode?.name ?? 'none');
    setExitNode(tsNode?.name).then(() => tsState.refresh(true));
  }
}

var MenuItemConnect = class MenuItemConnect extends PopupMenu.PopupSubMenuMenuItem {
  static [GObject.properties] = {
    expanded: GObject.ParamSpec.boolean('expanded', 'expanded', 'expanded', GObject.ParamFlags.READWRITE, false),
  }

  static { GObject.registerClass(this) }

  /**
   *
   * @param {GObject.Object} tsState
   */
  constructor(tsState) {
    super(_('Disconnected') , true);

    const icons = [
      Gio.icon_new_for_string(Me.path + '/icons/icon-key.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/icon-wifi-off.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/icon-wifi.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/icon-vpn-lock.svg'),
    ];

    // Icon
    this.icon.gicon = icons[0]
    this.icon.set_x_expand(false);

    // Menu item style
    this.style_class += ' ts-menu-item'

    this._tsState = tsState;
    this._tsState.connect('notify::state', self => {
      this.icon.gicon = icons[self.state + 1];
      this.updateMenuAndSubmenu(self);
    });
    this._tsState.connect('notify::exitNode', self => {
      this.updateMenuAndSubmenu(self);
    });

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
   * @param {GObject} tsState
   */
  updateMenuAndSubmenu(tsState) {
    if (this.expanded) {
      return;
    }
    if (tsState.state === -1) {
      return this._applyNeedLoginState();
    } else if (tsState.state === 0) {
      return this._applyDisconnectState();
    } else {
      return this._applyConnectState(tsState);
    }
  }

  /**
   * Manage connection button click handler
   */
  onClickConnectBtn() {
    const state = this._tsState.state;
    const settings = ExtensionUtils.getSettings();
    const operator = settings.get_string(StoreKey.Operator);
    const acceptRoutes = settings.get_string(StoreKey.AcceptRoutes);

    switch (state) {
      case -1:
        login({ operator });
        break;
      case 0:
        networkUp({ operator, acceptRoutes }).then(() => this._tsState.refresh(true));
        break;
      default:
        networkDown().then(() => this._tsState.refresh(true));
    }
  }

  /**
   * Call logout command
   */
  onClickLogout() {
    Logger.info('Logout');
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
   * @param tsState
   * @private
   */
  _applyConnectState(tsState) {
    this._removeNodesSubmenuItems();
    this.label.text = '';

    if (tsState.nodes) {
      this._insertConnectExitNodeMenuItem(new ConnectExitNodePopupMenuItem(tsState));

      for (let i = 0; i < tsState.nodes.length; i++) {
        let node = tsState.nodes[i];
        if (!node.exitSupport) {
          continue;
        }

        let submenuItem = new ConnectExitNodePopupMenuItem(tsState, node);
        let hostname = node.domain?.split(`.${tsState.domain}`)?.[0];
        if (tsState.exitNode === node.id && hostname) {
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