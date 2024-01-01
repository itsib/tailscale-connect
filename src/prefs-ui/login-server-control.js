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
const { GObject, Gtk, Adw, Gio, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { require } = Me.imports.libs.require;

const { SettingsKey } = require('libs/utils');
const { TextField } = require('prefs-ui/text-field');

const DEFAULT_URL = 'https://controlplane.tailscale.com';

var LoginServerControl = class LoginServerControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Gio.Settings} settings
   * @param {Logger} logger
   */
  constructor(settings, logger) {
    super({
      title: _('Login-Server Url'),
      subtitle: _('If you are using Headscale for your control server, use your Headscale instance’s URL.'),
    });

    this.logger = logger;
    this._settings = settings;

    this._urlField = new TextField();
    this._urlField.secondary_icon_name = '';
    this._urlField.validatorAdd(this._validator.bind(this));
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

    this._settings.bind(SettingsKey.LoginServer, this._urlField, 'text', Gio.SettingsBindFlags.DEFAULT);

    this._urlField.connect('icon-clicked', this.reset.bind(this));

    this._urlField.connect('leave', this._onLeave.bind(this));

    this._urlField.connect('notify::text', this._onInput.bind(this));
  }

  reset() {
    this._urlField.text = DEFAULT_URL;
  }

  _validator(value) {
    if (!value) {
      return { error: _('Field is required') };
    }
    if (!value.startsWith('http') || !GLib.uri_parse_scheme(value)) {
      return { error: _('Invalid URL value') };
    }
    return null;
  }

  _onLeave() {
    if (!this._urlField.text) {
      this.reset();
    }
  }

  _onInput() {
    if (this._urlField.text && this._urlField.text !== DEFAULT_URL) {
      this._urlField.secondary_icon_name = 'edit-clear-symbolic';
    } else {
      this._urlField.secondary_icon_name = null;
    }
  }
}