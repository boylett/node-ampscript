# node-ampscript

Parse AMPScript and convert it to PHP, JavaScript, and more.

[AMPScript](https://ampscript.guide/) is the scripting language used in Salesforce Marketing Cloud. This library tokenizes and parses AMPScript source into an AST, then generates equivalent code in other languages.

## Install

```bash
npm install node-ampscript
```

## Usage

```ts
import { parse } from 'node-ampscript';
// or: const { parse } = require('node-ampscript');

const amp = parse('%%[ SET @greeting = "Hello World" ]%%');

amp.toPHP();
// <?php
// $greeting = 'Hello World';
// ?>

amp.toJavaScript();
// (() => {
//   let greeting = "Hello World";
// })()
```

### Output blocks

Inline output expressions are also supported:

```js
const amp = parse('Hello %%=@name=%%, welcome!');

amp.toPHP();        // Hello <?php echo $name; ?>, welcome!
amp.toJavaScript(); // (() => { let _out = ""; ... return _out; })()
```

### Plain text passthrough

Input without any AMPScript blocks is returned as-is:

```js
parse('<h1>Hello</h1>').toPHP(); // <h1>Hello</h1>
```

## Supported AMPScript features

- **Variables** — `SET @name = value`, `VAR @name`
- **Control flow** — `IF / ELSEIF / ELSE / ENDIF`
- **Loops** — `FOR @i = 1 TO 10 DO ... NEXT`
- **Functions** — built-in function calls like `Concat()`, `Uppercase()`, `Add()`, etc.
- **Output blocks** — `%%=@variable=%%` inline expressions
- **Comments** — `/* ... */` block comments inside code blocks
- **Operators** — `==`, `!=`, `<`, `>`, `<=`, `>=`, `AND`, `OR`, `NOT`

## Function mappings

Common AMPScript functions are mapped to native equivalents:

| AMPScript | PHP | JavaScript |
| --- | --- | --- |
| `Concat(a, b)` | `implode('', [$a, $b])` | `[a, b].join('')` |
| `Uppercase(s)` | `strtoupper($s)` | `s.toUpperCase()` |
| `Lowercase(s)` | `strtolower($s)` | `s.toLowerCase()` |
| `Length(s)` | `strlen($s)` | `s.length` |
| `Trim(s)` | `trim($s)` | `s.trim()` |
| `Add(a, b)` | `($a + $b)` | `(a + b)` |
| `Now()` | `date('Y-m-d H:i:s')` | `new Date().toISOString()` |

Unmapped functions are passed through with their original name.

## API

### `parse(input, options?)`

Parses an AMPScript source string and returns a result object.

**Parameters:**
- `input` (string) — the raw AMPScript source
- `options` (object, optional) — configuration options
  - `inferFromURLParams` (boolean) — when `true`, bare identifiers in SET statements (e.g. `SET @Name = Name`) are treated as URL parameter lookups instead of function calls

**Returns** an object with:
- `ast` — the abstract syntax tree
- `toPHP()` — generates PHP source code
- `toJavaScript()` — generates JavaScript source code
- `toString()` — returns the original input string

### `inferFromURLParams` option

In AMPScript, `SET @FirstName = FirstName` retrieves a subscriber attribute. When converting to PHP or JavaScript, there's no direct equivalent — but URL parameters are a common stand-in for testing or web contexts.

```js
const amp = parse('%%[ SET @FirstName = FirstName ]%%', {
  inferFromURLParams: true,
});

amp.toPHP();
// <?php
// $FirstName = $_GET['FirstName'];
// ?>

amp.toJavaScript();
// (() => {
//   let FirstName = new URLSearchParams(window.location.search).get('FirstName');
// })()
```

Without the option, bare identifiers are treated as zero-argument function calls.

## TypeScript

This library is written in TypeScript and ships with full type declarations. Exported types:

```ts
import type { ParseOptions, ParseResult, ProgramNode, ASTNode } from 'node-ampscript';
```

## Development

```bash
npm run build   # compile TypeScript to dist/
npm test        # build + run tests
```

## License

ISC
