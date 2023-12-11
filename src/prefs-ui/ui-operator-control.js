const { GObject, Gtk, Adw } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { Logger } = Me.imports.modules.logger;
const { StoreKey } = Me.imports.modules.utils;

var OperatorControl = class OperatorControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  _settings;

  constructor() {
    super({
      title: _('Operator'),
      subtitle: _('Provide a Unix username other than root to operate tailscaled.'),
    });

    this._settings = ExtensionUtils.getSettings();

    const entry = new Gtk.Entry();
    entry.set_text(this.value);
    entry.connect('changed', () => {
      Logger.info(`🛠  OnChange Operator: ${entry.text}`);
      this.value = entry.text;
    });

    const box = new Gtk.Box({ spacing: 0 });
    box.width_request = 140;
    box.height_request = 20;
    box.margin_top = 16;
    box.margin_bottom = 16;
    box.append(entry);

    this.add_suffix(box);
    this.activatable_widget = box;
  }

  get value() {
    return this._settings.get_string(StoreKey.Operator);
  }

  set value(value) {
    this._settings.set_string(StoreKey.Operator, value);
  }
}