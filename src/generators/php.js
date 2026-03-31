const { NodeType } = require('../parser');

const FUNCTION_MAP = {
  concat: { name: 'implode', transform: (args) => `implode('', [${ args.join(', ') }])` },
  substring: { name: 'substr' },
  replace: { name: 'str_replace' },
  length: { name: 'strlen' },
  uppercase: { name: 'strtoupper' },
  lowercase: { name: 'strtolower' },
  trim: { name: 'trim' },
  indexof: { name: 'strpos' },

  add: { transform: (args) => `(${ args[0] } + ${ args[1] })` },
  subtract: { transform: (args) => `(${ args[0] } - ${ args[1] })` },
  multiply: { transform: (args) => `(${ args[0] } * ${ args[1] })` },
  divide: { transform: (args) => `(${ args[0] } / ${ args[1] })` },
  mod: { transform: (args) => `(${ args[0] } % ${ args[1] })` },

  now: { name: 'date', transform: () => "date('Y-m-d H:i:s')" },
  formatdate: { name: 'date' },

  output: { transform: (args) => `echo ${ args[0] }` },

  lookup: { name: 'ampscript_lookup' },
};

/**
 * Converts a variable name from AMPScript @-prefix to PHP $-prefix.
 *
 * @param {string} name - The AMPScript variable name (e.g. "@foo").
 * @returns {string} The PHP variable name (e.g. "$foo").
 */
function generateVariable(name) {
  return '$' + name.replace(/^@/, '');
}

/**
 * Generates a PHP expression string from an AST expression node.
 *
 * @param {object} node - An AST expression node.
 * @returns {string} The PHP expression source.
 */
function generateExpression(node) {
  switch (node.type) {
    case NodeType.StringLiteral: {
      return "'" + node.value.replace(/'/g, "\\'") + "'";
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
 * Generates PHP source for a function call, mapping known AMPScript functions
 * to their PHP equivalents.
 *
 * @param {object} node - A FunctionCall AST node.
 * @returns {string} The PHP function call source.
 */
function generateFunctionCall(node) {
  const nameLower = node.name.toLowerCase();
  const args = node.args.map(generateExpression);
  const mapping = FUNCTION_MAP[nameLower];

  if (mapping) {
    if (mapping.transform) {
      return mapping.transform(args);
    }

    return mapping.name + '(' + args.join(', ') + ')';
  }

  return node.name + '(' + args.join(', ') + ')';
}

/**
 * Generates PHP source for an if/elseif/else chain.
 *
 * @param {object} node - An IfStatement AST node.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The PHP if-block source.
 */
function generateIf(node, indent) {
  const pad = '  '.repeat(indent);
  let out = 'if (' + generateExpression(node.test) + ') {\n';
  out += generateStatements(node.consequent, indent + 1);
  out += pad + '}';

  for (const alt of node.alternates) {
    out += ' elseif (' + generateExpression(alt.test) + ') {\n';
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
 * Generates PHP source for a for loop.
 *
 * @param {object} node - A ForLoop AST node.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The PHP for-loop source.
 */
function generateFor(node, indent) {
  const pad = '  '.repeat(indent);
  const varName = generateVariable(node.variable);
  let out = `for (${ varName } = ${ generateExpression(node.start) }; ${ varName } <= ${ generateExpression(node.end) }; ${ varName }++) {\n`;
  out += generateStatements(node.body, indent + 1);
  out += pad + '}';

  return out;
}

/**
 * Generates PHP source for a single statement node.
 *
 * @param {object} node - An AST statement node.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The PHP statement source (without trailing newline).
 */
function generateStatement(node, indent) {
  switch (node.type) {
    case NodeType.SetStatement: {
      return generateVariable(node.variable) + ' = ' + generateExpression(node.value) + ';';
    }

    case NodeType.VarDeclaration: {
      return generateVariable(node.variable) + ' = null;';
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
 * Generates PHP source for an array of statement nodes.
 *
 * @param {object[]} statements - The AST statement nodes.
 * @param {number} indent - The current indentation depth.
 * @returns {string} The joined PHP statements with newlines.
 */
function generateStatements(statements, indent) {
  const pad = '  '.repeat(indent);

  return statements.map((s) => pad + generateStatement(s, indent) + '\n').join('');
}

/**
 * Converts a full Program AST into PHP source code.
 *
 * @param {{ type: string, body: object[] }} ast - The root Program AST node.
 * @returns {string} The generated PHP source.
 */
function generatePHP(ast) {
  const parts = [];

  for (const node of ast.body) {
    if (node.type === NodeType.TextNode) {
      parts.push(node.value);
    }

    else if (node.type === NodeType.Block) {
      parts.push('<?php\n' + generateStatements(node.body, 0) + '?>');
    }

    else if (node.type === NodeType.OutputBlock) {
      parts.push('<?php echo ' + generateExpression(node.expression) + '; ?>');
    }
  }

  return parts.join('');
}

module.exports = { generatePHP };
