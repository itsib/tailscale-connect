/**
 * @module libs/stringify
 */

let filter = ['scale_factor', 'root', 'display', 'parent'];
let tabSize = 4;
let maxDepth = 2;
let tab = ' '.repeat(tabSize);

var stringify = (object, _maxDepth) => {
  maxDepth = _maxDepth ?? maxDepth;

  return `\n${renderValue(object)}`;
}

var objectName = object => {
  const stringify = `${object}`;
  const matched = stringify.match(/\[object\sinstance\swrapper\s([A-Za-z0-9.:_-]+)\s/);
  if (!matched) {
    return stringify;
  }
  return matched[1];
}

var renderValue = (object, indent = 0) => {
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