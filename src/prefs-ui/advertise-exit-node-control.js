/**
 * @module prefs-ui/advertise-exit-node-control
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
const { SettingsKey } = Me.imports.libs.utils;

var AdvertiseExitNodeControl = class AdvertiseExitNodeControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  /**
   * @param {Gio.Settings} settings
   * @param {Logger} logger
   */
  constructor(settings, logger) {
    super({
      title: _('Advertise Exit Node'),
      subtitle: _('Offer to be an exit node for internet traffic for the Tailnet.'),
    });

    this._settings = settings;
    this._logger = logger;

    const toggle = new Gtk.Switch();
    toggle.set_visible(true);
    toggle.set_focusable(true);
    toggle.valign = Gtk.Align.CENTER;
    toggle.halign = Gtk.Align.END;

    const box = new Gtk.Box({ spacing: 0 });
    box.append(toggle);

    this.add_suffix(box);
    this.set_activatable_widget(toggle);
    this.set_cursor_from_name('pointer');

    this._settings.bind(SettingsKey.AdvertiseExitNode, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
  }
}