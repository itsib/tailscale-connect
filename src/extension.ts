import GnomeShell from '@girs/gnome-shell';

const GETTEXT_DOMAIN = 'tailscale-connect-extension';

const { GObject, St } = imports.gi;
const ExtensionUtils = GnomeShell.misc.extensionUtils;
const Main = GnomeShell.ui.main;
const PanelMenu = GnomeShell.ui.panelMenu;
const PopupMenu = GnomeShell.ui.popupMenu;

const _ = ExtensionUtils.gettext;

class Indicator extends PanelMenu.Button {
  _init() {
    super._init(0.0, _('My Shiny Indicator'));

    this.add_child(new St.Icon({
      icon_name: 'face-smile-symbolic',
      style_class: 'system-status-icon',
    }));

    let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
    item.connect('activate', () => {
      Main.notify(_('Whatʼs up, folks?'));
    });
    this.menu.addMenuItem(item);
  }
}

GObject.registerClass(Indicator);

class Extension {
  private _uuid: string;
  private _indicator: Indicator;


  constructor(uuid: string) {
    this._uuid = uuid;

    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    this._indicator = new Indicator(0, GETTEXT_DOMAIN);
    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}