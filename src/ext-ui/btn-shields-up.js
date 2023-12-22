/**
 * @module ext-ui/btn-shields-up
 */

const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { SettingsKey } = Me.imports.libs.utils;

/**
 * @exports
 */
var BtnShieldsUp = class BtnShieldsUp extends PopupMenu.PopupImageMenuItem {
  static [GObject.properties] = {
    enabled: GObject.ParamSpec.boolean('enabled', 'enabled', 'enabled', GObject.ParamFlags.READWRITE, false),
  }
  static { GObject.registerClass(this) }

  /**
   * @param {Logger} logger
   * @param {Storage} storage
   */
  constructor(logger, storage) {
    const settings = ExtensionUtils.getSettings();
    const enabled = settings.get_boolean('shields-up');
    const icon = [
      Gio.icon_new_for_string(`${Me.path}/icons/minus.svg`),
      Gio.icon_new_for_string(`${Me.path}/icons/check.svg`),
    ];

    super(_('Block Incoming'), icon[+enabled], { style_class: ' ts-menu-item' });

    this._logger = logger;
    this._storage = storage;
    this._settings = settings;

    this.connect('notify::enabled', () => {
      this.setIcon(icon[+this.enabled]);
    })

    this.connect('activate', () => {
      const enabled = !this.enabled;
      this.set_property('enabled', enabled);
      this._settings.set_boolean('shields-up', enabled);

      this._logger.info('Shields-up', enabled);
    });

    this.set_property('enabled', enabled);
  }
}