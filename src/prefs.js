const { GObject, Gtk, Adw } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require, SettingsKey } = Me.imports.libs.utils;

const { Logger } = require('libs/logger');
const { LoginServerControl } = require('prefs-ui/login-server-control');
const { OperatorControl } = require('prefs-ui/operator-control');
const { LogLevelControl } = require('prefs-ui/log-level-control');
const { AdvertiseExitNodeControl } = require('prefs-ui/advertise-exit-node-control');
const { AdvertiseTagsControl } = require('prefs-ui/advertise-tags-control');

const _ = ExtensionUtils.gettext;

class PreferencesWidget extends Adw.PreferencesPage {
  static { GObject.registerClass(this) }

  constructor() {
    super({
      name: 'general',
      title: _('%s Preferences').format(Me.metadata.name),
      icon_name: 'preferences-system-symbolic',
    });

    // Init and subscribe to change the log level
    this._destroyed = false;
    this._settings = ExtensionUtils.getSettings();
    this._logger = new Logger(Me.metadata['gettext-domain'] + '-prefs');
    this._updateLogLevel();

    // Init Network Configuration
    const flagsGroup = new Adw.PreferencesGroup({
      name: Me.metadata.name,
      title: _('Network Configuration'),
      description: _(`Sets the parameters for startup and connecting your device to the Tailscale`),
    });
    flagsGroup.add(new LoginServerControl(this._settings, this._logger));
    flagsGroup.add(new OperatorControl(this._settings, this._logger));
    flagsGroup.add(new AdvertiseExitNodeControl(this._settings, this._logger));
    flagsGroup.add(new AdvertiseTagsControl(this._settings, this._logger));
    this.add(flagsGroup);


    // Init Debugging
    const prefsGroup = new Adw.PreferencesGroup({
      name: Me.metadata.name,
      title: _('Debugging'),
      description: _(`Settings for debugging the extension ${Me.metadata.name}`),
    });
    prefsGroup.add(new LogLevelControl(this._settings, this._logger));
    this.add(prefsGroup);

    this.set_visible(true);

    this.connect('unrealize', this.destroy.bind(this))
    this.connect('destroy', this.destroy.bind(this));

    this._settings.connect(`changed::${SettingsKey.LogLevel}`, this._updateLogLevel.bind(this));

    this._settings.connect('changed', this._onSettingsChanged.bind(this));

    this._logger.debug('Preferences Widget initialized');
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this._logger.debug('Preferences Widget Destroyed');
  }

  _onSettingsChanged() {

  }

  _updateLogLevel() {
    const logLevel = this._settings.get_int(SettingsKey.LogLevel);
    this._logger.setLevel(logLevel);
  }
}

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param meta {ExtensionMetadata} The metadata.json file, parsed as JSON
 */
function init(meta) {
  ExtensionUtils.initTranslations(meta['gettext-domain']);
}

/**
 * @typedef {GObject.Object} Window
 * @extends Adw.PreferencesWindow
 * @extends Gtk.Window
 *
 * This function is called when the preferences window is first created to build
 * and return a GTK4 widget.
 *
 * @param {Window} window
 *
 */
function fillPreferencesWindow(window) {
  window.add(new PreferencesWidget());
}