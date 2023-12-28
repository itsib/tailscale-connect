/**
 * @module libs/validators
 *
 * @typedef {function(value: string): { error: string } | null } ValidatorFunction
 */
const _ = imports.misc.extensionUtils.gettext;

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
  if (!value || /^https?:\/\/[a-zA-Z0-9-#?&_.!~*'()]/.test(value)) {
    return null;
  }
  return { error: _('Invalid URL value') };
}