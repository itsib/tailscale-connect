const { GObject, Gtk, Adw, Gdk, GLib, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { require } = Me.imports.libs.require;

const { Logger } = require('libs/logger');
const { BuilderContext } = require('prefs-ui/builder-context');

const _ = ExtensionUtils.gettext;

/**
 *
 * @param {Gio.Settings} settings
 * @param {string} source_property
 * @param {Gtk.StringList} tagsList
 *
 * @return {() => void}
 */
function bind_tags_to_list(settings, source_property, tagsList) {
  const updateList = () => {
    tagsList.splice(0, tagsList.get_n_items(), []);

    const tags = settings.get_strv('advertise-tags');
    for (let j = 0; j < tags.length; j++) {
      tagsList.append(tags[j]);
    }
  }

  const connection0 = settings.connect(`changed::advertise-tags`, () => updateList());

  updateList();

  return () => {
    settings.disconnect(connection0);
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
  // let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
  // if (!iconTheme.get_search_path().includes(Me.path + "/media")) {
  //   iconTheme.add_search_path(Me.path + "/media");
  // }

  // App settings
  const settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);

  const logger = new Logger(this._domain);

  // Load css file
  const provider = new Gtk.CssProvider();
  const path = GLib.build_filenamev([Me.path, 'prefs-ui/preferences.css']);
  provider.load_from_path(path);
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
  );

  // Build interface
  const builder = new Gtk.Builder({
    scope: new BuilderContext(settings),
    translation_domain: Me.metadata['gettext-domain']
  });
  builder.set_translation_domain(Me.metadata.uuid);
  builder.add_from_file(`${Me.path}/prefs-ui/preferences.ui`);

  // Restore page size
  let width = settings.get_int('prefs-default-width');
  let height = settings.get_int('prefs-default-height');
  window.set_default_size(width, height);
  window.set_search_enabled(true);

  // Network preferences
  const network = builder.get_object('network');
  settings.bind('login-server', builder.get_object('login-server-entry'), 'text', Gio.SettingsBindFlags.DEFAULT);
  settings.bind('operator', builder.get_object('operator-entry'), 'text', Gio.SettingsBindFlags.DEFAULT);
  settings.bind('advertise-exit-node', builder.get_object('advertise-exit-node-switch'), 'active', Gio.SettingsBindFlags.DEFAULT);
  const unsubscribe = bind_tags_to_list(settings, 'advertise-tags', builder.get_object('advertise-tags-list'));
  window.add(network);

  // System settings
  const daemon = builder.get_object('daemon');
  settings.bind('log-level', builder.get_object('log-level-select'), 'active', Gio.SettingsBindFlags.DEFAULT);
  settings.bind('log-level', logger, 'logLevel', Gio.SettingsBindFlags.DEFAULT);
  settings.bind('socket', builder.get_object('socket-entry'), 'text', Gio.SettingsBindFlags.DEFAULT);
  window.add(daemon);

  // After close window we save window size for use to next open.
  window.connect('close-request', () => {
    unsubscribe();
    let currentWidth = window.default_width;
    let currentHeight = window.default_height;

    // Remember user window size adjustments.
    if (currentWidth !== width || currentHeight !== height) {
      settings.set_int('prefs-default-width', currentWidth);
      settings.set_int('prefs-default-height', currentHeight);
    }
    window.destroy();
  });
}