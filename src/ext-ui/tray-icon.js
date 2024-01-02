/**
 * @module ext-ui/tray-icon
 */
const { GObject, St, Gio, Clutter/*, cairo, PangoCairo*/ } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const STATUS_COLORS = {
  [-2]: { bg: '#9f2834', bd: '#9f2834' }, // Error
  [-1]: { bg: '#797878', bd: '#cd9309' }, // Warning
  [0]:  { bg: '#797878', bd: '#232325' }, // Disabled
  [1]:  { bg: '#ffffff', bd: '#232325' }, // Enabled
  [2]:  { bg: '#ffffff', bd: '#0b870f' }, // Connected
};

const DEFAULT_BIND_FLAGS = GObject.BindingFlags.DEFAULT|GObject.BindingFlags.SYNC_CREATE;
const TWO_WAY_BIND_FLAGS = GObject.BindingFlags.BIDIRECTIONAL|GObject.BindingFlags.SYNC_CREATE;

/**
 * Tray icon ui element
 * @class
 * @extends St.BoxLayout
 * @type {TSTrayIcon}
 * @exports
 */
var TSTrayIcon = class TSTrayIcon extends St.BoxLayout {
  static [GObject.properties] = {
    enabled: GObject.ParamSpec.boolean('enabled', 'enabled', 'enabled', GObject.ParamFlags.READWRITE, false),
    level: GObject.ParamSpec.int('level', 'level', 'level', GObject.ParamFlags.READWRITE, -2, 1, 0),
  }
  static { GObject.registerClass(this) }

  /**
   * @param {Preferences} preferences
   */
  constructor(preferences) {
    super({ style_class: 'panel-status-indicators-box tailscale-status-indicators-box' });

    this._icon = new St.Icon({
      gicon: Gio.icon_new_for_string(Me.path + '/icons/tailscale-tray-icon.svg'),
      style_class: 'system-status-icon tailscale-status-icon',
      x_expand: true,
      y_expand: true,
    });
    this._box = new St.BoxLayout({
      style_class: 'tailscale-status-icon-bg',
      height: 16,
      width: 16,
      x_expand: false,
      y_expand: false,
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });
    this._box.add_child(this._icon)

    this.add_child(this._box);

    this._preferences = preferences;
    this._preferences.connect('notify::exitNode', this._onPreferencesChange.bind(this));
    this._preferences.connect('notify::loggedIn', this._onPreferencesChange.bind(this));
    this._preferences.connect('notify::health', this._onPreferencesChange.bind(this));


    this.bind_property_full('enabled', this._icon, 'style', DEFAULT_BIND_FLAGS, bindBgColor, null);
    this.bind_property_full('level', this._box, 'style', DEFAULT_BIND_FLAGS, bindBorderColor, null);

    this.bind_property('enabled', this._preferences, 'enabled', TWO_WAY_BIND_FLAGS);
  }

  _onPreferencesChange() {
    if (!this._preferences.loggedIn) {
      this.level = -2;
    } else if (this._preferences.getHealth()) {
      this.level = -1;
    } else if (this._preferences.exitNode) {
      this.level = 1;
    } else {
      this.level = 0;
    }
  }
}

function bindBgColor(bind, source) {
  return [true, `background-color: ${source ? '#ffffff' : '#797878'}`];
}

function bindBorderColor(bind, source) {
  let color = '#232325';
  switch (source) {
    case -2:
      color = '#9f2834';
      break;
    case -1:
      color = '#cd9309';
      break;
    case 0:
      color = '#232325';
      break;
    case 1:
      color = '#0b870f';
      break;
  }
  return [true, `border-color: ${color}`];
}