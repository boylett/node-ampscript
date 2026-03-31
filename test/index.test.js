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

describe('robust multi-feature block', () => {
  const input = [
    '%%[',
    "var @Poll, @ReturnPath",
    "set @Poll = RequestedPollId()",
    "",
    "if @Poll == '12345'",
    "then",
    "  /* Staging */",
    "  set @ReturnPath = '/polls/12345'",
    "else",
    "  /* Production */",
    "  set @ReturnPath = '/polls/new'",
    "endif",
    "",
    "Set @FirstName = FirstName",
    ']%%',
  ].join('\n');

  const amp = parse(input);

  it('converts to PHP with var declarations, function call, if/else, and comments stripped', () => {
    const php = amp.toPHP();

    assert.ok(php.includes('$Poll = null;'));
    assert.ok(php.includes('$ReturnPath = null;'));
    assert.ok(php.includes('$Poll = RequestedPollId();'));
    assert.ok(php.includes("if ($Poll == '12345')"));
    assert.ok(php.includes("$ReturnPath = '/polls/12345';"));
    assert.ok(php.includes('} else {'));
    assert.ok(php.includes("$ReturnPath = '/polls/new';"));
    assert.ok(php.includes('$FirstName = FirstName();'));
    assert.ok(!php.includes('Staging'));
    assert.ok(!php.includes('Production'));
  });

  it('converts to JavaScript with all features intact', () => {
    const js = amp.toJavaScript();

    assert.ok(js.includes('let Poll;'));
    assert.ok(js.includes('let ReturnPath;'));
    assert.ok(js.includes('let Poll = requestedPollId();'));
    assert.ok(js.includes('if (Poll == "12345")'));
    assert.ok(js.includes('let ReturnPath = "/polls/12345";'));
    assert.ok(js.includes('} else {'));
    assert.ok(js.includes('let ReturnPath = "/polls/new";'));
    assert.ok(js.includes('let FirstName = firstName();'));
    assert.ok(!js.includes('Staging'));
    assert.ok(!js.includes('Production'));
  });

  it('returns original input via toString', () => {
    assert.equal(String(amp), input);
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

describe('inferFromURLParams option', () => {
  const amp = parse('%%[ SET @FirstName = FirstName ]%%', { inferFromURLParams: true });

  it('generates $_GET lookup in PHP', () => {
    const php = amp.toPHP();

    assert.ok(php.includes("$FirstName = $_GET['FirstName']"));
  });

  it('generates URLSearchParams lookup in JavaScript', () => {
    const js = amp.toJavaScript();

    assert.ok(js.includes("let FirstName = new URLSearchParams(window.location.search).get('FirstName')"));
  });

  it('does not affect function calls with arguments', () => {
    const amp2 = parse('%%[ SET @x = Uppercase("hello") ]%%', { inferFromURLParams: true });
    const php = amp2.toPHP();

    assert.ok(php.includes("strtoupper('hello')"));
    assert.ok(!php.includes('$_GET'));
  });

  it('does not infer when option is not set', () => {
    const amp3 = parse('%%[ SET @FirstName = FirstName ]%%');
    const php = amp3.toPHP();

    assert.ok(php.includes('FirstName()'));
    assert.ok(!php.includes('$_GET'));
  });
});
