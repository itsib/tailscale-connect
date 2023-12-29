/**
 * @module ext-ui/tray-icon
 */
const { GObject, St, Gio, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const STATUS_COLORS = {
  [-2]: { bg: '#9f2834', bd: '#9f2834' }, // Error
  [-1]: { bg: '#797878', bd: '#232325' }, // Warning
  [0]:  { bg: '#797878', bd: '#232325' }, // Disabled
  [1]:  { bg: '#ffffff', bd: '#232325' }, // Enabled
  [2]:  { bg: '#ffffff', bd: '#0b870f' }, // Connected
};

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
 * @type {TSTrayIcon}
 * @exports
 */
var TSTrayIcon = class TSTrayIcon extends St.BoxLayout {
  static { GObject.registerClass(this) }

  /**
   * @param {Logger} logger
   * @extends St.BoxLayout
   */
  constructor(logger) {
    super({ style_class: 'panel-status-indicators-box tailscale-status-indicators-box' });

    this._logger = logger;

    this._icon = new St.Icon({
      gicon: Gio.icon_new_for_string(Me.path + '/icons/tailscale-tray-icon.svg'),
      style_class: 'system-status-icon tailscale-status-icon',
      x_expand: true,
      y_expand: true,
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });
    this.add_child(this._icon);
    this.setStatus(0);
  }

  destroy() {
    this._icon = null;
  }

  /**
   * Update tray icon by type
   * @param {number} status
   */
  setStatus(status) {
    if (!(status in STATUS_COLORS)) {
      this._logger.error(`Unknown status code ${status}`);
      status = 0;
    }

    const colors = STATUS_COLORS[status];

    this._icon.set_style(`background-color: ${colors.bg}; border-color: ${colors.bd}`)
  }
}