/**
 * @module ext-ui/btn-accept-routes
 */
const { GObject, Gio } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require, SettingsKey } = Me.imports.libs.utils;

const { setAcceptRoutes } = require('libs/shell');

const getIcon = id => {
  switch (id) {
    case 'on':
      return Gio.icon_new_for_string(`${Me.path}/icons/check.svg`);
    case 'off':
      return Gio.icon_new_for_string(`${Me.path}/icons/minus.svg`);
  }
};

/**
 * @exports
 * @type {BtnAcceptRoutes}
 */
var BtnAcceptRoutes = class BtnAcceptRoutes extends PopupMenu.PopupImageMenuItem {
  static [GObject.properties] = {
    switchIsOn: GObject.ParamSpec.boolean('switchIsOn', 'switchIsOn', 'switchIsOn', GObject.ParamFlags.READWRITE, true),
  }
  static { GObject.registerClass(this) }

  /**
   * @param {Logger} logger
   * @param {Storage} storage
   */
  constructor(logger, storage) {
    const settings = ExtensionUtils.getSettings();
    const enabled = settings.get_boolean(SettingsKey.AcceptRoutes);

    super(_('Accept Routes'), getIcon(enabled ? 'on' : 'off'), { style_class: 'ts-menu-item' });

    this._blockHandler = false;
    this._logger = logger;
    this._storage = storage;
    this._settings = settings;
    this._subscriptionId = this._settings.connect(`changed::${SettingsKey.AcceptRoutes}`, this._onChangeSettings.bind(this));

    this.connect('activate', this._handleClick.bind(this));

    this._storage.connect('notify::health', this._handleHealth.bind(this));

    this._storage.connect('notify::state', this._onStateChange.bind(this));

    this.set_property('switchIsOn', enabled);
    this.sensitive = this._storage.state > 0;
  }

  /**
   *
   * @param {Storage} self
   * @private
   */
  _handleHealth(self) {
    this._logger.info(self.health || 'Healthy');
  }

  /**
   *
   * @param {Storage} self
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
    this._logger.info('Handle click');
    this._settings.set_boolean(SettingsKey.AcceptRoutes, !this.switchIsOn);
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
    const newValue = self.get_boolean(SettingsKey.AcceptRoutes);
    this._logger.info('On change settings accept routes', newValue);

    this.set_property('switchIsOn', newValue);
    this.setIcon(getIcon(newValue ? 'on' : 'off'));

    // If connected we send command
    if (this._storage.state > 0) {
      setAcceptRoutes(newValue)
        .then(() => {
          this._setValueSilent(newValue);
          this._blockHandler = false;
        })
        .catch(error => {
          this._logger.info(`Accept Routes Command Error: ${error}`);

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

    this._settings.set_boolean(SettingsKey.AcceptRoutes, value);

    this._settings.unblock_signal_handler(this._subscriptionId);
  }
}