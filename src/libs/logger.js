/**
 * @exports libs/logger
 */
const { GObject } = imports.gi;

/**
 * Log level enum
 * @readonly
 * @enum {number}
 * @exports
 */
var LogLevel = Object.freeze({
  Disabled: 0,
  Error: 1,
  Info: 2,
  Debug: 3,
})

/**
 * @class
 * @type {Logger}
 * @property {number} logLevel
 * @exports
 */
var Logger = class Logger extends GObject.Object {
  static [GObject.properties] = {
    logLevel: GObject.ParamSpec.uint(
      'logLevel',
      'logLevel',
      'Log Level',
      GObject.ParamFlags.READWRITE,
      0, 3, LogLevel.Disabled
    )
  };
  static { GObject.registerClass(this) }

  /**
   * @constructs Logger
   * @param {string} name - Logger name
   */
  constructor(name) {
    super();
    this._name = name;
  }

  /**
   * Print error (red text)
   * @param error {Error | string}
   * @param rest {string}
   */
  error(error, ...rest) {
    if (this.logLevel >= LogLevel.Error) {
      if (typeof error === 'string') {
        logError(`\x1b[1;31m[${this._name}]\x1b[0m \x1b[0;31m${error} ${rest.join(' ')} \x1b[0m`)
      } else {
        logError(error, `\x1b[1;31m[${this._name}]\x1b[0m \x1b[0;31m${rest.join(' ')} \x1b[0m`)
      }
    }
  }

  /**
   * Print log message (gray text)
   * @param rest
   */
  info(...rest) {
    if (this.logLevel >= LogLevel.Info) {
      log(`\x1b[1;37m[${this._name}]\x1b[0m \x1b[0;37m${rest.join(' ')} \x1b[0m`);
    }
  }

  /**
   * Print debug (yellow text)
   * @param rest {string}
   */
  debug(...rest) {
    if (this.logLevel >= LogLevel.Debug) {
      log(`\x1b[1;33m[${this._name}]\x1b[0m \x1b[0;33m${rest.join(' ')} \x1b[0m`);
    }
  }
}
