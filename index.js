const postcss = require('postcss'),
  _ = require('lodash'),
  path = require('path');

/**
 * get index of a variables, for error messages
 * @param  {object} node
 * @param  {string} word
 * @return {number}
 */
function getIndex(node, word) {
  const index = node.toString().indexOf(word) - 1;

  return index > 0 ? index : 0;
}

/**
 * get required prefix, based on option
 * @param  {string} filepath
 * @param  {string|undefined} requirePrefix
 * @return {string|null}
 */
function getRequiredPrefix(filepath, requirePrefix) {
  if (requirePrefix === 'file') {
    return path.basename(filepath, path.extname(filepath));
  } else if (requirePrefix === 'folder') {
    return _.last(path.dirname(filepath).split(path.sep));
  } else {
    return null;
  }
}

/**
 * get hoisted prop if it exists
 * @param  {object}  node
 * @return {Boolean}      [description]
 */
function getHoistedProp(node) {
  const match = node.prop.match(/^\$(.*?)$/i);

  return match && match[1];
}

/**
 * get variables from values if they exist
 * @param  {object} node
 * @return {array}
 */
function getValueVariables(node) {
  const matches = node.value.match(/\$([\w-]+)/ig) || [];

  return _.map(matches, (match) => match.replace('$', ''));
}

/**
 * get the variable name(s) from a node
 * @param  {object} node
 * @return {array}
 */
function getVariables(node) {
  const propVariable = getHoistedProp(node),
    valueVariables = getValueVariables(node);

  return _.compact([propVariable].concat(valueVariables));
}

/**
 * check to see if a prefix (filename or folder name) is required,
 * and if it's missing create an error
 * @param  {object} node
 * @param  {null|string} prefix
 */
function checkPrefix(node, prefix) {
  const variableNames = getVariables(node);

  if (prefix) {
    // there is a prefix to check, so make sure all the variables in this declaration use it!
    const regex = new RegExp(`^${prefix}\-.*?$`);

    _.each(variableNames, (name) => {
      if (!name.match(regex)) {
        throw node.error(`No prefix for $${name}! Should it be $${prefix}-${name}?`, { word: `$${name}`, index: getIndex(node, name) });
      }
    });
  }
}

/**
 * get hoisted default if it exists
 * @param  {object} node
 * @return {object} with variable name: value
 */
function getHoistedDefault(node) {
  const prop = getHoistedProp(node),
    match = node.value.match(/(.*?)\s?!default$/i);

  return prop && match && match[1] ? { [prop]: match[1] } : {};
}

/**
 * Get the value of a variable, which may reference an already-defined variable.
 * @param {string} found value or $variable
 * @param {object} variables or variableDefaults
 * @return {string}
 */
function getVariableAssignment(found, variables) {
  const key = Object.keys(found)[0],
    valueOrReferencedVariable = found[key];

  if (!key || !valueOrReferencedVariable) {
    return null;
  }

  let value = valueOrReferencedVariable;

  if (valueOrReferencedVariable.includes('$')) {
    const referencedVariable = valueOrReferencedVariable.replace('$', ''),
      referencedValue = variables[referencedVariable];

    value = referencedValue;
  }

  return value ? {
    [key]: value
  } : null;
}

/**
 * handle hoisted default variables
 * @param  {object} node
 * @param  {object} variableDefaults
 * @param  {string|null} prefix
 * @param  {string|undefined} requireDefault
 */
function handleHoistedDefault(node, variableDefaults, prefix, requireDefault) {
  const found = getHoistedDefault(node),
    prop = found && Object.keys(found)[0];

  if (_.size(found) && requireDefault === 'inline') {
    throw node.error(`Illegal hoisted variable $${prop}! Use "$${prop} or value"`, { word: `$${prop}`, index: getIndex(node, prop) });
  } else {
    checkPrefix(node, prefix);
    _.assign(variableDefaults, getVariableAssignment(found, variableDefaults));
  }
}

/**
 * get hoisted variable if it exists (and isn't default)
 * @param  {object} node
 * @return {object} with variable name: value
 */
function getHoistedVariable(node) {
  const prop = getHoistedProp(node);

  return prop && !_.size(getHoistedDefault(node)) ? { [prop]: node.value } : {};
}

/**
 * handle hoisted default variables
 * @param  {object} node
 * @param  {object} variables
 * @param  {string|null} prefix
 * @param  {string|undefined} requireDefault
 */
