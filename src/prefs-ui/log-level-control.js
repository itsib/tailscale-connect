/**
 * @module prefs-ui/log-level-control
 */
const { GObject, Gtk, Adw } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { SettingsKey } = Me.imports.libs.utils;

var LogLevelControl = class LogLevelControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  _settings;

  /**
   *
   * @param {Logger} logger
   */
  constructor(logger) {
    super({
      title: _('Log Level'),
      subtitle: _('Which messages will be displayed in the log.'),
    });

    this._settings = ExtensionUtils.getSettings();
    this._logger = logger;

    const store = new Gtk.ListStore();
    store.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
    store.set(store.append(), [0, 1], ['0', _('Disabled')]);
    store.set(store.append(), [0, 1], ['1', _('Error')]);
    store.set(store.append(), [0, 1], ['2', _('Info')]);
    store.set(store.append(), [0, 1], ['3', _('Debug')]);

    const comboBox = new Gtk.ComboBox({ model: store });
    const renderer = new Gtk.CellRendererText();
    renderer.weight = 400;
    comboBox.pack_start(renderer, false);
    comboBox.add_attribute(renderer, "text", 1);
    comboBox.set_id_column(0);
    comboBox.set_entry_text_column(1);
    comboBox.set_active(this.value);
    comboBox.width_request = 125;

    comboBox.connect('changed', self => {
      const value = self.get_active();
      this._logger.debug(`OnChange LogLevel:`, value.toString(), typeof value);

      this.value = value;
    });

    const box = new Gtk.Box({ spacing: 0 });
    box.width_request = 125;
    box.height_request = 20;
    box.margin_top = 16;
    box.margin_bottom = 16;
    box.append(comboBox);

    this.add_suffix(box);
    this.activatable_widget = box;
  }

  get value() {
    return this._settings.get_int(SettingsKey.LogLevel);
  }

  set value(value) {
    this._settings.set_int(SettingsKey.LogLevel, value);
  }
}