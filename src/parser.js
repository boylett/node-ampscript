const { TokenType } = require('./tokenizer');

const NodeType = {
  Program: 'Program',
  TextNode: 'TextNode',
  Block: 'Block',
  OutputBlock: 'OutputBlock',
  SetStatement: 'SetStatement',
  VarDeclaration: 'VarDeclaration',
  IfStatement: 'IfStatement',
  ForLoop: 'ForLoop',
  FunctionCall: 'FunctionCall',
  Variable: 'Variable',
  StringLiteral: 'StringLiteral',
  NumberLiteral: 'NumberLiteral',
  BooleanLiteral: 'BooleanLiteral',
  BinaryExpression: 'BinaryExpression',
  LogicalExpression: 'LogicalExpression',
  NotExpression: 'NotExpression',
  Comment: 'Comment',
};

class Parser {
  /**
   * Creates a new parser instance.
   *
   * @param {import('./tokenizer').Token[]} tokens - The token stream to parse.
   */
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  /**
   * Returns the current token without advancing.
   *
   * @returns {import('./tokenizer').Token} The current token.
   */
  peek() {
    return this.tokens[this.pos];
  }

  /**
   * Returns the current token and advances to the next one.
   *
   * @returns {import('./tokenizer').Token} The consumed token.
   */
  advance() {
    const token = this.tokens[this.pos];
    this.pos++;

    return token;
  }

  /**
   * Asserts the current token matches the expected type and consumes it.
   *
   * @param {string} type - The expected TokenType value.
   * @returns {import('./tokenizer').Token} The consumed token.
   */
  expect(type) {
    const token = this.peek();

    if (token.type !== type) {
      throw new SyntaxError(
        `Expected ${ type } but got ${ token.type } ("${ token.value }") at position ${ token.pos }`
      );
    }

    return this.advance();
  }

  /**
   * Skips over any comment tokens at the current position.
   */
  skipComments() {
    while (this.peek().type === TokenType.COMMENT) {
      this.advance();
    }
  }

  /**
   * Parses the full token stream into a Program AST node.
   *
   * @returns {{ type: string, body: object[] }} The root AST node.
   */
  parse() {
    const body = [];

    while (this.peek().type !== TokenType.EOF) {
      const token = this.peek();

      if (token.type === TokenType.TEXT) {
        body.push({ type: NodeType.TextNode, value: this.advance().value });
      }

      else if (token.type === TokenType.BLOCK_OPEN) {
        body.push(this.parseBlock());
      }

      else if (token.type === TokenType.OUTPUT_OPEN) {
        body.push(this.parseOutputBlock());
      }

      else {
        this.advance();
      }
    }

    return { type: NodeType.Program, body };
  }

  /**
   * Parses a %%[ ... ]%% code block into a Block AST node.
   *
   * @returns {{ type: string, body: object[] }} The Block node.
   */
  parseBlock() {
    this.expect(TokenType.BLOCK_OPEN);
    const statements = [];

    this.skipComments();

    while (this.peek().type !== TokenType.BLOCK_CLOSE && this.peek().type !== TokenType.EOF) {
      statements.push(this.parseStatement());
      this.skipComments();
    }

    this.expect(TokenType.BLOCK_CLOSE);

    return { type: NodeType.Block, body: statements };
  }

  /**
   * Parses a %%= ... =%% inline output expression.
   *
   * @returns {{ type: string, expression: object }} The OutputBlock node.
   */
  parseOutputBlock() {
    this.expect(TokenType.OUTPUT_OPEN);
    const expression = this.parseExpression();
    this.expect(TokenType.OUTPUT_CLOSE);

    return { type: NodeType.OutputBlock, expression };
  }

  /**
   * Dispatches to the appropriate statement parser based on the current token.
   *
   * @returns {object} An AST statement node.
   */
  parseStatement() {
    this.skipComments();
    const token = this.peek();

    switch (token.type) {
      case TokenType.SET: {
        return this.parseSetStatement();
      }

      case TokenType.VAR: {
        return this.parseVarDeclaration();
      }

      case TokenType.IF: {
        return this.parseIfStatement();
      }

      case TokenType.FOR: {
        return this.parseForLoop();
      }

      default: {
        return this.parseExpression();
      }
    }
  }

  /**
   * Parses a SET @var = expr assignment statement.
   *
   * @returns {{ type: string, variable: string, value: object }} The SetStatement node.
   */
  parseSetStatement() {
    this.expect(TokenType.SET);
    const variable = this.expect(TokenType.VARIABLE);
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();

    return {
      type: NodeType.SetStatement,
      variable: variable.value,
      value,
    };
  }

  /**
   * Parses a VAR @name declaration.
   *
   * @returns {{ type: string, variable: string }} The VarDeclaration node.
   */
  parseVarDeclaration() {
    this.expect(TokenType.VAR);
    const variable = this.expect(TokenType.VARIABLE);

    return {
      type: NodeType.VarDeclaration,
      variable: variable.value,
    };
  }

