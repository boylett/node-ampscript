const { NodeType } = require('../parser');

let currentOptions = {};

const FUNCTION_MAP = {
  concat: { transform: (args) => `[${ args.join(', ') }].join('')` },
  substring: { name: 'substring', method: true },
  replace: { transform: (args) => `${ args[0] }.replace(${ args[1] }, ${ args[2] })` },
  length: { transform: (args) => `${ args[0] }.length` },
  uppercase: { transform: (args) => `${ args[0] }.toUpperCase()` },
  lowercase: { transform: (args) => `${ args[0] }.toLowerCase()` },
  trim: { transform: (args) => `${ args[0] }.trim()` },
  indexof: { transform: (args) => `${ args[0] }.indexOf(${ args[1] })` },

  add: { transform: (args) => `(${ args[0] } + ${ args[1] })` },
  subtract: { transform: (args) => `(${ args[0] } - ${ args[1] })` },
  multiply: { transform: (args) => `(${ args[0] } * ${ args[1] })` },
  divide: { transform: (args) => `(${ args[0] } / ${ args[1] })` },
  mod: { transform: (args) => `(${ args[0] } % ${ args[1] })` },

  now: { transform: () => 'new Date().toISOString()' },

  output: { transform: (args) => `console.log(${ args[0] })` },

  lookup: { name: 'ampscriptLookup' },
};

/**
 * Strips the leading @ from an AMPScript variable name.
 *
 * @param {string} name - The AMPScript variable name (e.g. "@foo").
 * @returns {string} The bare JavaScript identifier (e.g. "foo").
 */
function generateVariable(name) {
  return name.replace(/^@/, '');
}

/**
 * Generates a JavaScript expression string from an AST expression node.
 *
 * @param {object} node - An AST expression node.
 * @returns {string} The JavaScript expression source.
 */
function generateExpression(node) {
  switch (node.type) {
    case NodeType.StringLiteral: {
      return JSON.stringify(node.value);
    }

    case NodeType.NumberLiteral: {
      return String(node.value);
    }

    case NodeType.BooleanLiteral: {
      return node.value ? 'true' : 'false';
    }

    case NodeType.Variable: {
      return generateVariable(node.name);
    }

    case NodeType.FunctionCall: {
      return generateFunctionCall(node);
    }

    case NodeType.BinaryExpression: {
      return generateExpression(node.left) + ' ' + node.operator + ' ' + generateExpression(node.right);
    }

    case NodeType.LogicalExpression: {
      return generateExpression(node.left) + (node.operator === 'AND' ? ' && ' : ' || ') + generateExpression(node.right);
    }

    case NodeType.NotExpression: {
      return '!' + generateExpression(node.operand);
    }

    default: {
      return '/* unknown */';
    }
  }
}

/**
 * Generates JavaScript source for a function call, mapping known AMPScript
 * functions to idiomatic JS equivalents.
 *
 * @param {object} node - A FunctionCall AST node.
 * @returns {string} The JavaScript function call source.
 */
function generateFunctionCall(node) {
  if (currentOptions.inferFromURLParams && node.args.length === 0 && !FUNCTION_MAP[node.name.toLowerCase()]) {
    return "new URLSearchParams(window.location.search).get('" + node.name + "')";
  }

  const nameLower = node.name.toLowerCase();
  const args = node.args.map(generateExpression);
  const mapping = FUNCTION_MAP[nameLower];

  if (mapping) {
    if (mapping.transform) {
      return mapping.transform(args);
    }

    return mapping.name + '(' + args.join(', ') + ')';
  }

  const camel = node.name.charAt(0).toLowerCase() + node.name.slice(1);

  return camel + '(' + args.join(', ') + ')';
}

/**
 * Generates JavaScript source for an if/else if/else chain.
 *
 * @param {object} node - An IfStatement AST node.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The JavaScript if-block source.
 */
