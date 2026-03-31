import { tokenize } from './tokenizer';
import { parse as parseTokens, NodeType } from './parser';
import { generatePHP } from './generators/php';
import { generateJavaScript } from './generators/javascript';
import type { ParseOptions, ParseResult, ProgramNode, ASTNode } from './types';

/**
 * Parses an AMPScript source string and returns an object with methods to
 * convert the result into PHP or JavaScript.
 *
 * @param {string} input - The raw AMPScript source string.
 * @param {ParseOptions} options - Optional configuration.
 * @returns {ParseResult} The parsed result with conversion methods.
 */
function parse(input: string, options: ParseOptions = {}): ParseResult {
  const tokens = tokenize(input);
  const ast = parseTokens(tokens);

  return {
    ast,
    toPHP: () => generatePHP(ast, options),
    toJavaScript: () => generateJavaScript(ast, options),
    toString: () => input,
  };
}

export { parse, NodeType };
export type { ParseOptions, ParseResult, ProgramNode, ASTNode };