  /**
   * Parses an IF / ELSEIF / ELSE / ENDIF control flow structure.
   *
   * @returns {{ type: string, test: object, consequent: object[], alternates: object[], elseBody: object[]|null }} The IfStatement node.
   */
  parseIfStatement() {
    this.expect(TokenType.IF);
    const test = this.parseExpression();
    this.expect(TokenType.THEN);

    const consequent = [];

    while (
      this.peek().type !== TokenType.ELSE &&
      this.peek().type !== TokenType.ELSEIF &&
      this.peek().type !== TokenType.ENDIF &&
      this.peek().type !== TokenType.EOF
    ) {
      consequent.push(this.parseStatement());
    }

    const alternates = [];

    while (this.peek().type === TokenType.ELSEIF) {
      this.advance();
      const elseIfTest = this.parseExpression();
      this.expect(TokenType.THEN);
      const elseIfBody = [];

      while (
        this.peek().type !== TokenType.ELSE &&
        this.peek().type !== TokenType.ELSEIF &&
        this.peek().type !== TokenType.ENDIF &&
        this.peek().type !== TokenType.EOF
      ) {
        elseIfBody.push(this.parseStatement());
      }

      alternates.push({ test: elseIfTest, body: elseIfBody });
    }

    let elseBody = null;

    if (this.peek().type === TokenType.ELSE) {
      this.advance();
      elseBody = [];

      while (this.peek().type !== TokenType.ENDIF && this.peek().type !== TokenType.EOF) {
        elseBody.push(this.parseStatement());
      }
    }

    this.expect(TokenType.ENDIF);

    return {
      type: NodeType.IfStatement,
      test,
      consequent,
      alternates,
      elseBody,
    };
  }

  /**
   * Parses a FOR @i = start TO end DO ... NEXT loop.
   *
   * @returns {{ type: string, variable: string, start: object, end: object, body: object[] }} The ForLoop node.
   */
  parseForLoop() {
    this.expect(TokenType.FOR);
    const variable = this.expect(TokenType.VARIABLE);
    this.expect(TokenType.ASSIGN);
    const start = this.parseExpression();
    this.expect(TokenType.TO);
    const end = this.parseExpression();
    this.expect(TokenType.DO);

    const body = [];

    while (this.peek().type !== TokenType.NEXT && this.peek().type !== TokenType.EOF) {
      body.push(this.parseStatement());
    }

    this.expect(TokenType.NEXT);

    return {
      type: NodeType.ForLoop,
      variable: variable.value,
      start,
      end,
      body,
    };
  }

  /**
   * Entry point for expression parsing, starting with the lowest-precedence OR.
   *
   * @returns {object} An expression AST node.
   */
  parseExpression() {
    return this.parseOr();
  }

  /**
   * Parses OR logical expressions.
   *
   * @returns {object} An expression AST node.
   */
  parseOr() {
    let left = this.parseAnd();

    while (this.peek().type === TokenType.OR) {
      this.advance();
      const right = this.parseAnd();
      left = { type: NodeType.LogicalExpression, operator: 'OR', left, right };
    }

    return left;
  }

  /**
   * Parses AND logical expressions.
   *
   * @returns {object} An expression AST node.
   */
  parseAnd() {
    let left = this.parseNot();

    while (this.peek().type === TokenType.AND) {
      this.advance();
      const right = this.parseNot();
      left = { type: NodeType.LogicalExpression, operator: 'AND', left, right };
    }

    return left;
  }

  /**
   * Parses a NOT unary prefix expression.
   *
   * @returns {object} An expression AST node.
   */
  parseNot() {
    if (this.peek().type === TokenType.NOT) {
      this.advance();
      const operand = this.parseComparison();

      return { type: NodeType.NotExpression, operand };
    }

    return this.parseComparison();
  }

  /**
   * Parses comparison operators (==, !=, <, >, <=, >=).
   *
   * @returns {object} An expression AST node.
   */
  parseComparison() {
    let left = this.parsePrimary();
    const opTypes = [ TokenType.EQ, TokenType.NEQ, TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE ];

    while (opTypes.includes(this.peek().type)) {
      const op = this.advance();
      const right = this.parsePrimary();
      left = { type: NodeType.BinaryExpression, operator: op.value, left, right };
    }

    return left;
  }

  /**
   * Parses primary expressions: literals, variables, function calls, and
   * parenthesized sub-expressions.
   *
   * @returns {object} An expression AST node.
   */
  parsePrimary() {
    const token = this.peek();

    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);

      return expr;
    }

    if (token.type === TokenType.STRING) {
      this.advance();

      return { type: NodeType.StringLiteral, value: token.value };
    }

    if (token.type === TokenType.NUMBER) {
      this.advance();

      return { type: NodeType.NumberLiteral, value: parseFloat(token.value) };
    }

    if (token.type === TokenType.BOOLEAN) {
      this.advance();

      return { type: NodeType.BooleanLiteral, value: token.value === 'true' };
    }

    if (token.type === TokenType.VARIABLE) {
      this.advance();

      return { type: NodeType.Variable, name: token.value };
    }

    if (token.type === TokenType.IDENTIFIER) {
      this.advance();

      if (this.peek().type === TokenType.LPAREN) {
        this.advance();
        const args = [];

        while (this.peek().type !== TokenType.RPAREN && this.peek().type !== TokenType.EOF) {
          args.push(this.parseExpression());

          if (this.peek().type === TokenType.COMMA) {
            this.advance();
          }
        }

        this.expect(TokenType.RPAREN);

        return { type: NodeType.FunctionCall, name: token.value, args };
      }

      return { type: NodeType.FunctionCall, name: token.value, args: [] };
    }

    throw new SyntaxError(
      `Unexpected token ${ token.type } ("${ token.value }") at position ${ token.pos }`
    );
  }
}

/**
 * Parses a token array into an AST.
 *
 * @param {import('./tokenizer').Token[]} tokens - The token stream from the tokenizer.
 * @returns {{ type: string, body: object[] }} The root Program AST node.
 */
function parse(tokens) {
  const parser = new Parser(tokens);

  return parser.parse();
}

module.exports = { parse, NodeType };
