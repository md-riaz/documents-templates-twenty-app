import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/rendering/handlebars-renderer.ts',
  'src/logic/rendering/helper-registry.ts',
  'src/logic/rendering/css-combiner.ts',
  'src/logic/rendering/template-validation.ts',
  'src/logic/rendering/render-errors.ts',
];

test('rendering core modules exist and are publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'renderHandlebarsTemplate',
    'createDefaultHelperRegistry',
    'combineCssWithHtml',
    'validateHandlebarsTemplate',
    'TemplateRenderError',
    'mapTemplateRenderError',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const { combineCssWithHtml } = await import('../dist/logic/rendering/css-combiner.js');
const { createDefaultHelperRegistry } = await import('../dist/logic/rendering/helper-registry.js');
const { renderHandlebarsTemplate } = await import('../dist/logic/rendering/handlebars-renderer.js');
const { mapTemplateRenderError, TemplateRenderError } = await import('../dist/logic/rendering/render-errors.js');
const { validateHandlebarsTemplate, extractReferencedVariables } = await import('../dist/logic/rendering/template-validation.js');

test('Handlebars-style renderer supports variables, loops, conditionals, helpers, and escaping', () => {
  const result = renderHandlebarsTemplate({
    htmlSource: [
      '<h1>{{uppercase company.name}}</h1>',
      '{{#if opportunity.open}}<p>{{default opportunity.stage "Draft"}}</p>{{else}}<p>Closed</p>{{/if}}',
      // `@index` is real Handlebars' native (0-based) iteration variable —
      // this app no longer injects a bespoke `index`/`number` field per item.
      '<ul>{{#each items}}<li>{{@index}} {{lowercase name}} {{formatCurrency amount currency}}</li>{{/each}}</ul>',
      '<p>{{unsafe}}</p><aside>{{{unsafe}}}</aside>',
      '<time>{{formatDate closeDate "en-US"}}</time>',
    ].join(''),
    cssSource: 'h1 { color: red; }',
    context: {
      company: { name: 'Acme' },
      opportunity: { open: true, stage: '' },
      items: [
        { name: 'SETUP', amount: 12.5, currency: 'USD' },
        { name: 'SUPPORT', amount: 99, currency: 'USD' },
      ],
      unsafe: '<script>alert("x")</script>',
      closeDate: '2026-01-02T00:00:00.000Z',
    },
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /<style>h1 \{ color: red; \}<\/style>/);
  assert.match(result.html, /<h1>ACME<\/h1>/);
  assert.match(result.html, /<p>Draft<\/p>/);
  assert.match(result.html, /<li>0 setup \$12\.50<\/li>/);
  assert.match(result.html, /<li>1 support \$99\.00<\/li>/);
  assert.match(result.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(result.html, /<aside><script>alert\("x"\)<\/script><\/aside>/);
  assert.match(result.html, /<time>1\/2\/2026<\/time>/);
});

test('renderer is powered by real Handlebars: {{else if}}, {{#with}}, and subexpressions all work', () => {
  const result = renderHandlebarsTemplate({
    htmlSource: [
      '{{#if opportunity.won}}<p>Won</p>{{else if opportunity.lost}}<p>Lost</p>{{else}}<p>Open</p>{{/if}}',
      '{{#with company}}<h2>{{name}}</h2>{{/with}}',
      '<p>{{uppercase (default nickname "guest")}}</p>',
    ].join(''),
    context: {
      opportunity: { won: false, lost: true },
      company: { name: 'Acme' },
      nickname: '',
    },
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /<p>Lost<\/p>/);
  assert.match(result.html, /<h2>Acme<\/h2>/);
  assert.match(result.html, /<p>GUEST<\/p>/);
});

test('renderer supports real Handlebars partials', () => {
  const result = renderHandlebarsTemplate({
    htmlSource: '<div>{{> greeting}}</div>',
    partials: { greeting: '<span>Hello {{name}}</span>' },
    context: { name: 'World' },
  });

  assert.equal(result.errors.length, 0);
  assert.equal(result.html, '<div><span>Hello World</span></div>');
});

test('unknown helper calls raise an UNKNOWN_HELPER render error', () => {
  const result = renderHandlebarsTemplate({
    htmlSource: '<p>{{shout message}}</p>',
    context: { message: 'hi' },
  });

  assert.equal(result.html, '');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, 'UNKNOWN_HELPER');
});

test('helper registry supports custom helpers and duplicate registration protection', () => {
  const registry = createDefaultHelperRegistry();
  registry.register('surround', (value, left = '[', right = ']') => `${left}${value}${right}`);

  assert.equal(registry.invoke('surround', ['ok', '<', '>'], {}), '<ok>');
  assert.throws(() => registry.register('surround', () => ''), /already registered/);
  assert.throws(() => registry.invoke('missingHelper', [], {}), /Unknown template helper/);
});

test('CSS combiner merges into head when present and prepends otherwise', () => {
  assert.equal(
    combineCssWithHtml('<html><head><title>x</title></head><body>Hi</body></html>', 'body { margin: 0; }'),
    '<html><head><title>x</title><style>body { margin: 0; }</style></head><body>Hi</body></html>',
  );
  assert.equal(combineCssWithHtml('<p>Hi</p>', 'p { color: blue; }'), '<style>p { color: blue; }</style><p>Hi</p>');
  assert.equal(combineCssWithHtml('<p>Hi</p>', '   '), '<p>Hi</p>');
});

test('template validation reports syntax errors and strict missing variables', () => {
  const syntax = validateHandlebarsTemplate('{{#if company.name}}Missing close', { company: { name: 'Acme' } });
  assert.equal(syntax.valid, false);
  assert.equal(syntax.errors[0].code, 'TEMPLATE_SYNTAX_ERROR');
  assert.equal(typeof syntax.errors[0].line, 'number');

  const missing = validateHandlebarsTemplate('Hello {{company.name}} {{person.email}}', { company: {} }, { strictMissingVariables: true });
  assert.equal(missing.valid, false);
  assert.deepEqual(missing.errors.map((error) => error.path).sort(), ['company.name', 'person.email']);

  const render = renderHandlebarsTemplate({ htmlSource: 'Hello {{person.email}}', context: {}, strictMissingVariables: true });
  assert.equal(render.errors[0].code, 'MISSING_REQUIRED_VARIABLE');
});

test('template validation does not flag each/with-relative variables as missing top-level context', () => {
  const eachResult = validateHandlebarsTemplate(
    '{{#each items}}{{name}}{{/each}}',
    { items: [{ name: 'Ada' }] },
    { strictMissingVariables: true },
  );
  assert.equal(eachResult.valid, true, `expected no false-positive missing variable, got: ${JSON.stringify(eachResult.errors)}`);

  const withResult = validateHandlebarsTemplate(
    '{{#with company}}{{name}}{{/with}}',
    { company: { name: 'Acme' } },
    { strictMissingVariables: true },
  );
  assert.equal(withResult.valid, true, `expected no false-positive missing variable, got: ${JSON.stringify(withResult.errors)}`);

  // An explicit `../` escape out of the block scope is still validated normally.
  const escapedResult = validateHandlebarsTemplate(
    '{{#each items}}{{../missingTopLevel}}{{/each}}',
    { items: [{ name: 'Ada' }] },
    { strictMissingVariables: true },
  );
  assert.equal(escapedResult.valid, false);
  assert.deepEqual(escapedResult.errors.map((error) => error.path), ['missingTopLevel']);

  // A genuinely missing top-level variable outside any block is still caught.
  const genuinelyMissing = validateHandlebarsTemplate(
    'Hello {{missing.var}}',
    {},
    { strictMissingVariables: true },
  );
  assert.equal(genuinelyMissing.valid, false);
});

test('extractReferencedVariables walks the full Handlebars AST, including {{else if}} chains, {{#each}} bodies, and subexpressions', () => {
  const source = [
    '{{#if opportunity.won}}<p>{{opportunity.amount}}</p>',
    '{{else if opportunity.lost}}<p>{{opportunity.reason}}</p>{{/if}}',
    '{{#each items}}<li>{{item.sku}}</li>{{/each}}',
    '<p>{{uppercase (default nickname "guest")}}</p>',
    '{{@index}}',
  ].join('');

  const referenced = extractReferencedVariables(source);
  assert.deepEqual(
    referenced.sort(),
    [
      'item.sku',
      'items',
      'nickname',
      'opportunity.amount',
      'opportunity.lost',
      'opportunity.reason',
      'opportunity.won',
    ].sort(),
  );
});

test('error mapping returns user-readable render errors', () => {
  const mapped = mapTemplateRenderError(new Error('Unexpected EOF'), 'compile');
  assert.ok(mapped instanceof TemplateRenderError);
  assert.equal(mapped.code, 'TEMPLATE_SYNTAX_ERROR');
  assert.match(mapped.userMessage, /template syntax/i);

  const unknown = mapTemplateRenderError('boom', 'render');
  assert.equal(unknown.code, 'TEMPLATE_RENDER_ERROR');
  assert.match(unknown.userMessage, /could not be rendered/i);
});