function handleHoistedVariable(node, variables, prefix, requireDefault) {
  const found = getHoistedVariable(node),
    prop = found && Object.keys(found)[0];

  if (_.size(found) && requireDefault === 'flag') {
    throw node.error(`No !default flag set for $${prop}!`, { word: `$${prop}`, index: getIndex(node, prop) });
  } else if (_.size(found) && requireDefault === 'inline') {
    throw node.error(`Illegal hoisted variable $${prop}! Use "$${prop} or value"`, { word: `$${prop}`, index: getIndex(node, prop) });
  } else {
    checkPrefix(node, prefix);
    _.assign(variables, getVariableAssignment(found, variables));
  }
}

/**
 * determine if a rule contains a variable
 * @param  {object}  node
 * @return {Boolean}
 */
function hasVariables(node) {
  return _.includes(node.value, '$');
}

/**
 * get inline defaults from values if they exist
 * grouped defaults look like [$var or default]
 * regular inline defaults look like $var or default
 * @param  {object} node
 * @return {object}
 */
function getInlineDefaults(node) {
  const inlineDefaultRegex = /\[?\$([\w-]+)\sor\s(.+?)(?:\]|$)/i,
    matches = node.value.match(new RegExp(inlineDefaultRegex, 'g')) || [];

  return _.reduce(matches, (result, match) => {
    const parts = match.match(inlineDefaultRegex);

    return _.assign(result, { [parts[1]]: parts[2] });
  }, {});
}

/**
 * handle inline default variables
 * @param  {object} node
 * @param  {object} variableDefaults
 * @param  {string|null} prefix
 * @param  {string|undefined} requireDefault
 */
function handleInlineDefaults(node, variableDefaults, prefix, requireDefault) {
  const found = getInlineDefaults(node);

  if (_.size(found) && requireDefault === 'hoisted') {
    const firstProp = Object.keys(found)[0]; // we only need to look at the first item

    throw node.error(`Illegal inline variable $${firstProp}! Use "$${firstProp}: value !default"`, { word: `$${firstProp}`, index: getIndex(node, firstProp) });
  } else {
    checkPrefix(node, prefix);
    _.assign(variableDefaults, found);
  }
}

/**
 * replace values in variables
 * @param  {object} node
 * @param  {object} variables
 * @param  {object} variableDefaults
 */
function replaceValues(node, variables, variableDefaults) {
  const inlineVaribleRegex = /\[?\$([\w-]+)(?:(?:\sor\s(?:.+?))?(?:\]|$)|(?=\s|\)))/i,
    matches = node.value.match(new RegExp(inlineVaribleRegex, 'g')) || [];

  let newValue = _.reduce(matches, (str, match) => {
    const parts = match.match(inlineVaribleRegex),
      variable = parts[1];

    if (variables[variable]) {
      return str.replace(match, variables[variable]);
    } else if (variableDefaults[variable]) {
      return str.replace(match, variableDefaults[variable]);
    } else {
      throw node.error(`$${variable} not defined!`, { word: `$${variable}`, index: getIndex(node, variable) });
    }
  }, node.value);

  node.value = newValue;
}

/**
 * if this node is a hoisted variable/default definition, remove it from the resulting css
 * @param  {object} node
 */
function removeHoistedDefinitions(node) {
  if (getHoistedProp(node)) {
    node.remove();
  }
}

module.exports = postcss.plugin('inline-variables', (variables = {}, options = {}) => {
  return (root) => {
    const filepath = _.get(root, 'source.input.file'),
      prefix = getRequiredPrefix(filepath, options.requirePrefix);

    let variableDefaults = {};

    root.walkDecls((node) => {
      // we do variables in two parts: first add defaults if the rule contains them,
      // then substitute variables. This means that defaults can be used in rules that
      // are BELOW them in the css file, but not above them
      // (that will throw a variable undefined error)
      handleHoistedDefault(node, variableDefaults, prefix, options.requireDefault);
      handleHoistedVariable(node, variables, prefix, options.requireDefault);
      handleInlineDefaults(node, variableDefaults, prefix, options.requireDefault);

      // replace variables in values
      if (hasVariables(node)) {
        checkPrefix(node, prefix); // make sure we catch variables that don't have defaults, just in case!
        // e.g. if the default was declared earlier in the file
        replaceValues(node, variables, variableDefaults);
      }

      // if the node is a hoisted definition, remove it
      removeHoistedDefinitions(node);
    });
  };
});
