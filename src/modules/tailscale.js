const ProcessFlags = {
  STDOUT_PIPE: 3,
  STDERR_PIPE: 5,
}

/**
 * Uses for get and store tailscale service state
 * @type {Tailscale}
 */
var Tailscale = class Tailscale {
  /**
   *
   * @type {Map<string, Set<Callback>>}
   * @private
   */
  _listeners = new Map();
  /**
   * Tailscale service state
   * @type {TailscaleState}
   * @private
   */
  _state = 'loading';
  /**
   *
   * @param gio {Gio}
   * @param logger {Logger}
   */
  constructor(gio, logger) {
    this._gio = gio;
    this._logger = logger;
  }

  /**
   * Add event listener
   * @param eventName {EventName}
   * @param callback {Callback<any>}
   */
  on(eventName, callback) {
    this._logger.debug('Add event listener', eventName);

    /** @type {Set<Callback>} */
    const callbacks = this._listeners.get(eventName) ?? new Set();
    callbacks.add(callback);

    this._listeners.set(eventName, callbacks);
  }

  /**
   * Remove event listener
   * @param eventName {?EventName}
   * @param callback {?Callback}
   */
  off(eventName, callback) {
    // Remove callback from event
    if (eventName && callback) {
      this._logger.debug('Remove event listener from event', eventName);

      this._listeners.get(eventName)?.delete(callback);
    }
    // Remove all listeners from one event
    else if (eventName) {
      this._logger.debug('Remove all event listeners from event', eventName);

      this._listeners.get(eventName)?.clear();
      this._listeners.delete(eventName);
    }
    // Delete all events and listeners
    else {
      this._logger.debug('Remove all events and listeners');

      for(const eventName of this._listeners.keys()) {
        this._listeners.get(eventName)?.clear();
        this._listeners.delete(eventName);
      }
      this._listeners.clear();
    }
  }

  /**
   * Fire some event for all connected listeners
   * @param eventName {EventName}
   * @param args {Array<any>}
   */
  emit(eventName, ...args) {
    this._listeners.get(eventName)?.forEach(callback => callback(...args));
  }

  /**
   * Synk with native tailscale service
   */
  refresh() {
    this._exec(["status", "--json"], result => {
      /** @type {TailscaleBackendState} */
      const jsonObj = JSON.parse(result);

      /** @type {TailscaleState} */
      let state;
      if (jsonObj.BackendState === 'Stopped') {
        state = 'disabled';
      } else if (jsonObj.BackendState === 'Running') {
        state = jsonObj.ExitNodeStatus?.Online ? 'connected' : 'enabled'
      }

      if (state !== this._state) {
        this.emit('change-state', state);
        this._state = state;

      }
    });
  }

  /**
   * Set service state
   * @param commands {Array<string>}
   * @param callback {?Callback}
   */
  _exec(commands, callback) {
    try {
      let proc = this._gio.Subprocess.new(['tailscale', ...commands], ProcessFlags.STDOUT_PIPE | ProcessFlags.STDERR_PIPE)

      proc.communicate_utf8_async(null, null, (proc, res) => {
        try {
          let [, stdout, stderr] = proc.communicate_utf8_finish(res);
          if (proc.get_successful()) {
            callback?.(stdout);
          }
        } catch (e) {
          this._logger.error(e.message, e?.toString());
        }
      });
    } catch (e) {
      this._logger.error(e.message, e?.toString());
    }
  }

  get state() {
    return this._state;
  }
}