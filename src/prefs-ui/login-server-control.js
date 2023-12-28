/**
 * @module prefs-ui/login-server-control
 *
 * @typedef {import(@girs/adw-1)} Adw
 *
 * @typedef {import(@girs/gio-2.0)} Gio
 *
 * @typedef {import(libs/logger)} Logger
 *
 * @typedef {imports(node_modules/@girs/gnome-shell/src/misc/extensionUtils.d.ts)} ExtensionUtils
 * @method ExtensionUtils#getSettings
 * @return Gio.Settings
 */
const { GObject, Gtk, Adw, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { SettingsKey, require } = Me.imports.libs.utils;

const { TextField } = require('prefs-ui/text-field')
const { validatorRequired, validatorUrl } = require('libs/validators')

var LoginServerControl = class LoginServerControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Logger} logger
   */
  constructor(logger) {
    super({
      title: _('Login-Server Url'),
      subtitle: _('If you are using Headscale for your control server, use your Headscale instance’s URL.'),
    });

    this.logger = logger;
    this._settings = ExtensionUtils.getSettings();

    this._urlField = new TextField();
    this._urlField.validatorAdd(validatorRequired, validatorUrl);
    this._urlField.input_purpose = Gtk.InputPurpose.URL;
    this._urlField.width_chars = 30;

    const box = new Gtk.Box({ spacing: 0 });
    box.set_vexpand(true);
    box.set_vexpand_set(true);
    box.height_request = 20;
    box.margin_top = 16;
    box.margin_bottom = 16;
    box.append(this._urlField);

    this.add_suffix(box);
    this.set_activatable_widget(this._urlField);
    this.set_focus_child(this._urlField);

    this._settings.bind(SettingsKey.LoginServer, this._urlField, 'text', Gio.SettingsBindFlags.DEFAULT);
  }
}