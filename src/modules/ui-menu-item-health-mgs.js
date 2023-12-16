const { GObject, Clutter, St } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { Logger } = Me.imports.modules.logger;
const _ = ExtensionUtils.gettext;

var MenuItemHealthMgs = class MenuItemHealthMgs extends PopupMenu.PopupBaseMenuItem {
  static { GObject.registerClass(this) }

  /**
   *
   * @param {TsState} tsState
   */
  constructor(tsState) {
    super({ reactive: false, can_focus: false, style_class: 'ts-menu-item ts-health-notify' });

    this._tsState = tsState;

    this._label = new St.Label({
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
      x_expand: true,
      style: 'ts-label'
    });
    this.add_child(this._label);
    this.label_actor = this._label;

    this._tsState.connect('notify::health', this._rerender.bind(this));
    this._rerender();
  }

  _rerender() {
    const health = this._tsState.health.trim();
    if (!health) {
      this.hide();
      return;
    }

    this.show();

    Logger.info(health);

    const [isOk, color] = Clutter.Color.from_string('#FF0000');

    this._label.clutter_text.max_length = 26;
    this._label.clutter_text.line_wrap_mode = 2;
    this._label.clutter_text.line_wrap = true;
    this._label.clutter_text.single_line_mode = false;
    isOk && this._label.clutter_text.set_color(color);
    this._label.clutter_text.set_markup(health);

  }
}