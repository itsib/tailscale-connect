const { GObject, Gtk, Adw } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Logger } = Me.imports.modules.logger;
const { RefreshIntervalControl } = Me.imports['prefs-ui']['ui-refresh-interval-control'];
const { LoginServerControl } = Me.imports['prefs-ui']['ui-login-server-control'];
const { OperatorControl } = Me.imports['prefs-ui']['ui-operator-control'];
const { LogLevelControl } = Me.imports['prefs-ui']['ui-log-level-control'];
const { AcceptRoutesControl } = Me.imports['prefs-ui']['ui-accept-routes-control'];
const { ShieldsUpControl } = Me.imports['prefs-ui']['ui-shields-up-control'];

const _ = ExtensionUtils.gettext;

class PreferencesWidget extends Gtk.Box {
  static { GObject.registerClass(this) }

  _init() {
    super._init({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 20,
    });

    const flagsGroup = new Adw.PreferencesGroup({
      name: Me.metadata.name,
      title: _('Connection'),
      description: _(`Sets the parameters for startup and connecting your device to the Tailscale`),
    });

    flagsGroup.add(new LoginServerControl());
    flagsGroup.add(new OperatorControl());
    flagsGroup.add(new AcceptRoutesControl());
    flagsGroup.add(new ShieldsUpControl());
    this.append(flagsGroup);


    const prefsGroup = new Adw.PreferencesGroup({
      name: Me.metadata.name,
      title: _('Appearance'),
      description: _(`Configure the appearance of ${Me.metadata.name}`),
    })

    prefsGroup.add(new RefreshIntervalControl());
    prefsGroup.add(new LogLevelControl());

    this.append(prefsGroup);

    Logger.info('🛠  PreferencesWidget initialized');
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