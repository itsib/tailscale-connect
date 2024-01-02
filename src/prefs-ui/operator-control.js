/**
 * @module prefs-ui/operator-control
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
const { require } = Me.imports.libs.require;
const { TextField } = require('prefs-ui/text-field');

var OperatorControl = class OperatorControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Gio.Settings} settings
   * @param {Logger} logger
   */
  constructor(settings, logger) {
    super({
      title: _('Operator'),
      subtitle: _('Provide a Unix username other than root to operate tailscaled.'),
    });

    this._logger = logger;
    this._settings = settings;

    this._urlField = new TextField();
    this._urlField.input_purpose = Gtk.InputPurpose.NAME;
    this._urlField.width_chars = 16;

    const box = new Gtk.Box({ spacing: 0 });
    box.height_request = 20;
    box.margin_top = 16;
    box.margin_bottom = 16;
    box.append(this._urlField);

    this.add_suffix(box);
    this.set_activatable_widget(this._urlField);

    this._settings.bind('operator', this._urlField, 'text', Gio.SettingsBindFlags.DEFAULT);
  }
}