const { GObject, Gtk, Adw, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { Logger } = Me.imports.modules.logger;
const { StoreKey } = Me.imports.modules.utils;

var RefreshIntervalControl = class RefreshIntervalControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  constructor() {
    super({
      title: _('Refresh Interval'),
      subtitle: _('Refresh interval of tailscale connection status in seconds.'),
    });

    const settings = ExtensionUtils.getSettings();

    const spinButton = new Gtk.SpinButton({
      value: settings.get_int(StoreKey.RefreshInterval),
      valign: Gtk.Align.CENTER,
    });

    spinButton.width_chars = 6;
    spinButton.set_sensitive(true);
    spinButton.set_range(5, 3600);
    spinButton.set_increments(1, 2);

    settings.bind(StoreKey.RefreshInterval, spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    this.add_suffix(spinButton);
  }
}