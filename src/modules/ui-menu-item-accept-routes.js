const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { setAcceptRoutes } = Me.imports.modules.shell;
const { Logger } = Me.imports.modules.logger;
const { StoreKey  } = Me.imports.modules.utils;

const getIcon = id => {
  switch (id) {
    case 'on':
      return Gio.icon_new_for_string(`${Me.path}/icons/check.svg`);
    case 'off':
      return Gio.icon_new_for_string(`${Me.path}/icons/minus.svg`);
  }
};

var MenuItemAcceptRoutes = class MenuItemAcceptRoutes extends PopupMenu.PopupImageMenuItem {
  static [GObject.properties] = {
    switchIsOn: GObject.ParamSpec.boolean('switchIsOn', 'switchIsOn', 'switchIsOn', GObject.ParamFlags.READWRITE, true),
  }
  static { GObject.registerClass(this) }

  /**
   *
   * @param {TsState} tsState
   */
  constructor(tsState) {
    const settings = ExtensionUtils.getSettings();
    const enabled = settings.get_boolean(StoreKey.AcceptRoutes);

    super(_('Accept Routes'), getIcon(enabled ? 'on' : 'off'), { style_class: 'ts-menu-item' });

    this._blockHandler = false;
    this._tsState = tsState;
    this._settings = settings;
    this._subscriptionId = this._settings.connect(`changed::${StoreKey.AcceptRoutes}`, this._onChangeSettings.bind(this));

    this.connect('activate', this._handleClick.bind(this));

    this._tsState.connect('notify::health', this._handleHealth.bind(this));

    this._tsState.connect('notify::state', this._onStateChange.bind(this));

    this.set_property('switchIsOn', enabled);
    this.sensitive = this._tsState.state > 0;
  }

  /**
   *
   * @param {TsState} self
   * @private
   */
  _handleHealth(self) {
    Logger.info(self.health || 'Healthy');
  }

  /**
   *
   * @param {TsState} self
   * @private
   */
  _onStateChange(self) {
    this.sensitive = self.state > 0;
  }

  /**
   * Click on menu toggles switch
   * @private
   */
  _handleClick() {
    if (this._blockHandler) {
      return;
    }
    Logger.info('Handle click');
    this._settings.set_boolean(StoreKey.AcceptRoutes, !this.switchIsOn);
  }

  /**
   * Handle the Accept Routes state from settings, and send command into tailscale
   * @private
   * @param self
   */
  _onChangeSettings(self) {
    if (this._blockHandler) {
      return;
    }
    this._blockHandler = true;
    const prevValue = this.switchIsOn;
    const newValue = self.get_boolean(StoreKey.AcceptRoutes);
    Logger.info('On change settings accept routes', newValue);

    this.set_property('switchIsOn', newValue);
    this.setIcon(getIcon(newValue ? 'on' : 'off'));

    // If connected we send command
    if (this._tsState.state > 0) {
      setAcceptRoutes(newValue)
        .then(() => {
          this._setValueSilent(newValue);
          this._blockHandler = false;
        })
        .catch(error => {
          Logger.info(`Accept Routes Command Error: ${error}`);

          this._setValueSilent(prevValue);

          this._blockHandler = false;
        });
    } else {
      this._blockHandler = false;
    }
  }

  /**
   * Update value without fire event
   * @private
   * @param value
   */
  _setValueSilent(value) {
    this.set_property('switchIsOn', value);
    this.setIcon(getIcon(value ? 'on' : 'off'));

    this._settings.block_signal_handler(this._subscriptionId);

    this._settings.set_boolean(StoreKey.AcceptRoutes, value);

    this._settings.unblock_signal_handler(this._subscriptionId);
  }
}