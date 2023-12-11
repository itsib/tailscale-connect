const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { networkUp, networkDown, setExitNode } = Me.imports.modules.shell;
const { Logger } = Me.imports.modules.logger;
const { StoreKey  } = Me.imports.modules.utils;

const _ = ExtensionUtils.gettext;

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
    state: GObject.ParamSpec.int('state', 'state', 'state', GObject.ParamFlags.READWRITE, 0, 2, 0),
    isOpened: GObject.ParamSpec.boolean('isOpened', 'isOpened', 'isOpened', GObject.ParamFlags.READWRITE, false),
  }

  static { GObject.registerClass(this) }

  /**
   *
   * @param {GObject.Object} state
   */
  constructor(state) {
    super(_('Disconnected') , true);

    const icons = [
      Gio.icon_new_for_string(Me.path + '/icons/icon-wifi-off.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/icon-blur-on.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/icon-vpn-lock.svg'),
    ];

    // Icon
    this.icon.gicon = icons[0]
    this.icon.set_x_expand(false);

    // Menu item style
    this.style_class += ' ts-menu-item'

    this._tsState = state;
    this._tsState.connect('notify::state', self => {
      this.set_property('state', self.state);
      this.icon.gicon = icons[self.state];
      this.updateMenuAndSubmenu(self);
    });
    this._tsState.connect('notify::exitNode', self => {
      this.updateMenuAndSubmenu(self);
    });

    //
    this.menu.connect('open-state-changed', this._setIsOpenState.bind(this));

    // Separator
    this._separator = new PopupMenu.PopupSeparatorMenuItem();
    this._separator.set_style('margin-top: 0px important; margin-bottom: 0px important;');
    this.menu.addMenuItem(this._separator);

    // Connect/Disconnect submenu item
    this._connectSwitchBtn = new PopupMenu.PopupMenuItem(_('Connect'), { style_class: 'ts-popup-sub-menu-item ts-connect-btn' });
    this._connectSwitchBtn.connect('activate', this.onClickConnectBtn.bind(this))
    this.menu.addMenuItem(this._connectSwitchBtn);
  }

  /**
   * Rerender label by changed state
   * @param {GObject} tsState
   */
  updateMenuAndSubmenu(tsState) {
    if (this.isOpened) {
      return;
    }
    if (tsState.state === 0) {
      return this._applyDisconnectState();
    } else {
      return this._applyConnectState(tsState);
    }
  }

  /**
   * Manage connection button click handler
   */
  onClickConnectBtn() {
    Logger.info(`Set state. Current:`, this._tsState.state);
    if (this._tsState.state === 0) {
      const operator = ExtensionUtils.getSettings().get_string(StoreKey.Operator);
      networkUp({ operator }).then(() => this._tsState.refresh(true));
    } else {
      networkDown().then(() => this._tsState.refresh(true));
    }
  }

  /**
   * Set open state (Block update nodes list)
   * @param menu
   * @param open
   * @private
   */
  _setIsOpenState(menu, open) {
    this.set_property('isOpened', open);
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
  }

  /**
   * Update labels and submenu
   * @private
   */
  _applyDisconnectState() {
    this._removeNodesSubmenuItems();

    this.label.text = _('Disconnected');
    this._connectSwitchBtn.label.text = _('Connect');
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
          this.label.text = _('Exit Node') + (hostname ? ` - ${hostname}` : '');
        }

        this._insertConnectExitNodeMenuItem(submenuItem);
      }
    }

    if (!this.label.text) {
      this.label.text = _('Connected');
    }

    this._connectSwitchBtn.label.text = _('Disconnect');
  }
}