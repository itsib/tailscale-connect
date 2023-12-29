/**
 * @module prefs-ui/advertise-tags-control
 *
 * @typedef {import(@girs/adw-1)} Adw
 *
 * @typedef {import(@girs/gtk-4.0)} Gtk
 *
 * @typedef {import(@girs/gdk-4.0)} Gdk
 *
 * @typedef {import(@girs/gio-2.0)} Gio
 *
 * @typedef {import(libs/logger)} Logger
 *
 * @typedef {imports(node_modules/@girs/gnome-shell/src/misc/extensionUtils.d.ts)} ExtensionUtils
 * @method ExtensionUtils#getSettings
 * @return Gio.Settings
 */
const { GObject, Gtk, Adw, Gio,  } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;
const { SettingsKey, require } = Me.imports.libs.utils;
const { TextField } = require('prefs-ui/text-field');

var AdvertiseTagsControl = class AdvertiseTagsControl extends Adw.ActionRow {
  static [GObject.properties] = {
    tags: GObject.ParamSpec.string('tags', 'tags', 'tags', GObject.ParamFlags.READWRITE, ''),
  };
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Gio.Settings} settings
   * @param {Logger} logger
   */
  constructor(settings, logger) {
    super({
      css_classes: ['advertise-tags-control'],
      title: _('Advertise Tags'),
      subtitle: _('This device identity or appointment as the combination of tags. ') +
        _('(e.g. "tag:eng, tag:montreal, tag:ssh")'),
    });

    this._logger = logger;
    this._settings = settings;

    // Main Box
    this._box = new Gtk.Box();
    this._box.orientation = Gtk.Orientation.VERTICAL;
    this._box.homogeneous = false;
    this._box.vexpand = true;
    this._box.halign = Gtk.Align.END;
    this._box.margin_top = 16;
    this._box.margin_bottom = 16;
    this._box.add_css_class('advertise-tags-control');
    this.add_suffix(this._box);


    // Text input
    this._tagNameField = new TextField();
    this._tagNameField.width_request = 120;
    this._tagNameField.placeholder_text = 'tag:name';
    this._tagNameField.secondary_icon_name = 'list-add-symbolic';
    this._tagNameField.hexpand = false;
    this._tagNameField.validatorAdd(this._validate.bind(this));
    this._box.append(this._tagNameField);
    this.set_activatable_widget(this._tagNameField);

    // Tags box
    this._tagFlowBox = new AclTagsContainer(this._settings);
    this._box.append(this._tagFlowBox);

    this._tagNameField.connect('submit', this._addTag.bind(this));
  }

  /**
   * Add new tag
   * @private
   */
  _addTag() {
    const error = this._validate(this._tagNameField.text, true);
    if (error) {
      this._tagNameField.setValidationError(error);
      return;
    }
    const tagName = this._tagNameField.text;
    this._tagNameField.reset();

    this._tagFlowBox.add(tagName);
  }

  /**
   *
   * @param {string} value
   * @param {?boolean} strict
   * @return {{error: string}|null}
   * @private
   */
  _validate(value, strict) {
    if (!strict && (!value || ['t', 'ta', 'tag', 'tag:'].includes(value))) {
      return null;
    }
    if (value && value.startsWith('tag:') && value.length > 4) {
      const exists = this._tagFlowBox.exists(value);
      if (!exists) {
        return null;
      }

      return { error: _('Tag already exists') };
    }
    return { error: _('Invalid tag name') };
  }
}

/**
 * Tag Name model
 */
class AclTagName extends GObject.Object {
  static [GObject.properties] = {
    tag_name: GObject.ParamSpec.string('tag_name', 'tag_name', 'tag_name', GObject.ParamFlags.READWRITE, ''),
  }
  static {GObject.registerClass(this)}
  constructor(tagName) {
    super();
    this.tag_name = tagName;
  }

  equals(tagName) {
    return tagName === this.tag_name;
  }

  toString() {
    return this.tag_name;
  }
}

class AclTagsContainer extends Gtk.FlowBox {
  static [GObject.properties] = {
    tags: GObject.ParamSpec.string('tags', 'tags', 'tags', GObject.ParamFlags.READWRITE, '[]'),
  };
  static [GObject.signals] = {
    'remove-acl-tag': { param_types: [ GObject.TYPE_STRING ] },
  }
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Gio.Settings} settings
   */
  constructor(settings) {
    super({ css_name: 'tags-box' });

    this._settings = settings;

    // Configure widget
    this.column_spacing = 4;
    this.row_spacing = 4;
    this.homogeneous = false;
    this.hexpand = true;
    this.halign = Gtk.Align.START;
    this.valign = Gtk.Align.START;
    this.selection_mode = Gtk.SelectionMode.NONE;
    this.min_children_per_line = 2;
    this.max_children_per_line = 2;

    // Styles provider
    this._cssProvider = new Gtk.CssProvider();
    this._cssProvider.load_from_path(Me.path + '/prefs-ui/advertise-tags-control.css');
    this.get_style_context().add_provider(this._cssProvider, 0);

    // Define list model
    this._tagsList = new AclTagsList(this._settings);
    this.bind_model(this._tagsList, tagName => {
      return tagName ? new AclTag(tagName.toString(), this._cssProvider) : null;
    });

    this.connect('remove-acl-tag', (_, tagName) => this.remove(tagName));
  }

  /**
   * Add tag with name
   * @param {string} tagName
   * @return void
   */
  add(tagName) {
    this._tagsList.append(tagName);
  }

  /**
   * Remove tag
   * @param tagName
   */
  remove(tagName) {
    this._tagsList.remove(tagName);
  }

  /**
   * Tag is already exists
   * @param tagMame
   * @return {boolean}
   */
  exists(tagMame) {
    return !(this._tagsList.indexOf(tagMame) === -1);
  }
}

