const { GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = ExtensionUtils.getCurrentExtension();

const { Logger } = Me.imports.modules.logger;
const { TrayIcon } = Me.imports.modules['ui-tray-icon'];
const { MenuItemSettings } = Me.imports.modules['ui-menu-item-settings'];
const { MenuItemConnect } = Me.imports.modules['ui-menu-item-connect'];
const { MenuItemAcceptRoutes } = Me.imports.modules['ui-menu-item-accept-routes'];
const { MenuItemShieldsUp } = Me.imports.modules['ui-menu-item-shields-up'];
const { getState, destroyState } = Me.imports.modules['ts-state'];

const _ = ExtensionUtils.gettext;

// Dropdown menu integrated in tray icon.
class AppMenuButtonWidget extends PanelMenu.Button {
  static { GObject.registerClass(this) }

  _init() {
    super._init(0.5, _('Tailscale Main Menu'));

    const tsState = getState();

    // Subscribe to open/close menu popup
    this.menu.connect('open-state-changed', (menu, open) => {
      if (open) {
        tsState.refresh(true);
      }
      Logger.info(open ? `Menu open` : 'Menu close');
    });

    // Tray icon
    this.add_child(new TrayIcon(tsState));

    // Menu items
    this.menu.addMenuItem(new MenuItemConnect(tsState));
    this.menu.addMenuItem(new MenuItemAcceptRoutes(tsState));
    this.menu.addMenuItem(new MenuItemShieldsUp(tsState));
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(new MenuItemSettings());
  }

  destroy() {
    destroyState();
    super.destroy();
  }
}

// Extension connector
class TailscaleConnectExtension {
  _indicator = null;

  constructor(uuid) {
    this._uuid = uuid;
  }

  enable() {
    Logger.info('🟢 Extension enabled');

    this._indicator = new AppMenuButtonWidget();

    Main.panel.addToStatusArea(this._uuid, this._indicator, 0, 'right');
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;

    Logger.info('🔴 Extension disabled');
  }
}

/**
 * Extension initialization
 * @param meta {ExtensionMetadata}
 * @returns {TailscaleConnectExtension}
 */
function init(meta) {
  // let theme = Gtk.IconTheme.get_default();
  // theme.append_search_path(Me.path + "/icons");

  ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
  return new TailscaleConnectExtension(meta.uuid);
}


