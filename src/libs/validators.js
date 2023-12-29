/**
 * @module libs/validators
 *
 * @typedef {function(value: string): { error: string } | null } ValidatorFunction
 */
const { GObject, Gtk, Gio, GLib } = imports.gi;
const _ = imports.misc.extensionUtils.gettext; // uri_parse

/**
 * Field required validator
 * @type ValidatorFunction
 */
var validatorRequired = function validateUrl(value) {
  if (!value) {
    return { error: _('Field is required') }
  }
  return null;
}

/**
 * Url validator
 * @type ValidatorFunction
 */
var validatorUrl = function validateUrl(value) {
  try {
    if (value) {
      if (!/^https?:\/\//.test(value) || !GLib.uri_parse_scheme(value)) {
        throw new Error('Url Error');
      }
    }
  } catch (e) {
    return { error: _('Invalid URL value') };
  }
  return null;

  // if (!value || /^https?:\/\/[a-zA-Z0-9-#?&_.!~*'()]/.test(value)) {
  //   return null;
  // }
  // return { error: _('Invalid URL value') };
}