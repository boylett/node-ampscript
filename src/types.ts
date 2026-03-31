export interface ParseOptions {
  inferFromURLParams?: boolean;
  type?: 'block' | 'inline';
}

export interface TextNode {
  type: 'TextNode';
  value: string;
}

export interface BlockNode {
  type: 'Block';
  body: ASTNode[];
}

export interface OutputBlockNode {
  type: 'OutputBlock';
  expression: ASTNode;
}

export interface SetStatementNode {
  type: 'SetStatement';
  variable: string;
  value: ASTNode;
}

export interface VarDeclarationNode {
  type: 'VarDeclaration';
  variable: string;
}

export interface VarDeclarationListNode {
  type: 'VarDeclarationList';
  variables: string[];
}

export interface IfStatementNode {
  type: 'IfStatement';
  test: ASTNode;
  consequent: ASTNode[];
  alternates: { test: ASTNode; body: ASTNode[] }[];
  elseBody: ASTNode[] | null;
}

export interface ForLoopNode {
  type: 'ForLoop';
  variable: string;
  start: ASTNode;
  end: ASTNode;
  body: ASTNode[];
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

export interface VariableNode {
  type: 'Variable';
  name: string;
}

export interface StringLiteralNode {
  type: 'StringLiteral';
  value: string;
}

export interface NumberLiteralNode {
  type: 'NumberLiteral';
  value: number;
}

export interface BooleanLiteralNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface BinaryExpressionNode {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface LogicalExpressionNode {
  type: 'LogicalExpression';
  operator: 'AND' | 'OR';
  left: ASTNode;
  right: ASTNode;
}

export interface NotExpressionNode {
  type: 'NotExpression';
  operand: ASTNode;
}

export interface ProgramNode {
  type: 'Program';
  body: ASTNode[];
}

export type ASTNode =
  | TextNode
  | BlockNode
  | OutputBlockNode
  | SetStatementNode
  | VarDeclarationNode
  | VarDeclarationListNode
  | IfStatementNode
  | ForLoopNode
  | FunctionCallNode
  | VariableNode
  | StringLiteralNode
  | NumberLiteralNode
  | BooleanLiteralNode
  | BinaryExpressionNode
  | LogicalExpressionNode
  | NotExpressionNode
  | ProgramNode;

export interface ParseResult {
  ast: ProgramNode;
  toPHP: () => string;
  toJavaScript: () => string;
  toString: () => string;
}
