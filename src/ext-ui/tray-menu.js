/**
 * @module ext-ui/tray-menu
 *
 * @typedef {import(@girs/gnome-shell/src/ui/panelMenu.d.ts)} PanelMenu
 * @typedef {module:libs/storage#Storage} Storage
 * @typedef {module:libs/logger#Logger} Logger
 */

const { GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.utils;

const { BtnSettings } = require('ext-ui/btn-settings');
const { BtnConnect } = require('ext-ui/btn-connect');
const { BtnAcceptRoutes } = require('ext-ui/btn-accept-routes');
const { BtnShieldsUp } = require('ext-ui/btn-shields-up');
const { TrayIcon, TrayIconType } = require('ext-ui/tray-icon');
const { ConnectionState } = require('libs/utils');
const _ = ExtensionUtils.gettext;

/**
 * Main extension menu
 *
 * @typedef {import(@girs/gnome-shell/src/ui/panelMenu.d.ts)} PanelMenu
 * @property {PanelMenu.Button} Button
 *
 * @class
 * @extends PanelMenu.Button
 * @type {TrayMenu}
 * @exports
 */
var TrayMenu = class TrayMenu extends PanelMenu.Button {
  static { GObject.registerClass(this) }

  /**
   * @type {Storage}
   * @private
   */
  _storage;
  /**
   * @type {Logger}
   * @private
   */
  _logger;

  /**
   * @extends {PanelMenu.Button}
   * @param {Logger} logger
   * @param {Storage} storage
   */
  constructor({ logger, storage }) {
    super(0.5, _('Tailscale Main Menu'));

    this._logger = logger;
    this._storage = storage;

    // Subscribe to open/close menu popup
    this.menu.connect('open-state-changed', this._onOpenChange.bind(this));

    // Subscribe storage state change
    this._storage.connect('notify::health', this._onHealthChange.bind(this));
    this._storage.connect('notify::health', this._onChangeState.bind(this));
    this._storage.connect('notify::state', this._onChangeState.bind(this));

    // Tray icon
    this._trayIcon = new TrayIcon();
    this.add_child(this._trayIcon);

    // Menu items
    this.menu.addMenuItem(new BtnConnect(this._logger, this._storage));
    this.menu.addMenuItem(new BtnAcceptRoutes(this._logger, this._storage));
    this.menu.addMenuItem(new BtnShieldsUp(this._logger, this._storage));
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(new BtnSettings());
  }

  destroy() {
    this._trayIcon.destroy();
    this._trayIcon = null;
    this._logger = null;
    this._storage = null;

    super.destroy();
  }

  /**
   * Handle main menu open/close change
   * @param {PopupMenu} menu
   * @param {boolean} open
   * @private
   */
  _onOpenChange(menu, open) {
    if (open) {
      this._logger.debug('Refresh storage state by fire menu open');
      this._storage.refresh(true);
    } else {
      this._logger.debug('Menu close');
    }
  }

  _onHealthChange() {
    const health = this._storage.health.trim();
    if (!health) {
      return;
    }

    this._logger.info(health);
  }

  _onChangeState() {
    if (this._storage.health && this._storage.state > 0) {
      this._trayIcon.setIcon(TrayIconType.Warning);
    } else if (this._storage.state === ConnectionState.NeedLogin) {
      this._trayIcon.setIcon(TrayIconType.Error);
    } else {
      this._trayIcon.setIcon(this._storage.state);
    }
  }
}