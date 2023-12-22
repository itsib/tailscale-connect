/**
 * @module ext-ui/btn-settings
 */

const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

/**
 * @class
 * @exports
 */
var BtnSettings = class BtnSettings extends PopupMenu.PopupImageMenuItem {
  static { GObject.registerClass(this) }

  constructor() {
    super(_('Settings'), 'preferences-system-symbolic', { style_class: ' ts-menu-item' });

    this.connect('activate', () => ExtensionUtils.openPrefs());
  }
}