/**
 * Types definition
 * @typedef ExtensionMetadata
 * @type {object}
 * @property {string} uuid
 * @property {?string} name
 * @property {?string} description
 * @property {string} version - This field is the submission version of an extension, incremented and controlled by the GNOME Extensions website.
 * @property {?string} url
 * @property {?string[]} shell-version
 * @property {string} settings-schema
 * @property {string} gettext-domain
 * @property {?string} donations
 *
 *
 * @typedef Extension
 * @type {object}
 * @property {string} uuid
 * @property {number} type
 * @property {number} state
 * @property {string} path
 * @property {string} error
 * @property {boolean} hasPrefs
 * @property {boolean} hasUpdate
 * @property {Array<'user' | 'system' | string>} sessionModes
 * @property {ExtensionMetadata} metadata
 *
 */
const { Gio  } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;

const { TSTrayMenu } = require('ext-ui/tray-menu');
const { Notifications } = require('ext-ui/notifications');
const { Logger, Level } = require('libs/logger');
const { Preferences } = require('libs/preferences');
// const { DataProviderShell: DataProvider } = require('libs/data-provider-shell');
const { DataProviderSock: DataProvider } = require('libs/data-provider-sock');

class TsConnectExtension {
  /**
   * Logger instance
   * @type {Logger | null}
   * @private
   */
  _logger = null;
  /**
   * Tailscale preferences
   * @type {Preferences | null}
   * @private
   */
  _preferences = null;
  /**
   *
   * @type {null}
   * @private
   */
  _logLevelSub = null;
  /**
   * Settings instance
   * @type {Gio.Settings}
   * @private
   */
  _settings = null;
  /**
   * Tray menu button instance
   * @type {TSTrayMenu|null}
   * @private
   */
  _menu = null;

  /**
   *
   * @param metadata {ExtensionMetadata}
   */
  constructor(metadata) {
    this._uuid = metadata.uuid;
    this._domain = metadata['gettext-domain'] ?? 'ts-connect';
  }

  enable() {
    this._logger = new Logger(this._domain);

    const dataProvider = new DataProvider();
    this._preferences = new Preferences(dataProvider);

    this._notifications = new Notifications(this._logger);
    this._menu = new TSTrayMenu({ logger: this._logger, preferences: this._preferences });
    this._settings = ExtensionUtils.getSettings();

    this._logLevelSub = this._settings.connect(`changed::log-level`, this._onLogLevelChange.bind(this));
    this._onLogLevelChange();

    Main.panel.addToStatusArea(this._uuid, this._menu, 0.5, 'right');

    this._preferences.connect('notify::health', this._onHealthChange.bind(this));

    this._logger.info('Extension enabled +++');
  }

  disable() {
    if (this._logLevelSub !== null && this._settings) {
      this._settings.disconnect(this._logLevelSub)
      this._logLevelSub = null;
    }
    this._settings = null;

    this._menu.destroy();
    this._menu = null;

    this._notifications.clear();
    this._notifications = null;

    this._preferences.destroy()
    this._preferences = null;

    this._logger.info('Extension disabled ---');
    this._logger = null;
  }

  _onLogLevelChange() {
    const logLevel = this._settings.get_int('log-level');

    this._logger.setLevel(Level.Debug);
    this._logger.info(`Log level updated to ${logLevel}`);

    this._logger.setLevel(logLevel);
  }

  _onHealthChange() {
    const warnings = this._preferences.getHealth();
    if (warnings) {
      warnings.forEach(message => this._notifications.push(0, message));
      return;
    }
    this._notifications.clear();
  }
}

/**
 * Extension initialization
 * @param {Extension} meta
 * @returns {TsConnectExtension}
 */
function init(meta) {
  ExtensionUtils.initTranslations(meta.metadata['gettext-domain']);

  return new TsConnectExtension(meta.metadata);
}


