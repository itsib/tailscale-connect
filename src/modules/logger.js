var Logger = class Logger {
  constructor(name) {
    this._name = name;
  }

  /**
   * Print debug
   * @param rest {string}
   */
  debug(...rest) {
    this._print('debug', ...rest);
  }

  /**
   * Print info
   * @param rest {string}
   */
  info(...rest) {
    this._print('info', ...rest);
  }

  /**
   * Print warning
   * @param rest {string}
   */
  warn(...rest) {
    this._print('warn', ...rest);
  }

  /**
   * Print error
   * @param rest {string}
   */
  error(...rest) {
    this._print('error', ...rest);
  }

  /**
   * Print log message
   * @param level {'debug' | 'info' | 'warn' | 'error'}
   * @param rest {string}
   * @private
   */
  _print(level, ...rest) {
    let prefix = '';
    switch (level) {
      case 'debug':
        prefix += '\x1b[2;36m';
        break;
      case 'info':
        prefix += '\x1b[0;37m';
        break;
      case 'warn':
        prefix += '\x1b[0;33m';
        break;
      case 'error':
        prefix += '\x1b[0;31m';
        break;
      default:
        throw new Error(`Unsupported level: ${level}`);
    }
    log(`${prefix}[${this._name}] ${rest.join(' ')} \x1b[0m`);
  }
}