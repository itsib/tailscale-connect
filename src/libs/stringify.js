/**
 * @module libs/stringify
 */

let filter = ['scale_factor', 'root', 'display', 'parent'];
let tabSize = 4;
let maxDepth = 2;
let tab = ' '.repeat(tabSize);

var stringify = function stringify(object, _maxDepth) {
  maxDepth = _maxDepth ?? maxDepth;

  return `\n${renderValue(object)}`;
}

var objectName = function objectName(object) {
  const stringify = `${object}`;
  const matched = stringify.match(/\[object\sinstance\swrapper\s([A-Za-z0-9.:_-]+)\s/);
  if (!matched) {
    return stringify;
  }
  return matched[1];
}

var renderValue = function renderValue(object, indent = 0) {
  switch (typeof object) {
    case 'bigint':
    case 'boolean':
    case 'number':
      return `${object}`;
    case 'string':
    case 'symbol':
      return `"${object}"`;
    case 'undefined':
      return `undefined`;
    case 'object': {
      if (object === null) {
        return `null`;
      }

      if (indent >= maxDepth) {
        return Array.isArray(object) ? `[ Array ]` : `<${objectName(object)}>`;
      }

      if (Array.isArray(object)) {
        const tabSpace = tab.repeat(indent + 1);
        const array = object.map(item => `${tabSpace}${item}\n`).join('');

        return `[\n${array}${tab.repeat(indent)}]`;
      }

      const keysValues = [];
      for (const property in object) {
        if (property.startsWith('_') || filter.includes(property)) {
          continue;
        }
        keysValues.push([property, renderValue(object[property], indent + 1)])
      }

      const tabSpace = tab.repeat(indent + 1);
      const child = keysValues
        .sort(([n0, v0], [n1, v1]) => {
          if (typeof v0 === 'object' && typeof v1 !== 'object') {
            return 1;
          }
          if (typeof v0 !== 'object' && typeof v1 === 'object') {
            return -1;
          }

          return n1 === n0 ? 0 : (n1 < n0 ? 1 : -1);
        })
        .map(([n, v]) => `${tabSpace}${n}: ${v}\n`).join('');

      let returns = `<${objectName(object)}> {`;
      returns += `\n${child}${tab.repeat(indent)}}`

      return returns;
    }
    case 'function': {
      const matched = object.toString().match(/method\s[\w._]+\.([a-z_]+)(\((?:[a-z,\s]+)?\))/);
      if (matched) {
        return `${matched[2]} => any`;
      }
      return `() => unknown`
    }
  }
}

var displayWindowState = function renderWindowState(flags, separator = ',') {
  const bin = flags.toString(2).split('').reverse();
  return bin.map((flag, index) => {
    if (flag === '0') {
      return '';
    }
    switch (index) {
      case 0:
        return 'NORMAL';
      case 1:
        return 'ACTIVE';
      case 2:
        return 'PRELIGHT';
      case 3:
        return 'SELECTED';
      case 4:
        return 'INSENSITIVE';
      case 5:
        return 'INCONSISTENT';
      case 6:
        return 'FOCUSED';
      case 7:
        return 'BACKDROP';
      case 8:
        return 'DIR_LTR';
      case 9:
        return 'DIR_RTL';
      case 10:
        return 'LINK';
      case 11:
        return 'VISITED';
      case 12:
        return 'CHECKED';
      case 13:
        return 'DROP_ACTIVE';
      case 14:
        return 'FOCUS_VISIBLE';
      case 15:
        return 'FOCUS_WITHIN';
    }
  }).filter(Boolean).join(separator);
}