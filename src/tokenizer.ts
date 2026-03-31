export const TokenType = {
  BLOCK_OPEN: 'BLOCK_OPEN',
  BLOCK_CLOSE: 'BLOCK_CLOSE',
  OUTPUT_OPEN: 'OUTPUT_OPEN',
  OUTPUT_CLOSE: 'OUTPUT_CLOSE',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',

  EQ: 'EQ',
  NEQ: 'NEQ',
  LT: 'LT',
  GT: 'GT',
  LTE: 'LTE',
  GTE: 'GTE',

  SET: 'SET',
  VAR: 'VAR',
  IF: 'IF',
  THEN: 'THEN',
  ELSEIF: 'ELSEIF',
  ELSE: 'ELSE',
  ENDIF: 'ENDIF',
  FOR: 'FOR',
  TO: 'TO',
  DO: 'DO',
  NEXT: 'NEXT',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',

  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  VARIABLE: 'VARIABLE',
  IDENTIFIER: 'IDENTIFIER',
  COMMENT: 'COMMENT',

  ASSIGN: 'ASSIGN',
  TEXT: 'TEXT',
  EOF: 'EOF',
} as const;

export type TokenTypeValue = typeof TokenType[keyof typeof TokenType];

const KEYWORD_MAP: Record<string, TokenTypeValue> = {
  set: TokenType.SET,
  var: TokenType.VAR,
  if: TokenType.IF,
  then: TokenType.THEN,
  elseif: TokenType.ELSEIF,
  else: TokenType.ELSE,
  endif: TokenType.ENDIF,
  for: TokenType.FOR,
  to: TokenType.TO,
  do: TokenType.DO,
  next: TokenType.NEXT,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
};

export class Token {
  type: TokenTypeValue;
  value: string | null;
  pos: number;

  /**
   * Creates a new token.
   *
   * @param {TokenTypeValue} type - One of the TokenType constants.
   * @param {string | null} value - The raw string value of the token.
   * @param {number} pos - The character offset in the source input.
   */
  constructor(type: TokenTypeValue, value: string | null, pos: number) {
    this.type = type;
    this.value = value;
    this.pos = pos;
  }
}

/**
 * Scans backwards through existing tokens to determine whether the current
 * position falls inside an open AMPScript block.
 *
 * @param {Token[]} tokens - The tokens collected so far.
 * @returns {boolean} True when inside an unclosed block or output expression.
 */
function isInsideBlock(tokens: Token[]): boolean {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].type;

    if (t === TokenType.BLOCK_OPEN || t === TokenType.OUTPUT_OPEN) {
      return true;
    }

    if (t === TokenType.BLOCK_CLOSE || t === TokenType.OUTPUT_CLOSE) {
      return false;
    }
  }

  return false;
}

/**
 * Tokenizes an AMPScript source string into an array of tokens.
 *
 * @param {string} input - The raw AMPScript source.
 * @returns {Token[]} An ordered list of tokens ending with EOF.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    if (input[i] === '%' && input[i + 1] === '%' && input[i + 2] === '[') {
      tokens.push(new Token(TokenType.BLOCK_OPEN, '%%[', i));
      i += 3;
      continue;
    }

    if (input[i] === '%' && input[i + 1] === '%' && input[i + 2] === '=') {
      tokens.push(new Token(TokenType.OUTPUT_OPEN, '%%=', i));
      i += 3;
      continue;
    }

    if (!isInsideBlock(tokens)) {
      const textStart = i;

      while (i < input.length) {
        if (input[i] === '%' && input[i + 1] === '%' && (input[i + 2] === '[' || input[i + 2] === '=')) {
          break;
        }

        i++;
      }

      if (i > textStart) {
        tokens.push(new Token(TokenType.TEXT, input.slice(textStart, i), textStart));
      }

      continue;
    }

    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // Block-level comments: /* ... */
    if (input[i] === '/' && input[i + 1] === '*') {
      const start = i;
      i += 2;

      while (i < input.length - 1 && !(input[i] === '*' && input[i + 1] === '/')) {
        i++;
      }

      i += 2;
      tokens.push(new Token(TokenType.COMMENT, input.slice(start, i), start));
      continue;
    }

    if (input[i] === ']' && input[i + 1] === '%' && input[i + 2] === '%') {
      tokens.push(new Token(TokenType.BLOCK_CLOSE, ']%%', i));
      i += 3;
      continue;
    }

    if (input[i] === '=' && input[i + 1] === '%' && input[i + 2] === '%') {
      tokens.push(new Token(TokenType.OUTPUT_CLOSE, '=%%', i));
      i += 3;
      continue;
    }

    if (input[i] === '!' && input[i + 1] === '=') {
      tokens.push(new Token(TokenType.NEQ, '!=', i));
      i += 2;
      continue;
    }

    if (input[i] === '<' && input[i + 1] === '=') {
      tokens.push(new Token(TokenType.LTE, '<=', i));
      i += 2;
      continue;
    }

    if (input[i] === '>' && input[i + 1] === '=') {
      tokens.push(new Token(TokenType.GTE, '>=', i));
      i += 2;
      continue;
    }

    if (input[i] === '=' && input[i + 1] === '=') {
      tokens.push(new Token(TokenType.EQ, '==', i));
      i += 2;
      continue;
    }

    if (input[i] === '=') {
      tokens.push(new Token(TokenType.ASSIGN, '=', i));
      i++;
      continue;
    }

    if (input[i] === '<') {
      tokens.push(new Token(TokenType.LT, '<', i));
      i++;
      continue;
    }

    if (input[i] === '>') {
      tokens.push(new Token(TokenType.GT, '>', i));
      i++;
      continue;
    }

    if (input[i] === '(') {
      tokens.push(new Token(TokenType.LPAREN, '(', i));
      i++;
      continue;
    }

    if (input[i] === ')') {
      tokens.push(new Token(TokenType.RPAREN, ')', i));
      i++;
      continue;
    }

    if (input[i] === ',') {
      tokens.push(new Token(TokenType.COMMA, ',', i));
      i++;
      continue;
    }

    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i];
      const start = i;
      i++;
      let str = '';

      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          str += input[i + 1];
          i += 2;
        }

        else {
          str += input[i];
          i++;
        }
      }

      if (i < input.length) {
        i++;
      }

      tokens.push(new Token(TokenType.STRING, str, start));
      continue;
    }

    if (/[0-9]/.test(input[i]) || (input[i] === '-' && /[0-9]/.test(input[i + 1]))) {
      const start = i;

      if (input[i] === '-') {
        i++;
      }

      while (i < input.length && /[0-9.]/.test(input[i])) {
        i++;
      }

      tokens.push(new Token(TokenType.NUMBER, input.slice(start, i), start));
      continue;
    }

    if (input[i] === '@') {
      const start = i;
      i++;

      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        i++;
      }

      tokens.push(new Token(TokenType.VARIABLE, input.slice(start, i), start));
      continue;
    }

    if (/[a-zA-Z_]/.test(input[i])) {
      const start = i;

      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        i++;
      }

      const word = input.slice(start, i);
      const lower = word.toLowerCase();

      if (lower === 'true' || lower === 'false') {
        tokens.push(new Token(TokenType.BOOLEAN, lower, start));
      }

      else if (KEYWORD_MAP[lower]) {
        tokens.push(new Token(KEYWORD_MAP[lower], word, start));
      }

      else {
        tokens.push(new Token(TokenType.IDENTIFIER, word, start));
      }

      continue;
    }

    i++;
  }

  tokens.push(new Token(TokenType.EOF, null, i));

  return tokens;
}
