/**
 * @module ext-ui/btn-settings
 */

const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

/**
 * @exports
 */
var BtnSettings = class BtnSettings extends PopupMenu.PopupImageMenuItem {
  static { GObject.registerClass(this) }

  constructor() {
    super(
      _('Settings'),
      Gio.icon_new_for_string(`${Me.path}/icons/icon-gear.svg`),
      { style_class: ' ts-menu-item' }
    );

    this.connect('activate', () => ExtensionUtils.openPrefs());
  }
}