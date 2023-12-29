/**
 * @module prefs-ui/text-field
 */
const { GObject, Gtk, Gio, GLib } = imports.gi;

/**
 *
 * @class
 * @extends Gtk.Box
 * @extends GObject.Object
 * @type {TextField}
 * @property {string} error
 * @property {boolean} touched
 * @property {boolean} invalid
 */
var TextField = class TextField extends Gtk.Box {
  static [GObject.properties] = {
    text: GObject.ParamSpec.string('text', 'text', 'text', GObject.ParamFlags.READWRITE, ''),
    error: GObject.ParamSpec.string('error', 'error', 'error', GObject.ParamFlags.READWRITE, ''),
    touched: GObject.ParamSpec.boolean('touched', 'touched', 'touched', GObject.ParamFlags.READWRITE, false),
    focused: GObject.ParamSpec.boolean('focused', 'focused', 'focused', GObject.ParamFlags.READWRITE, false),
    invalid: GObject.ParamSpec.boolean('invalid', 'invalid', 'invalid', GObject.ParamFlags.READWRITE, false),
    placeholder_text: GObject.ParamSpec.string('placeholder_text', 'placeholder', 'placeholder', GObject.ParamFlags.READWRITE, ''),
    secondary_icon_name: GObject.ParamSpec.string('secondary_icon_name', 'secondary_icon_name', 'secondary_icon_name', GObject.ParamFlags.READWRITE, ''),
    width_chars: GObject.ParamSpec.int('width_chars', 'width_chars', 'width_chars', GObject.ParamFlags.READWRITE, -1, Infinity, -1),
    input_purpose: GObject.ParamSpec.int('input_purpose', 'input_purpose', 'input_purpose', GObject.ParamFlags.READWRITE, -1, Infinity, -1),
  }

  static [GObject.signals] = {
    'submit': { param_types: [ GObject.TYPE_STRING ] },
    'icon-clicked': {},
    'error': { param_types: [ GObject.TYPE_STRING ] },
    'focus': {},
    'leave': {},
  }

  static { GObject.registerClass(this) }

  /** @type ValidatorFunction[] */
  _validators = [];

  constructor(params) {
    super({ orientation: Gtk.Orientation.VERTICAL });

    this._entry = new Gtk.Entry(params);
    this.append(this._entry);

    this._errorMessage = new Gtk.Label({ css_classes: ['error'], visible: false });
    const css = new Gtk.CssProvider();
    css.load_from_data('* { font-size: 10px; padding-left: 4px; }');
    this._errorMessage.get_style_context().add_provider(css, 0);
    this._errorMessage.halign = Gtk.Align.START;
    this._errorMessage.height_request = 10;
    this._errorMessage.vexpand = false;
    this.append(this._errorMessage);

    this.bind_property('placeholder_text', this._entry, 'placeholder_text', GObject.BindingFlags.DEFAULT);
    this.bind_property('secondary_icon_name', this._entry, 'secondary_icon_name', GObject.BindingFlags.DEFAULT);
    this.bind_property('width_chars', this._entry, 'width_chars', GObject.BindingFlags.DEFAULT);
    this.bind_property('input_purpose', this._entry, 'input_purpose', GObject.BindingFlags.DEFAULT);
    this.bind_property('text', this._entry, 'text', GObject.BindingFlags.BIDIRECTIONAL);

    this._entry.connect('notify::text', this.validate.bind(this))

    this._entry.connect('notify::invalid', ({ invalid, touched }) => (invalid && touched ? this._entry.add_css_class('error') : this._entry.remove_css_class('error')))
    this._entry.connect('notify::has-focus', () => this.touched = true);

    this._entry.connect('activate', () => this.emit('submit', this._entry.text));
    this._entry.connect('icon-press', () => this.emit('icon-clicked'));
    this._entry.connect('notify::focusable', () => this._entry.focusable === false && (this.focused = false));
    this._entry.connect('notify::has-focus', () => this.focused = !this.focused);
    this._entry.connect('notify::cursor-position', () => this.focused = true);

    this.connect('notify::focused', this._onFocusChange.bind(this));
  }

  /**
   * Add validators to control
   * @param {ValidatorFunction} validators
   * @return void
   */
  validatorAdd(...validators) {
    this._validators = [...this._validators, ...validators];
  }

  /**
   * Validate text value after each change
   */
  validate() {
    const value = this._entry.text;
    if (!this.touched) this.touched = true

    // Validate value
    let error = null;
    for (let i = 0; i < this._validators.length; i++) {
      error = this._validators[i](value);
    }

    this.setValidationError(error);
  }

  /**
   * Reset input state
   */
  reset() {
    this.touched = false;
    this.text = '';
  }

  /**
   * Apply widget state
   * @param {{ error: string }|null} error
   * @private
   */
  setValidationError(error) {
    if (error) {
      if (!this.invalid) this.invalid = true;
      if (this.error !== error.error) {
        this.error = error.error;
        this._errorMessage.text = error.error;
        this._errorMessage.set_text(error.error);
        this._errorMessage.set_visible(true);
        this._entry.add_css_class('error');
        this.emit('error', error.error);
      }
    } else {
      if (this.invalid) this.invalid = false;
      if (this.error) this.error = '';
      this._entry.remove_css_class('error');
      this._errorMessage.set_text('');
      this._errorMessage.set_visible(false);
    }
  }

  _onFocusChange() {
    if (this.focused) {
      this.emit('focus');
    } else {
      this.emit('leave');
    }
  }
}