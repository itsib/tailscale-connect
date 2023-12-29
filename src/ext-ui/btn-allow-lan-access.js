/**
 * @module ext-ui/btn-allow-lan-access
 */
const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { opacityBindTo, require, ConnectionState } = Me.imports.libs.utils;

const { setAllowLanAccess } = require('libs/shell')

/**
 * @typedef {import(@girs/gnome-shell/src/ui/popupMenu.d.ts)} PopupMenu
 * @property {PopupMenu.PopupImageMenuItem} PopupImageMenuItem
 * @property {PopupMenu.PopupMenuBase} PopupMenuBase
 *
 * @class
 * @extends PopupMenu.PopupImageMenuItem
 * @extends PopupMenu.PopupMenuBase
 * @type {TSBtnAcceptRoutes}
 * @exports
 */
var TSBtnAllowLanAccess = class TSBtnAllowLanAccess extends PopupMenu.PopupImageMenuItem {
  static [GObject.properties] = {
    allowLanAccess: GObject.ParamSpec.boolean('allowLanAccess', 'allowLanAccess', 'allowLanAccess', GObject.ParamFlags.READWRITE, false),
  }
  static { GObject.registerClass(this) }

  /**
   * @param {Logger} logger
   * @param {Storage} storage
   */
  constructor(logger, storage) {
    super(_('Allow Direct LAN Access'), 'emblem-ok-symbolic', { style_class: ' ts-menu-item' });

    this._logger = logger;
    this._storage = storage;

    this.bind_property_full('allowLanAccess', this._icon, 'opacity', GObject.BindingFlags.SYNC_CREATE, opacityBindTo, null);
    this.bind_property('allowLanAccess', storage, 'allowLanAccess', GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);

    this.connect('activate', () => {
      this.sensitive = false;
      setAllowLanAccess(!storage.allowLanAccess)
        .then(() => {
          storage.refresh();
          this.sensitive = true;
        })
        .catch(() => {
          this.sensitive = true;
        });
    });

    this._storage.connect('notify::state', () => {
      this.sensitive = this._storage.state !== ConnectionState.NeedLogin;
    });
  }
}