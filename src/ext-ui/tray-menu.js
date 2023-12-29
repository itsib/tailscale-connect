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

const { TSBtnSettings } = require('ext-ui/btn-settings');
const { TSBtnConnect } = require('ext-ui/btn-connect');
const { TSBtnAcceptRoutes } = require('ext-ui/btn-accept-routes');
const { TSBtnShieldsUp } = require('ext-ui/btn-shields-up');
const { TSBtnAllowLanAccess } = require('ext-ui/btn-allow-lan-access');
const { TSTrayIcon, TrayIconType } = require('ext-ui/tray-icon');
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
 * @type {TSTrayMenu}
 * @exports
 */
var TSTrayMenu = class TSTrayMenu extends PanelMenu.Button {
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
    this._storage.connect('notify::health', this._onChangeState.bind(this));
    this._storage.connect('notify::state', this._onChangeState.bind(this));

    // Tray icon
    this._trayIcon = new TSTrayIcon(this._logger);
    this.add_child(this._trayIcon);

    // Menu items
    this.menu.addMenuItem(new TSBtnConnect(this._logger, this._storage));
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(new TSBtnAcceptRoutes(this._logger, this._storage));
    this.menu.addMenuItem(new TSBtnShieldsUp(this._logger, this._storage));
    this.menu.addMenuItem(new TSBtnAllowLanAccess(this._logger, this._storage));
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(new TSBtnSettings());
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

  _onChangeState() {
    if (this._storage.health && this._storage.state > 0) {
      this._trayIcon.setStatus(TrayIconType.Warning);
    } else if (this._storage.state === ConnectionState.NeedLogin) {
      this._trayIcon.setStatus(TrayIconType.Error);
    } else {
      this._trayIcon.setStatus(this._storage.state);
    }
  }
}