import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('puppeteer adapter module exists and is publicly exported', () => {
  assert.ok(existsSync(join(root, 'src/adapters/puppeteer-pdf.adapter.ts')), 'puppeteer-pdf.adapter.ts should exist');

  const index = read('src/index.ts');
  assert.match(index, /puppeteerPdfAdapter/, 'src/index.ts should export puppeteerPdfAdapter');
  assert.match(index, /createPuppeteerPdfAdapter/, 'src/index.ts should export createPuppeteerPdfAdapter');
});

test('puppeteer adapter implements HtmlToPdfAdapter interface', async () => {
  const { puppeteerPdfAdapter } = await import('../dist/adapters/puppeteer-pdf.adapter.js');

  assert.ok(puppeteerPdfAdapter, 'puppeteerPdfAdapter should be defined');
  assert.equal(typeof puppeteerPdfAdapter.renderHtmlToPdf, 'function', 'renderHtmlToPdf should be a function');
});

test('puppeteer adapter can render simple HTML to PDF', async () => {
  const { puppeteerPdfAdapter } = await import('../dist/adapters/puppeteer-pdf.adapter.js');

  const html = '<html><body><h1>Test PDF</h1><p>Hello World</p></body></html>';
  const options = {
    format: 'A4',
    landscape: false,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    displayHeaderFooter: false,
    preferCSSPageSize: false,
  };

  const result = await puppeteerPdfAdapter.renderHtmlToPdf({ html, options });

  assert.ok(result, 'result should be defined');
  assert.ok(result instanceof Uint8Array, 'result should be Uint8Array');
  assert.ok(result.length > 0, 'PDF should have content');

  // Check PDF magic bytes
  const header = new TextDecoder().decode(result.slice(0, 5));
  assert.equal(header, '%PDF-', 'result should start with PDF header');
});

test('createPuppeteerPdfAdapter returns new adapter instance', async () => {
  const { createPuppeteerPdfAdapter } = await import('../dist/adapters/puppeteer-pdf.adapter.js');

  const adapter1 = createPuppeteerPdfAdapter();
  const adapter2 = createPuppeteerPdfAdapter();

  assert.notEqual(adapter1, adapter2, 'should return different instances');
  assert.equal(typeof adapter1.renderHtmlToPdf, 'function', 'adapter should have renderHtmlToPdf');
  assert.equal(typeof adapter2.renderHtmlToPdf, 'function', 'adapter should have renderHtmlToPdf');
});
