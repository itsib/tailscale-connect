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