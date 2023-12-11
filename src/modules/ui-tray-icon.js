const { GObject, St, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var TrayIcon = class TrayIcon extends St.BoxLayout {
  static { GObject.registerClass(this) }

  /** @type {Gio.Icon[]} */
  _icons;

  /**
   *
   * @param {GObject.Object} state
   */
  constructor(state) {
    super({ style_class: 'panel-status-indicators-box tc-menu-box' });

    this._icons = [
      Gio.icon_new_for_string(Me.path + '/icons/tailscale-disable.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tailscale-enable.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tailscale-connected.svg'),
    ];

    const icon = new St.Icon({ gicon: this._icons[0], style_class: 'system-status-icon' })

    this.add_child(icon);

    state.connect('notify::state', self => {
      icon.gicon = this._icons[self.state];
    });
  }

  destroy() {
    super.destroy();
    this._icons.forEach(icon => icon.destroy())
  }
}