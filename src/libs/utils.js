/**
 * @module libs/utils
 */
const { Gdk, GObject  } = imports.gi;

/**
 * Main menu alignment mode
 *
 * @typedef {Object} MenuAlignment
 * @readonly
 * @property {1} Left
 * @property {0} Right
 * @property {0.5} Center
 */
var MenuAlignment = Object.freeze({
  Left: 1,
  Right: 0,
  Center: 0.5,
});

/**
 * Extension settings properties
 * @typedef {Object} SettingsKey
 * @readonly
 * @property {string} LoginServer
 * @property {string} Operator
 * @property {string} AdvertiseExitNode
 * @property {string} AdvertiseTags
 * @property {string} LogLevel
 * @export
 *
 * @type SettingsKey
 */
var SettingsKey = Object.freeze({
  LoginServer: 'login-server',
  Operator: 'operator',
  AdvertiseExitNode: 'advertise-exit-node',
  AdvertiseTags: 'advertise-tags',
  LogLevel: 'log-level',
});

/**
 * Network connection state
 *
 * @typedef {Object} ConnectionState
 * @property {-1} NeedLogin
 * @property {0} Disabled
 * @property {1} Enabled
 * @property {2} Connected
 * @readonly
 */
var ConnectionState = Object.freeze({
  NeedLogin: -1,
  Disabled: 0,
  Enabled: 1,
  Connected: 2,
});

/**
 * Extension type enum
 * @readonly
 * @enum {number}
 */
var ExtensionType = Object.freeze({
  SYSTEM: 1,
  PER_USER: 2,
});

/**
 * Extension State
 * @readonly
 * @enum {number}
 */
var ExtensionState = Object.freeze({
  ENABLED: 1,
  DISABLED: 2,
  ERROR: 3,
  OUT_OF_DATE: 4,
  DOWNLOADING: 5,
  INITIALIZED: 6,
  DISABLING: 7,
  ENABLING: 8,
  UNINSTALLED: 99,
});

/**
 *
 * @type {{jsobject: (function(string): GObject.ParamSpecBoxed), number: (function(string, number): GObject.ParamSpecInt), boolean: (function(string, boolean): GObject.ParamSpecBoolean), string: (function(string, string): GObject.ParamSpecString)}}
 */
var Spec = {
  /**
   * Create spec value
   * @param {string} key
   * @param {string} _default
   * @returns GObject.ParamSpecString
   */
  string: (key, _default) => GObject.ParamSpec.string(key, key, key, GObject.ParamFlags.READWRITE, _default),
  /**
   * Create spec js object
   * @param {string} key
   * @returns {GObject.ParamSpecBoxed}
   */
  jsobject: (key) => GObject.ParamSpec.jsobject(key, key, key, GObject.ParamFlags.READWRITE),
  /**
   * Create spec value
   * @param {string} key
   * @param {number} _default
   * @returns GObject.ParamSpecInt
   */
  number: (key, _default) => GObject.ParamSpec.int(key, key, key, GObject.ParamFlags.READWRITE, -Infinity, +Infinity, _default),
  /**
   * Create spec value
   * @param {string} key
   * @param {boolean} _default
   * @returns GObject.ParamSpecBoolean
   */
  boolean: (key, _default) => GObject.ParamSpec.boolean(key, key, key, GObject.ParamFlags.READWRITE, _default),
}

/**
 * Load and execute file of module
 * @param {string} name Module name
 * @returns {{}|*}
 */
var require = function require(name) {
  const [dir, file] = name.split('/');

  try {
    const ExtensionUtils = imports.misc.extensionUtils;
    const Me = ExtensionUtils.getCurrentExtension();
    const namespace = Me.imports[dir];
    return namespace[file];
  } catch (error) {
    logError(error, `Unresolved import. Module ${name} not found`);
    return {};
  }
}

/**
 * Build color interface
 * @param {string} colorName
 * @return Gdk.RGBA
 */
var getColor = function getColor(colorName) {
  const color = new Gdk.RGBA();
  color.parse(colorName);
  return color;
}

/**
 * Bool to decimals opacity bind callback;
 * @param bind
 * @param source
 * @returns {[boolean,number]}
 */
var opacityBindTo = function opacityBindTo(bind, source) {
  return [true, source ? 255 : 0];
}

var ornamentBindTo = function ornamentBindTo(bind, source) {
  // PopupMenu.Ornament.CHECK = 2
  // PopupMenu.Ornament.NONE = 0
  return [true, source ? 2 : 0];
}

var showObject = function showObject(obj) {
  log(`Object: ${obj.toString()}.:`);
  const keys = Object.keys(obj);
  log(`Properties: ${keys.join(', ')}`);
}