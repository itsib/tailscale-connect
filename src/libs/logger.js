/**
 * @exports libs/logger
 */

/**
 * Log level enum
 * @readonly
 * @enum {number}
 * @exports
 */
var Level = Object.freeze({
  Disabled: 0,
  Error: 1,
  Info: 2,
  Debug: 3,
})

/**
 * @class
 * @type {Logger}
 * @exports
 */
var Logger = class Logger {
  /**
   * @constructs Logger
   * @param {string} name - Logger name
   */
  constructor(name) {
    this._name = name;
    this._level = Level.Debug;
  }

  /**
   * Print error (red text)
   * @param error {Error | string}
   * @param rest {string}
   */
  error(error, ...rest) {
    if (this._level >= Level.Error) {
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
    if (this._level >= Level.Info) {
      log(`\x1b[1;37m[${this._name}]\x1b[0m \x1b[0;37m${rest.join(' ')} \x1b[0m`);
    }
  }

  /**
   * Print debug (yellow text)
   * @param rest {string}
   */
  debug(...rest) {
    if (this._level >= Level.Debug) {
      log(`\x1b[1;33m[${this._name}]\x1b[0m \x1b[0;33m${rest.join(' ')} \x1b[0m`);
    }
  }

  /**
   * Update log level
   * @param level {Level[keys Level]}
   */
  setLevel(level) {
    this._level = level;
  }
}