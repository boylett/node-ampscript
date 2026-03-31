const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../index');

describe('parse', () => {
  it('returns an object with toPHP and toJavaScript methods', () => {
    const result = parse('%%[ SET @name = "hello" ]%%');

    assert.equal(typeof result.toPHP, 'function');
    assert.equal(typeof result.toJavaScript, 'function');
    assert.ok(result.ast);
  });
});

describe('SET statement', () => {
  const amp = parse('%%[ SET @greeting = "Hello World" ]%%');

  it('converts to PHP', () => {
    const php = amp.toPHP();

    assert.equal(php, "<?php\n$greeting = 'Hello World';\n?>");
  });

  it('converts to JavaScript', () => {
    const js = amp.toJavaScript();

    assert.equal(js, '(() => {\n  let greeting = "Hello World";\n})()');
  });
});

describe('IF statement', () => {
  const amp = parse('%%[ IF @age > 18 THEN SET @status = "adult" ELSE SET @status = "minor" ENDIF ]%%');

  it('converts to PHP', () => {
    const php = amp.toPHP();

    assert.ok(php.includes('if ($age > 18)'));
    assert.ok(php.includes("$status = 'adult'"));
    assert.ok(php.includes('} else {'));
    assert.ok(php.includes("$status = 'minor'"));
  });

  it('converts to JavaScript', () => {
    const js = amp.toJavaScript();

    assert.ok(js.includes('if (age > 18)'));
    assert.ok(js.includes('let status = "adult"'));
    assert.ok(js.includes('} else {'));
    assert.ok(js.includes('let status = "minor"'));
  });
});

describe('function calls', () => {
  const amp = parse('%%[ SET @name = Uppercase("hello") ]%%');

  it('maps Uppercase to strtoupper in PHP', () => {
    const php = amp.toPHP();

    assert.ok(php.includes("strtoupper('hello')"));
  });

  it('maps Uppercase to .toUpperCase() in JS', () => {
    const js = amp.toJavaScript();

    assert.ok(js.includes('"hello".toUpperCase()'));
  });
});

describe('output blocks', () => {
  const amp = parse('Hello %%=@name=%%, welcome!');

  it('converts to PHP with echo', () => {
    const php = amp.toPHP();

    assert.equal(php, 'Hello <?php echo $name; ?>, welcome!');
  });

  it('converts to JavaScript with template', () => {
    const js = amp.toJavaScript();

    assert.ok(js.includes('_out += name'));
  });
});

describe('FOR loop', () => {
  const amp = parse('%%[ FOR @i = 1 TO 5 DO SET @x = Add(@x, @i) NEXT ]%%');

  it('converts to PHP for loop', () => {
    const php = amp.toPHP();

    assert.ok(php.includes('for ($i = 1; $i <= 5; $i++)'));
    assert.ok(php.includes('($x + $i)'));
  });

  it('converts to JavaScript for loop', () => {
    const js = amp.toJavaScript();

    assert.ok(js.includes('for (let i = 1; i <= 5; i++)'));
    assert.ok(js.includes('(x + i)'));
  });
});

describe('Concat function', () => {
  const amp = parse('%%[ SET @full = Concat(@first, " ", @last) ]%%');

  it('converts to PHP implode', () => {
    const php = amp.toPHP();

    assert.ok(php.includes("implode('', [$first, ' ', $last])"));
  });

  it('converts to JS array join', () => {
    const js = amp.toJavaScript();

    assert.ok(js.includes('[first, " ", last].join(\'\')'));
  });
});

describe('plain text passthrough', () => {
  it('returns text as-is when no AMPScript blocks', () => {
    const amp = parse('<h1>Hello World</h1>');

    assert.equal(amp.toPHP(), '<h1>Hello World</h1>');
    assert.equal(amp.toJavaScript(), '<h1>Hello World</h1>');
  });
});

describe('comments', () => {
  it('strips comments from code blocks', () => {
    const amp = parse('%%[ /* this is a comment */ SET @x = 1 ]%%');
    const php = amp.toPHP();

    assert.ok(php.includes('$x = 1'));
    assert.ok(!php.includes('comment'));
  });

  it('strips inline comments between statements', () => {
    const amp = parse('%%[ SET @a = 1 /* middle comment */ SET @b = 2 ]%%');
    const php = amp.toPHP();

    assert.ok(php.includes('$a = 1'));
    assert.ok(php.includes('$b = 2'));
    assert.ok(!php.includes('middle'));
  });
});
