import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('document shell front component exists and is publicly exported', () => {
  assert.ok(existsSync(join(root, 'src/front-components/document-shell.front-component.tsx')));
  const index = read('src/index.ts');
  assert.match(index, /documentShellFrontComponent/);
  assert.match(index, /DocumentShellComponent/);
});

const { fetchDocumentHistory } = await import('../dist/front-components/document-shell.front-component.js');

test('fetchDocumentHistory queries documents by primaryRecordId alone, maps template relation to templateName, and sorts newest-first', async () => {
  const queries = [];
  const fakeClient = {
    async query(request) {
      queries.push(request);
      assert.deepEqual(request.documents.__args.filter, { primaryRecordId: { eq: 'company-1' } });
      return {
        documents: {
          edges: [
            {
              node: {
                id: 'doc-old',
                primaryObjectType: 'company',
                primaryRecordId: 'company-1',
                status: 'RENDERED',
                generatedAt: '2024-01-01T00:00:00.000Z',
                generatedBy: 'user-1',
                pdfUrl: null,
                template: { name: 'Welcome Letter' },
              },
            },
            {
              node: {
                id: 'doc-new',
                primaryObjectType: 'company',
                primaryRecordId: 'company-1',
                status: 'PDF_GENERATED',
                generatedAt: '2024-06-01T00:00:00.000Z',
                generatedBy: 'user-1',
                pdfUrl: 'https://files.example/doc-new.pdf',
                template: { name: 'Proposal' },
              },
            },
          ],
        },
      };
    },
  };

  const history = await fetchDocumentHistory(fakeClient, 'company-1');
  assert.equal(queries.length, 1);
  assert.equal(history.length, 2);
  assert.deepEqual(history.map((record) => record.id), ['doc-new', 'doc-old']);
  assert.equal(history[0].templateName, 'Proposal');
  assert.equal(history[0].pdfUrl, 'https://files.example/doc-new.pdf');
  assert.equal(history[1].templateName, 'Welcome Letter');
});

test('fetchDocumentHistory returns an empty list when there are no matching documents', async () => {
  const history = await fetchDocumentHistory({ async query() { return { documents: { edges: [] } }; } }, 'company-2');
  assert.deepEqual(history, []);
});
