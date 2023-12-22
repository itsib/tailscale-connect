/**
 * @module prefs-ui/login-server-control
 */

const { GObject, Gtk, Adw } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { SettingsKey } = Me.imports.libs.utils;

var LoginServerControl = class LoginServerControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  _settings;

  /**
   *
   * @param {Logger} logger
   */
  constructor(logger) {
    super({
      title: _('Login-Server Url'),
      subtitle: _('If you are using Headscale for your control server, use your Headscale instance’s URL.'),
    });

    this._settings = ExtensionUtils.getSettings();
    this.logger = logger;

    const entry = new Gtk.Entry();
    entry.set_text(this.value);
    entry.connect('changed', () => {
      this.logger.info('🛠  OnChange loginServer:', entry.text);
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
    return this._settings.get_string(SettingsKey.LoginServer);
  }

  set value(value) {
    this._settings.set_string(SettingsKey.LoginServer, value);
  }
}