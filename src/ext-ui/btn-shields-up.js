/**
 * @module ext-ui/btn-shields-up
 */
const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { opacityBindTo, require } = Me.imports.libs.utils;

const { setShieldsUp } = require('libs/shell')

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
var TSBtnShieldsUp = class TSBtnShieldsUp extends PopupMenu.PopupImageMenuItem {
  static [GObject.properties] = {
    shieldsUp: GObject.ParamSpec.boolean('shieldsUp', 'shieldsUp', 'shieldsUp', GObject.ParamFlags.READWRITE, false),
  }
  static { GObject.registerClass(this) }

  /**
   * @param {Logger} logger
   * @param {Storage} storage
   */
  constructor(logger, storage) {
    super(_('Block Incoming'), 'emblem-ok-symbolic', { style_class: ' ts-menu-item' });

    this._logger = logger;
    this._storage = storage;

    this.bind_property_full('shieldsUp', this._icon, 'opacity', GObject.BindingFlags.SYNC_CREATE, opacityBindTo, null);
    this.bind_property('shieldsUp', storage, 'shieldsUp', GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);

    this.connect('activate', () => {
      this.sensitive = false;
      setShieldsUp(!storage.shieldsUp)
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