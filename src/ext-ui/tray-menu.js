/**
 * @module ext-ui/tray-menu
 *
 * @typedef {import(@girs/gnome-shell/src/ui/panelMenu.d.ts)} PanelMenu
 * @typedef {module:libs/preferences#Preferences} Preferences
 * @typedef {module:libs/logger#Logger} Logger
 */

const { GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;

const { TSBtnSettings } = require('ext-ui/btn-settings');
const { TSBtnConnect } = require('ext-ui/btn-connect');
const { TSBtnSwitchCommon } = require('ext-ui/btn-switch-common');
const { TSTrayIcon } = require('ext-ui/tray-icon');
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
   * @type {Preferences}
   * @private
   */
  _preferences;
  /**
   * @type {Logger}
   * @private
   */
  _logger;

  /**
   * @extends {PanelMenu.Button}
   * @param {Logger} logger
   * @param {Preferences} preferences
   */
  constructor({ logger, preferences }) {
    super(0.5, _('Tailscale Main Menu'));

    this._logger = logger;
    this._preferences = preferences;

    // Subscribe to open/close menu popup
    this.menu.connect('open-state-changed', this._onOpenChange.bind(this));

    // Tray icon
    this._trayIcon = new TSTrayIcon(this._preferences);
    this.add_child(this._trayIcon);

    // Menu items
    this.menu.addMenuItem(new TSBtnConnect(this._logger, this._preferences));
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(new TSBtnSwitchCommon(this._preferences, {
      label: 'Accept Routes',
      property: 'acceptRoutes',
      flag: '--accept-routes'
    }));
    this.menu.addMenuItem(new TSBtnSwitchCommon(this._preferences, {
      label: 'Shields Up',
      property: 'shieldsUp',
      flag: '--shields-up'
    }));
    this.menu.addMenuItem(new TSBtnSwitchCommon(this._preferences, {
      label: 'Direct LAN Access',
      property: 'allowLanAccess',
      flag: '--exit-node-allow-lan-access'
    }));
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(new TSBtnSettings());
  }

  destroy() {
    this._logger = null;
    this._preferences = null;

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
      this._preferences.refresh(true);
    } else {
      this._logger.debug('Menu close');
    }
  }
}