/**
 * @extends Gio.ListModel
 * @extends GObject.Object
 */
class AclTagsList extends GObject.Object {
  static [GObject.interfaces] = [Gio.ListModel];
  static { GObject.registerClass(this) }

  /** @type {AclTagName[]} */
  _tags = [];
  /** @type {string[]} */
  _tagNames = [];
  /** @type {Gio.Settings} */
  _settings;
  /** @type {number} */
  _subscription

  /**
   *
   * @param {Gio.Settings} settings
   */
  constructor(settings) {
    super();

    this._settings = settings;
    this._subscription = this._settings.connect(`changed::${SettingsKey.AdvertiseTags}`, () => this._sync());

    this._sync();
  }

  /**
   * Implements Gio.ListModel interface method
   * @param {number} index
   * @return {GObject.GType<string>|null}
   */
  vfunc_get_item(index) {
    return this._tags[index] || null;
  }

  vfunc_get_item_type() {
    return AclTagName;
  }

  vfunc_get_n_items() {
    return this._tags.length;
  }

  /**
   * Insert new tag
   * @param {string} tagName
   */
  append(tagName) {
    const index = this._tags.length;
    if (this._tagNames.includes(tagName)){
      throw new Error(`Tag name "${tagName}" already exists`)
    }

    this._tagNames.push(tagName);
    this._tags.push(new AclTagName(tagName));
    this._saveModel();

    this.items_changed(index, 0, 1);
  }

  /**
   * Remove tag by name
   * @param tagName
   */
  remove(tagName) {
    const index = this.indexOf(tagName);
    if (index < 0)
      return;

    this._tags.splice(index, 1);
    this._tagNames.splice(index, 1);
    this._saveModel();

    this.items_changed(index, 1, 0);
  }

  /**
   * Get tag index
   * @param tagName
   * @return {number}
   */
  indexOf(tagName) {
    return this._tagNames.indexOf(tagName);
  }

  /**
   * Sync with settings
   * @private
   */
  _sync() {
    let stored = this._settings.get_strv(SettingsKey.AdvertiseTags);

    stored = typeof stored === 'string' ? [stored] : Array.isArray(stored) ? stored : [];

    // Compare tags arrays
    if (stored.length === this._tagNames.length && stored.every((tagName, index) => tagName === this._tagNames[index])) {
      return;
    }

    // Update array
    const removed = this._tags.length;
    this._tagNames = stored;
    this._tags = this._tagNames.map(tagName => new AclTagName(tagName));

    this.items_changed(0, removed, this._tags.length);
  }

  /**
   * Save tags list to settings
   * @private
   */
  _saveModel() {
    this._settings.block_signal_handler(this._subscription);

    this._settings.set_strv(SettingsKey.AdvertiseTags, this._tagNames);

    this._settings.unblock_signal_handler(this._subscription);
  }
}

/**
 * Tag item widget
 */
class AclTag extends Gtk.FlowBoxChild {
  static { GObject.registerClass(this) }

  /**
   * @param {string} tagName
   * @param {Gtk.CssProvider} cssProvider
   */
  constructor(tagName, cssProvider) {
    super({ name: 'acl-tag', css_name: 'acl-tag' });
    this._cssProvider = cssProvider;
    this.get_style_context().add_provider(this._cssProvider, 0);

    // Tag container
    const containerName = 'acl-tag-container';
    this._container = new Gtk.Box({ name: containerName, css_name: containerName, orientation: Gtk.Orientation.HORIZONTAL });
    this._container.get_style_context().add_provider(this._cssProvider, 0);
    this._container.valign = Gtk.Align.CENTER;
    this._container.halign = Gtk.Align.END;
    this.set_child(this._container);

    // Tag label
    const labelName = 'acl-tag-label';
    this._label = new Gtk.Label({ name: labelName, label: tagName, css_name: labelName });
    this._label.get_style_context().add_provider(this._cssProvider, 0);
    this._container.append(this._label);

    // Button remove tag
    const btnName = 'acl-tag-btn-remove';
    this._button = new Gtk.Button({
      name: btnName,
      css_name: btnName,
      icon_name: 'window-close-symbolic',
      accessible_role: Gtk.AccessibleRole.BUTTON,
    });
    this._button.get_style_context().add_provider(this._cssProvider, 0);
    this._container.append(this._button);

    this._button.connect('clicked', () => {
      this.parent.emit('remove-acl-tag', this._label.label);
    });
  }
}