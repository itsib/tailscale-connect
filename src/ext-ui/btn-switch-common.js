/**
 * @module ext-ui/btn-switch-common
 *
 */
const { GObject } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;
const { ConnectionState, opacityBindTo } = require('libs/utils');
const { shell } = require('libs/shell');

/**
 * @typedef {import(@girs/gnome-shell/src/ui/popupMenu.d.ts)} PopupMenu
 * @property {PopupMenu.PopupImageMenuItem} PopupImageMenuItem
 * @property {PopupMenu.PopupMenuBase} PopupMenuBase
 *
 * @class
 * @extends PopupMenu.PopupImageMenuItem
 * @extends PopupMenu.PopupMenuBase
 * @type {TSBtnSwitchCommon}
 * @exports
 */
var TSBtnSwitchCommon = class TSBtnSwitchCommon extends PopupMenu.PopupImageMenuItem {
  static [GObject.properties] = {
    isEnabled: GObject.ParamSpec.boolean('isEnabled', 'isEnabled', 'isEnabled', GObject.ParamFlags.READWRITE, false),
  }
  static { GObject.registerClass(this) }

  /**
   * @typedef {Object} Config
   * @property {string} label - Button label
   * @property {string} property - Property to bind in preferences
   * @property {string} flag - Flag for send to shell command (eq. --accept-routes)
   *
   * @param {module:libs/preferences.Preferences} preferences
   * @param {Config} config
   */
  constructor(preferences, config) {
    super(_(config.label), 'emblem-ok-symbolic', { style_class: 'ts-menu-item' });

    this._preferences = preferences;

    this.bind_property_full('isEnabled', this._icon, 'opacity', GObject.BindingFlags.SYNC_CREATE, opacityBindTo, null);
    this.bind_property('isEnabled', this._preferences, config.property, GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);

    this.connect('activate', () => {
      this.sensitive = false;
      const isEnabled = !this._preferences[config.property];

      const commands = [
        'tailscale',
        'set',
        `${config.flag}${isEnabled ? '' : '=false'}`
      ]

      shell(commands)
        .then(() => {
          this._preferences.refresh();
          this.sensitive = true;
        })
        .catch(() => {
          this.sensitive = true;
        });
    })

    this._preferences.connect('notify::state', () => {
      this.sensitive = this._preferences.state !== ConnectionState.NeedLogin;
    });
  }
}