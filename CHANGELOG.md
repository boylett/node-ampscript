# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-03-31

### Added

- Input without `%%[ ]%%` or `%%= =%%` delimiters is now auto-wrapped: single-line inputs are treated as inline (output) expressions, multiline inputs as code blocks
- `options.type` (`'block'` | `'inline'`) to override the auto-detection
- `inferFromURLParams` option for `parse()` — bare identifiers in SET statements become `$_GET['...']` in PHP and `new URLSearchParams(window.location.search).get('...')` in JavaScript
- `toString()` method on the parse result, returning the original input string
- Support for multi-variable VAR declarations (`VAR @A, @B, @C`)
- Full TypeScript rewrite with type declarations (`.d.ts`) and source maps
- Exported types: `ParseOptions`, `ParseResult`, `ProgramNode`, `ASTNode`

## [0.1.0] - 2026-03-31

### Added

- AMPScript tokenizer with support for code blocks (`%%[ ]%%`), output blocks (`%%= =%%`), variables, strings, numbers, booleans, operators, and keywords
- Recursive descent parser producing a full AST
- PHP code generator with function mappings for common AMPScript builtins
- JavaScript code generator wrapping output in IIFEs with idiomatic JS mappings
- `parse()` entry point returning an object with `toPHP()` and `toJavaScript()` methods
- Support for `SET`, `VAR`, `IF/ELSEIF/ELSE/ENDIF`, and `FOR/TO/DO/NEXT` statements
- Support for `/* ... */` block comments inside code blocks
- Plain text passthrough for input without AMPScript blocks
- Test suite covering all major features

[0.1.1]: https://github.com/boylett/node-ampscript/releases/tag/v0.1.1
[0.1.0]: https://github.com/boylett/node-ampscript/releases/tag/v0.1.0
