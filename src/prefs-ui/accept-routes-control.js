/**
 * @module prefs-ui/accept-routes-control
 */

const { GObject, Gtk, Adw, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { SettingsKey } = Me.imports.libs.utils;

var AcceptRoutesControl = class AcceptRoutesControl extends Adw.ActionRow {
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Logger} logger
   */
  constructor(logger) {
    super({
      title: _('Accept Routes '),
      subtitle: _('Accept subnet routes that other nodes advertise. Linux devices default to not accepting routes.'),
    });

    this._logger = logger;

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

    settings.bind('accept-routes', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
  }
}