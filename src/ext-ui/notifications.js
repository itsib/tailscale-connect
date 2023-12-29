/**
 * @module ext-ui/notifications
 */
const { GObject, St, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Me = ExtensionUtils.getCurrentExtension();
const MessageTray = imports.ui.messageTray;

/**
 * @typedef {import(@girs/gnome-shell/src/ui/messageTray.d.ts)} MessageTray
 * @property {MessageTray.SystemNotificationSource} SystemNotificationSource
 *
 *
 * @class
 * @extends GObject.Object
 * @type {Notifications}
 * @exports
 */
var Notifications = class Notifications extends GObject.Object {
  static { GObject.registerClass(this) }
  /** @type {SystemNotificationSource|null} */
  _source = null;
  /** @type {string[]} */
  _dismissed = [];

  /**
   * @param {Logger} logger
   */
  constructor(logger) {
    super();

    this._logger = logger;
  }

  /**
   * Display notification
   * @param {number} type
   * @param {string} message
   */
  push(type, message) {
    if (this._dismissed.includes(message)) {
      return;
    }

    const source = this._createSource();
    const title = Me.metadata.name;

    // Media IDs
    // device-removed-media
    // device-added-media
    // suspend-error
    // dialog-warning
    // message-new-instant
    const notification = new MessageTray.Notification(source, title, message, {
      soundName: 'dialog-warning-media',
      bannerMarkup: true,
      // gicon: Gio.icon_new_for_string('dialog-warning-symbolic')
    });


    notification.connect('activated', this._dismiss.bind(this, message));
    notification.setResident(true);
    notification.bannerBodyText = message;

    source.pushNotification(notification);
    source.showNotification(notification);
  }

  clear() {
    this._dismissed.length = 0;
    if (this._source) {
      this._source.destroy(MessageTray.NotificationDestroyedReason.DISMISSED);
    }
  }

  _createSource() {
    if (this._source === null) {
      this._source = new MessageTray.SystemNotificationSource('Tailscale', 'network-wired-symbolic');
      this._source.createIcon = (size) => {
        return new St.Icon({
          gicon: Gio.icon_new_for_string(Me.path + '/icons/tailscale-notify-icon.svg'),
          width: size,
          height: size,
        });
      };
      this._source.connect('destroy', () => {
        this._source = null;
        this._dismissed.length = 0;
      });

      Main.messageTray.add(this._source);
    }
    return this._source;
  }

  _dismiss(message) {
    this._dismissed.push(message);
  }
}