import { tokenize } from './tokenizer';
import { parse as parseTokens, NodeType } from './parser';
import { generatePHP } from './generators/php';
import { generateJavaScript } from './generators/javascript';
import type { ParseOptions, ParseResult, ProgramNode, ASTNode } from './types';

/**
 * Detects whether the input contains AMPScript delimiters. If not, wraps the
 * raw code in the appropriate delimiters based on the inferred or explicit type.
 *
 * @param {string} input - The raw input string.
 * @param {ParseOptions} options - Parse options, including optional type override.
 * @returns {string} The input, possibly wrapped in %%[ ]%% or %%= =%% delimiters.
 */
function wrapIfNeeded(input: string, options: ParseOptions): string {
  const hasDelimiters = input.includes('%%[') || input.includes('%%=');

  if (hasDelimiters) {
    return input;
  }

  if (!options.type && !looksLikeAmpScript(input)) {
    return input;
  }

  const type = options.type ?? (input.includes('\n') ? 'block' : 'inline');

  if (type === 'inline') {
    return `%%=${ input }=%%`;
  }

  return `%%[\n${ input }\n]%%`;
}

const AMP_PATTERN = /^\s*(?:SET\s+@|VAR\s+@|IF\s|FOR\s+@|@\w)/i;

/**
 * Heuristic check for whether the input looks like raw AMPScript code
 * (as opposed to plain HTML or other text).
 *
 * @param {string} input - The raw input string.
 * @returns {boolean} True if the input appears to be AMPScript.
 */
function looksLikeAmpScript(input: string): boolean {
  return AMP_PATTERN.test(input);
}

/**
 * Parses an AMPScript source string and returns an object with methods to
 * convert the result into PHP or JavaScript.
 *
 * @param {string} input - The raw AMPScript source string.
 * @param {ParseOptions} options - Optional configuration.
 * @returns {ParseResult} The parsed result with conversion methods.
 */
function parse(input: string, options: ParseOptions = {}): ParseResult {
  const wrapped = wrapIfNeeded(input, options);
  const tokens = tokenize(wrapped);
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
