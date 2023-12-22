const { GObject, Gtk, Adw } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require, SettingsKey } = Me.imports.libs.utils;

const { Logger } = require('libs/logger');
const { LoginServerControl } = require('prefs-ui/login-server-control');
const { OperatorControl } = require('prefs-ui/operator-control');
const { LogLevelControl } = require('prefs-ui/log-level-control');
const { AcceptRoutesControl } = require('prefs-ui/accept-routes-control');
const { ShieldsUpControl } = require('prefs-ui/shields-up-control');

const _ = ExtensionUtils.gettext;

class PreferencesWidget extends Gtk.Box {
  static { GObject.registerClass(this) }

  constructor() {
    super({ orientation: Gtk.Orientation.VERTICAL, spacing: 20 });

    // Init and subscribe to change the log level
    const settings = ExtensionUtils.getSettings();
    this._logger = new Logger(Me.metadata['gettext-domain'] + '-prefs');
    this._logger.setLevel(settings.get_int(SettingsKey.LogLevel));
    settings.connect(`changed::${SettingsKey.LogLevel}`, () => {
      this._logger.setLevel(settings.get_int(SettingsKey.LogLevel));
    });

    // Init Network Configuration
    const flagsGroup = new Adw.PreferencesGroup({
      name: Me.metadata.name,
      title: _('Network Configuration'),
      description: _(`Sets the parameters for startup and connecting your device to the Tailscale`),
    });
    flagsGroup.add(new LoginServerControl(this._logger));
    flagsGroup.add(new OperatorControl(this._logger));
    flagsGroup.add(new AcceptRoutesControl(this._logger));
    flagsGroup.add(new ShieldsUpControl(this._logger));
    this.append(flagsGroup);

    // Init Debugging
    const prefsGroup = new Adw.PreferencesGroup({
      name: Me.metadata.name,
      title: _('Debugging'),
      description: _(`Settings for debugging the extension ${Me.metadata.name}`),
    })
    prefsGroup.add(new LogLevelControl(this._logger));
    this.append(prefsGroup);

    this._logger.debug('Preferences Widget initialized');
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
 * This function is called when the preferences window is first created to build
 * and return a GTK4 widget.
 *
 * The preferences window will be a `Adw.PreferencesWindow`, and the widget
 * returned by this function will be added to an `Adw.PreferencesPage` or
 * `Adw.PreferencesGroup` if necessary.
 *
 * @returns {Gtk.Widget} the preferences widget
 */
function buildPrefsWidget() {
  return new PreferencesWidget();
}