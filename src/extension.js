const { GObject, St, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtensionUtils.getCurrentExtension();
const Modules = Me.imports.modules;
const MenuAlignment = Modules.utils.MenuAlignment;

const _ = ExtensionUtils.gettext;

/** @type {Logger} */
let Logger;
/** @type {Tailscale} */
let Tailscale;

// Extend tray icon to change state
let IconInstance;
class TTrayIcon extends St.Icon {

  _states;

  constructor() {
    const enabled = Gio.icon_new_for_string(Me.path + '/icons/icon-enable.svg');
    const disabled = Gio.icon_new_for_string(Me.path + '/icons/icon-disable.svg');
    const connected = Gio.icon_new_for_string(Me.path + '/icons/icon-connected.svg');

    super({ gicon: disabled, style_class: 'system-status-icon' });

    this._states = { enabled, disabled, connected };
  }

  setState(state) {
    this.gicon = this._states[state];
  }

  destroy() {
    super.destroy();
    this._states.enabled = null;
    this._states.disabled = null;
    this._states.connected = null;
  }
}
const TrayIcon = GObject.registerClass(TTrayIcon);

// Dropdown menu integrated in tray icon.
class TTailscaleTrayButton extends PanelMenu.Button {

  constructor() {
    super(MenuAlignment.Center, _('Tailscale Connect Menu'));

    this.style_class += ' tailscale-tray-button'
  }

  _init() {
    super._init(MenuAlignment.Center, _('Tailscale Icon Button'));

    IconInstance = new TrayIcon();
    this.add_child(IconInstance);

    this.menu.setSensitive(false);

    // Subscribe icon to change state
    Tailscale.on('change-state', state => IconInstance.setState(state));

    this.menu.connect('active-changed', (menu, menuItem) => {
      Logger.warn('active-changed');
    });

    this.menu.connect('activate', (menu, menuItem) => {
      Logger.warn('activate');
    });

    // Subscribe to open/close menu popup
    this.menu.connect('open-state-changed', (menu, open) => {
      if (open) {
        Tailscale.refresh();
      }
    });

    // Main menu switch
    const statusSwitchItem = new PopupMenu.PopupSwitchMenuItem('Tailscale', false);
    statusSwitchItem.connect('toggled', (menuItem, state) => {
      Tailscale.active = state;
    })

    let item0 = new PopupMenu.PopupMenuItem(_('Enable'));
    item0.connect('activate', () => {
      // IconInstance.setState('enabled');
    });


    let item1 = new PopupMenu.PopupMenuItem(_('Disable'));
    item1.connect('activate', () => {
      // IconInstance.setState('disabled');
    });


    let item2 = new PopupMenu.PopupMenuItem(_('Connected'));
    item2.connect('activate', () => {
      // IconInstance.setState('connected');
    });


    this.menu.addMenuItem(statusSwitchItem);
    this.menu.addMenuItem(item0);
    this.menu.addMenuItem(item1);
    this.menu.addMenuItem(item2);
  }

  destroy() {
    super.destroy();
    IconInstance = null;
  }
}
const TailscaleTrayButton = GObject.registerClass(TTailscaleTrayButton);

class TailscaleConnectExtension {
  _indicator = null;

  constructor(uuid) {
    this._uuid = uuid;
  }

  enable() {
    Logger =  new Modules.logger.Logger(Me.metadata['gettext-domain']);
    Tailscale = new Modules.tailscale.Tailscale(Gio, Logger);

    this._indicator = new TailscaleTrayButton();

    Main.panel.addToStatusArea(this._uuid, this._indicator, 0, 'right');

    Logger.info('Enabled');
  }

  disable() {
    Logger.warn('Disabled');

    this._indicator.destroy();
    this._indicator = null;

    Logger = null;
    Tailscale = null;
  }
}

/**
 * Extension initialization
 * @param meta {ExtensionMetadata}
 * @returns {TailscaleConnectExtension}
 */
function init(meta) {
  ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
  return new TailscaleConnectExtension(meta.uuid);
}


