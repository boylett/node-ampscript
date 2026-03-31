import { Token, TokenType } from './tokenizer';
import type {
  ASTNode,
  ProgramNode,
  BlockNode,
  OutputBlockNode,
  SetStatementNode,
  VarDeclarationListNode,
  IfStatementNode,
  ForLoopNode,
  FunctionCallNode,
  StringLiteralNode,
  NumberLiteralNode,
  BooleanLiteralNode,
  BinaryExpressionNode,
  LogicalExpressionNode,
  NotExpressionNode,
  VariableNode,
  TextNode,
} from './types';

export const NodeType = {
  Program: 'Program',
  TextNode: 'TextNode',
  Block: 'Block',
  OutputBlock: 'OutputBlock',
  SetStatement: 'SetStatement',
  VarDeclaration: 'VarDeclaration',
  VarDeclarationList: 'VarDeclarationList',
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
} as const;

class Parser {
  private tokens: Token[];
  private pos: number;

  /**
   * Creates a new parser instance.
   *
   * @param {Token[]} tokens - The token stream to parse.
   */
  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  /**
   * Returns the current token without advancing.
   *
   * @returns {Token} The current token.
   */
  private peek(): Token {
    return this.tokens[this.pos];
  }

  /**
   * Returns the current token and advances to the next one.
   *
   * @returns {Token} The consumed token.
   */
  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;

