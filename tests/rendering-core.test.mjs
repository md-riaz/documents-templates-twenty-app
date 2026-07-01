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
const { validateHandlebarsTemplate } = await import('../dist/logic/rendering/template-validation.js');

test('Handlebars-style renderer supports variables, loops, conditionals, helpers, and escaping', () => {
  const result = renderHandlebarsTemplate({
    htmlSource: [
      '<h1>{{uppercase company.name}}</h1>',
      '{{#if opportunity.open}}<p>{{default opportunity.stage "Draft"}}</p>{{else}}<p>Closed</p>{{/if}}',
      '<ul>{{#each items}}<li>{{number}}/{{index}} {{lowercase name}} {{formatCurrency amount currency}}</li>{{/each}}</ul>',
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
  assert.match(result.html, /<li>1\/0 setup \$12\.50<\/li>/);
  assert.match(result.html, /<li>2\/1 support \$99\.00<\/li>/);
  assert.match(result.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(result.html, /<aside><script>alert\("x"\)<\/script><\/aside>/);
  assert.match(result.html, /<time>1\/2\/2026<\/time>/);
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

test('error mapping returns user-readable render errors', () => {
  const mapped = mapTemplateRenderError(new Error('Unexpected EOF'), 'compile');
  assert.ok(mapped instanceof TemplateRenderError);
  assert.equal(mapped.code, 'TEMPLATE_SYNTAX_ERROR');
  assert.match(mapped.userMessage, /template syntax/i);

  const unknown = mapTemplateRenderError('boom', 'render');
  assert.equal(unknown.code, 'TEMPLATE_RENDER_ERROR');
  assert.match(unknown.userMessage, /could not be rendered/i);
});
