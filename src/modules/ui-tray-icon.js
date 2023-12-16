const { GObject, St, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { ConnectionState } = Me.imports.modules.utils;

const getIcon = id => {
  switch (id) {
    case 'error':
    case -2:
      return Gio.icon_new_for_string(Me.path + '/icons/tailscale-error.svg');
    case 'warning':
    case -1:
      return Gio.icon_new_for_string(Me.path + '/icons/tailscale-warning.svg');
    case 'disabled':
    case 0:
      return Gio.icon_new_for_string(Me.path + '/icons/tailscale-disable.svg');
    case 'enabled':
    case 1:
      return Gio.icon_new_for_string(Me.path + '/icons/tailscale-enable.svg');
    case 'connected':
    case 2:
      return Gio.icon_new_for_string(Me.path + '/icons/tailscale-connected.svg');
  }
};

var TrayIcon = class TrayIcon extends St.BoxLayout {
  static { GObject.registerClass(this) }

  /**
   *
   * @param {TsState} tsState
   */
  constructor(tsState) {
    super({ style_class: 'panel-status-indicators-box tc-menu-box' });

    this._tsState = tsState;
    this._icon = new St.Icon({ gicon: getIcon(0), style_class: 'system-status-icon' })

    this.add_child(this._icon);

    this._tsState.connect('notify::state', this._onChangeState.bind(this));
    this._tsState.connect('notify::health', this._onChangeState.bind(this));
  }

  _onChangeState(tsState) {
    if (tsState.health && tsState.state > 0) {
      this._icon.gicon = getIcon('warning');
    } else if (tsState.state === ConnectionState.NeedLogin) {
      this._icon.gicon = getIcon('error');
    } else {
      this._icon.gicon = getIcon(tsState.state);
    }
  }
}