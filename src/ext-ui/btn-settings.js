/**
 * @module ext-ui/btn-settings
 */

const { GObject } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

/**
 * @class
 * @exports
 */
var TSBtnSettings = class TSBtnSettings extends PopupMenu.PopupImageMenuItem {
  static { GObject.registerClass(this) }

  constructor() {
    super(_('Settings'), 'preferences-system-symbolic', { style_class: ' ts-menu-item' });

    this.connect('activate', this._onClick.bind(this));
  }

  _onClick() {
    try {
      const res = ExtensionUtils.openPrefs();
      if (res instanceof Promise) {
        res.catch(error => {
          logError(error, 'Open prefs');
        });
      }
    } catch (error) {
      logError(error, 'Open prefs');
    }
  }
}