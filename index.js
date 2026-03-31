const { tokenize } = require('./src/tokenizer');
const { parse: parseTokens, NodeType } = require('./src/parser');
const { generatePHP } = require('./src/generators/php');
const { generateJavaScript } = require('./src/generators/javascript');

/**
 * Parses an AMPScript source string and returns an object with methods to
 * convert the result into PHP or JavaScript.
 *
 * @param {string} input - The raw AMPScript source string.
 * @returns {{ ast: object, toPHP: () => string, toJavaScript: () => string, toString: () => string }} The parsed result with conversion methods.
 */
function parse(input) {
  const tokens = tokenize(input);
  const ast = parseTokens(tokens);

  return {
    ast,
    toPHP: () => generatePHP(ast),
    toJavaScript: () => generateJavaScript(ast),
    toString: () => input,
  };
}

module.exports = { parse, NodeType };
