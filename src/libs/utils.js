/**
 * @module libs/utils
 */
const { GObject  } = imports.gi;

/**
 * Extension settings properties
 *
 * @typedef SettingsKey
 * @property {string} LoginServer
 * @property {string} Operator
 * @property {string} AdvertiseExitNode
 * @property {string} AdvertiseTags
 * @property {string} LogLevel
 *
 * @alias module:libs/utils.SettingsKey
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
 * Bool to decimals opacity bind callback;
 * @param bind
 * @param source
 * @returns {[boolean,number]}
 */
var opacityBindTo = function opacityBindTo(bind, source) {
  return [true, source ? 255 : 0];
}