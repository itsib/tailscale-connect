/**
 *
 * @module libs/utils
 */

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
 * @readonly
 * @enum {string}
 */
var SettingsKey = Object.freeze({
  LoginServer: 'login-server',
  Operator: 'operator',
  LogLevel: 'log-level',
  AcceptRoutes: 'accept-routes',
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
})

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
})

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

var showObject = function showObject(obj) {
  log(`Object: ${obj.toString()}.:`);
  const keys = Object.keys(obj);
  log(`Properties: ${keys.join(', ')}`);
}