    return token;
  }

  /**
   * Asserts the current token matches the expected type and consumes it.
   *
   * @param {string} type - The expected TokenType value.
   * @returns {Token} The consumed token.
   */
  private expect(type: string): Token {
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
  private skipComments(): void {
    while (this.peek().type === TokenType.COMMENT) {
      this.advance();
    }
  }

  /**
   * Parses the full token stream into a Program AST node.
   *
   * @returns {ProgramNode} The root AST node.
   */
  parse(): ProgramNode {
    const body: ASTNode[] = [];

    while (this.peek().type !== TokenType.EOF) {
      const token = this.peek();

      if (token.type === TokenType.TEXT) {
        body.push({ type: NodeType.TextNode, value: this.advance().value! } as TextNode);
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
   * @returns {BlockNode} The Block node.
   */
  private parseBlock(): BlockNode {
    this.expect(TokenType.BLOCK_OPEN);
    const statements: ASTNode[] = [];

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
   * @returns {OutputBlockNode} The OutputBlock node.
   */
  private parseOutputBlock(): OutputBlockNode {
    this.expect(TokenType.OUTPUT_OPEN);
    const expression = this.parseExpression();
    this.expect(TokenType.OUTPUT_CLOSE);

    return { type: NodeType.OutputBlock, expression };
  }

  /**
   * Dispatches to the appropriate statement parser based on the current token.
   *
   * @returns {ASTNode} An AST statement node.
   */
  private parseStatement(): ASTNode {
    this.skipComments();
    const token = this.peek();

    switch (token.type) {
      case TokenType.SET: {
        return this.parseSetStatement();
      }

      case TokenType.VAR: {
        return this.parseVarDeclarations();
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
   * @returns {SetStatementNode} The SetStatement node.
   */
  private parseSetStatement(): SetStatementNode {
    this.expect(TokenType.SET);
    const variable = this.expect(TokenType.VARIABLE);
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();

    return {
      type: NodeType.SetStatement,
      variable: variable.value!,
      value,
    };
  }

  /**
   * Parses one or more VAR declarations (e.g. VAR @a, @b, @c).
   *
   * @returns {VarDeclarationListNode} The VarDeclarationList node.
   */
  private parseVarDeclarations(): VarDeclarationListNode {
    this.expect(TokenType.VAR);
    const variables = [ this.expect(TokenType.VARIABLE).value! ];

    while (this.peek().type === TokenType.COMMA) {
      this.advance();
      variables.push(this.expect(TokenType.VARIABLE).value!);
    }

    return {
      type: NodeType.VarDeclarationList,
      variables,
    };
  }

  /**
   * Parses an IF / ELSEIF / ELSE / ENDIF control flow structure.
   *
   * @returns {IfStatementNode} The IfStatement node.
   */
  private parseIfStatement(): IfStatementNode {
    this.expect(TokenType.IF);
    const test = this.parseExpression();
    this.expect(TokenType.THEN);

    const consequent: ASTNode[] = [];

    while (
      this.peek().type !== TokenType.ELSE &&
      this.peek().type !== TokenType.ELSEIF &&
      this.peek().type !== TokenType.ENDIF &&
      this.peek().type !== TokenType.EOF
    ) {
      consequent.push(this.parseStatement());
    }

    const alternates: { test: ASTNode; body: ASTNode[] }[] = [];

    while (this.peek().type === TokenType.ELSEIF) {
      this.advance();
      const elseIfTest = this.parseExpression();
      this.expect(TokenType.THEN);
      const elseIfBody: ASTNode[] = [];

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

    let elseBody: ASTNode[] | null = null;

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
   * @returns {ForLoopNode} The ForLoop node.
   */
  private parseForLoop(): ForLoopNode {
    this.expect(TokenType.FOR);
    const variable = this.expect(TokenType.VARIABLE);
    this.expect(TokenType.ASSIGN);
    const start = this.parseExpression();
    this.expect(TokenType.TO);
    const end = this.parseExpression();
    this.expect(TokenType.DO);

    const body: ASTNode[] = [];

    while (this.peek().type !== TokenType.NEXT && this.peek().type !== TokenType.EOF) {
      body.push(this.parseStatement());
    }

    this.expect(TokenType.NEXT);

    return {
      type: NodeType.ForLoop,
      variable: variable.value!,
      start,
      end,
      body,
    };
  }

  /**
   * Entry point for expression parsing, starting with the lowest-precedence OR.
   *
   * @returns {ASTNode} An expression AST node.
   */
  private parseExpression(): ASTNode {
    return this.parseOr();
  }

  /**
   * Parses OR logical expressions.
   *
   * @returns {ASTNode} An expression AST node.
   */
  private parseOr(): ASTNode {
    let left = this.parseAnd();

    while (this.peek().type === TokenType.OR) {
      this.advance();
      const right = this.parseAnd();
      left = { type: NodeType.LogicalExpression, operator: 'OR', left, right } as LogicalExpressionNode;
    }

    return left;
  }

  /**
   * Parses AND logical expressions.
   *
   * @returns {ASTNode} An expression AST node.
   */
  private parseAnd(): ASTNode {
    let left = this.parseNot();

    while (this.peek().type === TokenType.AND) {
      this.advance();
      const right = this.parseNot();
      left = { type: NodeType.LogicalExpression, operator: 'AND', left, right } as LogicalExpressionNode;
    }

    return left;
  }

  /**
   * Parses a NOT unary prefix expression.
   *
   * @returns {ASTNode} An expression AST node.
   */
  private parseNot(): ASTNode {
    if (this.peek().type === TokenType.NOT) {
      this.advance();
      const operand = this.parseComparison();

      return { type: NodeType.NotExpression, operand } as NotExpressionNode;
    }

    return this.parseComparison();
  }

  /**
   * Parses comparison operators (==, !=, <, >, <=, >=).
   *
   * @returns {ASTNode} An expression AST node.
   */
  private parseComparison(): ASTNode {
    let left = this.parsePrimary();
    const opTypes = [ TokenType.EQ, TokenType.NEQ, TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE ];

    while (opTypes.includes(this.peek().type as any)) {
      const op = this.advance();
      const right = this.parsePrimary();
      left = { type: NodeType.BinaryExpression, operator: op.value!, left, right } as BinaryExpressionNode;
    }

    return left;
  }

  /**
   * Parses primary expressions: literals, variables, function calls, and
   * parenthesized sub-expressions.
   *
   * @returns {ASTNode} An expression AST node.
   */
  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);

      return expr;
    }

    if (token.type === TokenType.STRING) {
      this.advance();

      return { type: NodeType.StringLiteral, value: token.value! } as StringLiteralNode;
    }

    if (token.type === TokenType.NUMBER) {
      this.advance();

      return { type: NodeType.NumberLiteral, value: parseFloat(token.value!) } as NumberLiteralNode;
    }

    if (token.type === TokenType.BOOLEAN) {
      this.advance();

      return { type: NodeType.BooleanLiteral, value: token.value === 'true' } as BooleanLiteralNode;
    }

    if (token.type === TokenType.VARIABLE) {
      this.advance();

      return { type: NodeType.Variable, name: token.value! } as VariableNode;
    }

    if (token.type === TokenType.IDENTIFIER) {
      this.advance();

      if (this.peek().type === TokenType.LPAREN) {
        this.advance();
        const args: ASTNode[] = [];

        while (this.peek().type !== TokenType.RPAREN && this.peek().type !== TokenType.EOF) {
          args.push(this.parseExpression());

          if (this.peek().type === TokenType.COMMA) {
            this.advance();
          }
        }

        this.expect(TokenType.RPAREN);

        return { type: NodeType.FunctionCall, name: token.value!, args } as FunctionCallNode;
      }

      return { type: NodeType.FunctionCall, name: token.value!, args: [] } as FunctionCallNode;
    }

    throw new SyntaxError(
      `Unexpected token ${ token.type } ("${ token.value }") at position ${ token.pos }`
    );
  }
}

/**
 * Parses a token array into an AST.
 *
 * @param {Token[]} tokens - The token stream from the tokenizer.
 * @returns {ProgramNode} The root Program AST node.
 */
export function parse(tokens: Token[]): ProgramNode {
  const parser = new Parser(tokens);

  return parser.parse();
}
