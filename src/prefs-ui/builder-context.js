const { GObject, Gtk, GLib, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

var BuilderContext = class BuilderContext extends GObject.Object {
  static [GObject.interfaces] = [Gtk.BuilderScope];
  static { GObject.registerClass(this) }

  /**
   *
   * @param {Gio.Settings} settings
   */
  constructor(settings) {
    super();

    this._settings = settings;
  }

  /**
   * Bind signal handler
   *
   * @param {Gtk.Builder} builder
   * @param {string} handlerName
   * @param {number} flags
   * @param {Gtk.Widget} target
   * @return {*}
   */
  vfunc_create_closure(builder, handlerName, flags, target) {
    if (!this[handlerName]) {
      throw new Error(`${handlerName} is undefined`);
    }

    return this[handlerName].bind(target || this);
  }

  /**
   * Entries validator, flow depended on input_purpose and swapped
   * @param {Gtk.Entry} entry
   * @private
   */
  _validate(entry) {
    const label = entry.get_next_sibling();
    const value = entry.text;
    const classes = entry.get_css_classes();

    const required = classes.indexOf('required') !== -1;
    const aclTag = classes.indexOf('acl-tag') !== -1;
    const url = classes.indexOf('url') !== -1;

    // Required value
    if (required && !value) {
      label.label = `<span size="x-small">${_('Field is required')}</span>`;
      entry.add_css_class('error');
      return;
    }

    // Validate URL
    if (url && value && (!value.startsWith('http') || !GLib.uri_parse_scheme(value))) {
      label.label = `<span size="x-small">${_('Invalid URL value')}</span>`;
      entry.add_css_class('error');
      return;
    }

    // ACL tag validation
    if (aclTag && value) {
      // Validate prefix
      if ((!['t', 'ta', 'tag'].includes(value)) && !value.startsWith('tag:')) {
        label.label = `<span size="x-small">${_('ACL tag should start with - "tag:"')}</span>`;
        entry.add_css_class('error');
        return;
      }
      // Should unique
      const tags = this._settings.get_strv('advertise-tags');
      if (tags.includes(value)) {
        label.label = `<span size="x-small">${_('ACL tag already exists')}</span>`;
        entry.add_css_class('error');
        return;
      }
    }

    label.label = '';
    entry.remove_css_class('error')
  }

  /**
   * Add tag to entry
   * @param {Gtk.Entry} entry
   * @private
   */
  _addAclTag(entry) {
    if (!entry.text || !entry.text.startsWith('tag:')) {
      return;
    }
    const tags = this._settings.get_strv('advertise-tags');
    if (tags.includes(entry.text)) {
      return;
    }

    tags.push(entry.text);
    this._settings.set_strv('advertise-tags', tags);

    entry.text = '';
  }

  /**
   *
   * @param {Gtk.Button} button
   * @private
   */
  _deleteAclTag(button) {
    const label = button.get_prev_sibling();
    const tag = label.label;
    const tags = this._settings.get_strv('advertise-tags');

    this._settings.set_strv('advertise-tags', tags.filter(i => i !== tag));
  }
}
