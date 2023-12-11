const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { StoreKey } = Me.imports.modules.utils;

const LogLevel = {
  Disabled: 0,
  Debug: 1,
  Info: 2,
  Warn: 3,
  Error: 4,
}

const LoggerName = Me.metadata['gettext-domain'];

class LoggerClass {

  _name = LoggerName;

  static LOGGER;

  static new() {
    if (!LoggerClass.LOGGER) {
      LoggerClass.LOGGER = new LoggerClass();
    }
    return LoggerClass.LOGGER;
  }

  /**
   * Print debug
   * @param rest {string}
   */
  debug(...rest) {
    this._print(LogLevel.Debug, rest);
  }

  /**
   * Print info
   * @param rest {string}
   */
  info(...rest) {
    this._print(LogLevel.Info, rest);
  }

  /**
   * Print warning
   * @param rest {string}
   */
  warn(...rest) {
    this._print(LogLevel.Warn, rest);
  }

  /**
   * Print error
   * @param rest {string}
   */
  error(...rest) {
    this._print(LogLevel.Error, rest);
  }

  /**
   * Print log message
   * @param level {LogLevel}
   * @param rest {string[]}
   * @private
   */
  _print(level, rest) {
    const logLevel = ExtensionUtils.getSettings().get_int(StoreKey.LogLevel);
    if (logLevel === 0 || logLevel > level) {
      return;
    }

    let prefix = '';
    switch (level) {
      case LogLevel.Debug:
        prefix += '\x1b[2;36m';
        break;
      case LogLevel.Info:
        prefix += '\x1b[0;37m';
        break;
      case LogLevel.Warn:
        prefix += '\x1b[0;33m';
        break;
      case LogLevel.Error:
        prefix += '\x1b[0;31m';
        break;
      default:
        return;
    }
    log(`${prefix}[${this._name}] ${rest.join(' ')} \x1b[0m`);
  }
}

var Logger = LoggerClass.new();