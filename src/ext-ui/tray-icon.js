/**
 * @module ext-ui/tray-icon
 */

const { GObject, St, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * @exports
 * @type {{Warning: number, Connected: number, Error: number, Enabled: number, Disabled: number}}
 */
var TrayIconType = {
  Error: -2,
  Warning: -1,
  Disabled: 0,
  Enabled: 1,
  Connected: 2,
}

/**
 * Tray icon ui element
 * @class
 * @extends St.BoxLayout
 * @type {TrayIcon}
 * @exports
 */
var TrayIcon = class TrayIcon extends St.BoxLayout {
  static { GObject.registerClass(this) }

  /**
   *
   * @extends St.BoxLayout
   */
  constructor() {
    super({ style_class: 'panel-status-indicators-box tc-menu-box' });

    this._gicons = {
      [TrayIconType.Error]: Gio.icon_new_for_string(Me.path + '/icons/tailscale-error.svg'),
      [TrayIconType.Warning]: Gio.icon_new_for_string(Me.path + '/icons/tailscale-warning.svg'),
      [TrayIconType.Disabled]: Gio.icon_new_for_string(Me.path + '/icons/tailscale-disable.svg'),
      [TrayIconType.Enabled]: Gio.icon_new_for_string(Me.path + '/icons/tailscale-enable.svg'),
      [TrayIconType.Connected]: Gio.icon_new_for_string(Me.path + '/icons/tailscale-connected.svg'),
    }

    this._icon = new St.Icon({
      gicon: this._gicons[TrayIconType.Disabled],
      style_class: 'system-status-icon'
    });

    this.add_child(this._icon);
  }

  destroy() {
    this._gicons = null;
    this._icon = null;
  }

  /**
   * Update tray icon by type
   * @param {TrayIconType} type
   */
  setIcon(type) {
    this._icon.gicon = this._gicons[type];
  }
}