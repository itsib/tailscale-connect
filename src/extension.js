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
 * @property {ExtensionType} type
 * @property {ExtensionState} state
 * @property {string} path
 * @property {string} error
 * @property {boolean} hasPrefs
 * @property {boolean} hasUpdate
 * @property {Array<'user' | 'system' | string>} sessionModes
 * @property {ExtensionMetadata} metadata
 *
 */
const { GLib  } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.utils;

const { TSTrayMenu } = require('ext-ui/tray-menu');
const { Notifications } = require('ext-ui/notifications');
const { Logger, Level } = require('libs/logger');
const { Storage } = require('libs/storage');
const { MenuAlignment, SettingsKey } = require('libs/utils');

class TsConnectExtension {
  /**
   * Logger instance
   * @type {Logger | null}
   * @private
   */
  _logger = null;
  /**
   * App storage
   * @type {Storage | null}
   * @private
   */
  _storage = null;
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
   * Refresh timer
   * @private {number|null}
   */
  _timerId = null;
  /**
   * Refresh interval for network state
   * @type {number}
   * @private
   */
  _updIntervalSec = 10;

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
    this._storage = new Storage(this._logger);
    this._notifications = new Notifications(this._logger);
    this._menu = new TSTrayMenu({ logger: this._logger, storage: this._storage });
    this._settings = ExtensionUtils.getSettings();

    this._logLevelSub = this._settings.connect(`changed::${SettingsKey.LogLevel}`, this._onLogLevelChange.bind(this));
    this._onLogLevelChange();

    Main.panel.addToStatusArea(this._uuid, this._menu, MenuAlignment.Center, 'right');

    this._storage.connect('notify::health', this._onHealthChange.bind(this))

    this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._updIntervalSec, this._refresh.bind(this));

    this._logger.info('Extension enabled +++');
  }

  disable() {
    if (this._timerId !== null) {
      GLib.Source.remove(this._timerId);
      this._timerId = null;
    }

    if (this._logLevelSub !== null && this._settings) {
      this._settings.disconnect(this._logLevelSub)
      this._logLevelSub = null;
    }
    this._settings = null;

    this._menu.destroy();
    this._menu = null;

    this._notifications.clear();
    this._notifications = null;

    this._storage.destroy()
    this._storage = null;

    this._logger.info('Extension disabled ---');
    this._logger = null;
  }

  _refresh() {
    this._logger.debug('Refresh storage state by interval');

    this._storage.refresh();

    return GLib.SOURCE_CONTINUE;
  }

  _onLogLevelChange() {
    const logLevel = this._settings.get_int(SettingsKey.LogLevel);

    this._logger.setLevel(Level.Debug);
    this._logger.info(`Log level updated to ${logLevel}`);

    this._logger.setLevel(logLevel);
  }

  _onHealthChange() {
    if (this._storage.health) {
      const messages = JSON.parse(this._storage.health);
      if (Array.isArray(messages)) {
        messages.forEach(message => this._notifications.push(0, message));
        return;
      }
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


