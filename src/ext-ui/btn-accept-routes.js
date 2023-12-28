/**
 * @module ext-ui/btn-accept-routes
 *
 */
const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { opacityBindTo, require } = Me.imports.libs.utils;
const { setAcceptRoutes } = require('libs/shell');

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
var TSBtnAcceptRoutes = class TSBtnAcceptRoutes extends PopupMenu.PopupImageMenuItem {
  static [GObject.properties] = {
    acceptRoutes: GObject.ParamSpec.boolean('acceptRoutes', 'acceptRoutes', 'acceptRoutes', GObject.ParamFlags.READWRITE, true),
  }
  static { GObject.registerClass(this) }

  /**
   * @param {Logger} logger
   * @param {Storage} storage
   */
  constructor(logger, storage) {
    super(_('Accept Routes'), 'emblem-ok-symbolic', { style_class: 'ts-menu-item' });

    this._logger = logger;
    this._storage = storage;

    this.bind_property_full('acceptRoutes', this._icon, 'opacity', GObject.BindingFlags.SYNC_CREATE, opacityBindTo, null);
    this.bind_property('acceptRoutes', storage, 'acceptRoutes', GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);

    this.connect('activate', () => {
      this.sensitive = false;
      setAcceptRoutes(!storage.acceptRoutes)
        .then(() => {
          storage.refresh();
          this.sensitive = true;
        })
        .catch(() => {
          this.sensitive = true;
        });
    })

  }
}