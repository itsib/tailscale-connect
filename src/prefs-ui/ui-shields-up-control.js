const { GObject, Gtk, Adw, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { Logger } = Me.imports.modules.logger;
const { StoreKey } = Me.imports.modules.utils;

var ShieldsUpControl = class ShieldsUpControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  constructor() {
    super({
      title: _('Block incoming connections'),
      subtitle: _('Block incoming connections from other devices on your Tailscale network. Useful for personal devices that only make outgoing connections.'),
    });

    const toggle = new Gtk.Switch();
    toggle.set_visible(true);
    toggle.set_focusable(true);
    toggle.valign = Gtk.Align.CENTER;
    toggle.halign = Gtk.Align.END;

    const box = new Gtk.Box({ spacing: 0 });
    box.append(toggle);

    this.add_suffix(box);
    this.activatable_widget = box;

    const settings = ExtensionUtils.getSettings();

    settings.bind('shields-up', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
  }
}