function generateIf(node, indent) {
  const pad = '  '.repeat(indent);
  let out = 'if (' + generateExpression(node.test) + ') {\n';
  out += generateStatements(node.consequent, indent + 1);
  out += pad + '}';

  for (const alt of node.alternates) {
    out += ' else if (' + generateExpression(alt.test) + ') {\n';
    out += generateStatements(alt.body, indent + 1);
    out += pad + '}';
  }

  if (node.elseBody) {
    out += ' else {\n';
    out += generateStatements(node.elseBody, indent + 1);
    out += pad + '}';
  }

  return out;
}

/**
 * Generates JavaScript source for a for loop.
 *
 * @param {object} node - A ForLoop AST node.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The JavaScript for-loop source.
 */
function generateFor(node, indent) {
  const pad = '  '.repeat(indent);
  const varName = generateVariable(node.variable);
  let out = `for (let ${ varName } = ${ generateExpression(node.start) }; ${ varName } <= ${ generateExpression(node.end) }; ${ varName }++) {\n`;
  out += generateStatements(node.body, indent + 1);
  out += pad + '}';

  return out;
}

/**
 * Generates JavaScript source for a single statement node.
 *
 * @param {object} node - An AST statement node.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The JavaScript statement source (without trailing newline).
 */
function generateStatement(node, indent) {
  switch (node.type) {
    case NodeType.SetStatement: {
      return 'let ' + generateVariable(node.variable) + ' = ' + generateExpression(node.value) + ';';
    }

    case NodeType.VarDeclaration: {
      return 'let ' + generateVariable(node.variable) + ';';
    }

    case NodeType.VarDeclarationList: {
      return node.variables.map((v) => 'let ' + generateVariable(v) + ';').join('\n' + '  '.repeat(indent));
    }

    case NodeType.IfStatement: {
      return generateIf(node, indent);
    }

    case NodeType.ForLoop: {
      return generateFor(node, indent);
    }

    case NodeType.FunctionCall: {
      return generateFunctionCall(node) + ';';
    }

    default: {
      return generateExpression(node) + ';';
    }
  }
}

/**
 * Generates JavaScript source for an array of statement nodes.
 *
 * @param {object[]} statements - The AST statement nodes.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The joined JavaScript statements with newlines.
 */
function generateStatements(statements, indent) {
  const pad = '  '.repeat(indent);

  return statements.map((s) => pad + generateStatement(s, indent) + '\n').join('');
}

/**
 * Converts a full Program AST into JavaScript source code. Pure code blocks
 * are wrapped in an IIFE; mixed text-and-code produces a template function.
 *
 * @param {{ type: string, body: object[] }} ast - The root Program AST node.
 * @param {object} [options] - Generator options.
 * @returns {string} The generated JavaScript source.
 */
function generateJavaScript(ast, options = {}) {
  currentOptions = options;
  const parts = [];

  for (const node of ast.body) {
    if (node.type === NodeType.TextNode) {
      parts.push({ kind: 'text', value: node.value });
    }

    else if (node.type === NodeType.Block) {
      parts.push({ kind: 'code', value: generateStatements(node.body, 1) });
    }

    else if (node.type === NodeType.OutputBlock) {
      parts.push({ kind: 'expr', value: generateExpression(node.expression) });
    }
  }

  const hasText = parts.some((p) => p.kind === 'text');
  const hasCode = parts.some((p) => p.kind === 'code' || p.kind === 'expr');

  if (!hasCode) {
    return parts.map((p) => p.value).join('');
  }

  if (!hasText) {
    const code = parts.map((p) => (p.kind === 'expr' ? '  return ' + p.value + ';\n' : p.value)).join('');

    return '(() => {\n' + code + '})()';
  }

  let out = '(() => {\n  let _out = "";\n';

  for (const part of parts) {
    if (part.kind === 'text') {
      out += '  _out += ' + JSON.stringify(part.value) + ';\n';
    }

    else if (part.kind === 'expr') {
      out += '  _out += ' + part.value + ';\n';
    }

    else {
      out += part.value;
    }
  }

  out += '  return _out;\n})()';

  return out;
}

module.exports = { generateJavaScript };
