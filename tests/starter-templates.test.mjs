import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test('seed and logic-function source files exist', () => {
  assert.ok(existsSync(join(root, 'src/seed/starter-templates.ts')), 'starter-templates.ts should exist');
  assert.ok(
    existsSync(join(root, 'src/logic-functions/seed-starter-templates.logic-function.ts')),
    'seed-starter-templates.logic-function.ts should exist',
  );
});

const { starterTemplates } = await import('../dist/seed/starter-templates.js');
const seedModule = await import('../dist/logic-functions/seed-starter-templates.logic-function.js');

const { runSeedStarterTemplates } = seedModule;
const defaultExport = (mod) => mod.default?.default ?? mod.default;

// ── starterTemplates array ────────────────────────────────────────────

test('starterTemplates exports an array with 5 entries', () => {
  assert.ok(Array.isArray(starterTemplates), 'starterTemplates should be an array');
  assert.equal(starterTemplates.length, 5, 'should contain exactly 5 templates');
});

test('each template has required fields', () => {
  for (const t of starterTemplates) {
    assert.ok(typeof t.name === 'string' && t.name.length > 0, `name should be a non-empty string (got ${t.name})`);
    assert.ok(typeof t.htmlSource === 'string' && t.htmlSource.length > 0, `htmlSource should be non-empty for ${t.name}`);
    assert.ok(typeof t.boundObjectName === 'string' && t.boundObjectName.length > 0, `boundObjectName should be non-empty for ${t.name}`);
    assert.ok(typeof t.description === 'string' && t.description.length > 0, `description should be non-empty for ${t.name}`);
    assert.ok(typeof t.previewData === 'object' && t.previewData !== null, `previewData should be a non-null object for ${t.name}`);
    assert.ok(Object.keys(t.previewData).length > 0, `previewData should have at least one key for ${t.name}`);
  }
});

test('each htmlSource contains Handlebars expressions', () => {
  for (const t of starterTemplates) {
    assert.match(t.htmlSource, /\{\{/, `${t.name} htmlSource should contain Handlebars expressions`);
  }
});

test('templates cover the expected bound objects', () => {
  const boundObjects = starterTemplates.map((t) => t.boundObjectName).sort();
  assert.deepEqual(boundObjects, ['calendarEvent', 'company', 'opportunity', 'person', 'task']);
});

test('template names are unique', () => {
  const names = starterTemplates.map((t) => t.name);
  assert.equal(new Set(names).size, names.length, 'template names should be unique');
});

// ── runSeedStarterTemplates function ──────────────────────────────────

test('runSeedStarterTemplates is exported as a function', () => {
  assert.equal(typeof runSeedStarterTemplates, 'function');
});

test('logic function registers a valid workflow action', () => {
  const def = defaultExport(seedModule);
  assert.equal(def.success, true);
  assert.equal(def.config.name, 'Seed Starter Templates');
  assert.equal(def.config.workflowActionTriggerSettings.label, 'Seed Starter Templates');
  assert.equal(def.config.workflowActionTriggerSettings.icon, 'IconSeedling');
  assert.equal(def.config.universalIdentifier, 'a4e7c193-58d2-4b6f-9a31-d0f5e87b2c41');
});

// ── Logic: creates templates that don't exist ─────────────────────────

test('creates templates that do not exist', async () => {
  const created = [];
  const fakeClient = {
    async query(request) {
      const field = Object.keys(request)[0];
      if (field === 'documentTemplates') {
        // Simulate no existing templates found.
        return { documentTemplates: { edges: [] } };
      }
      throw new Error(`unexpected query field ${field}`);
    },
    async mutation(request) {
      const field = Object.keys(request)[0];
      if (field === 'createDocumentTemplate') {
        const data = request.createDocumentTemplate.__args.data;
        created.push(data);
        return { createDocumentTemplate: { id: `tpl-${created.length}` } };
      }
      throw new Error(`unexpected mutation field ${field}`);
    },
  };

  const result = await runSeedStarterTemplates({}, { client: fakeClient });

  assert.equal(result.created.length, 5, 'should create all 5 templates');
  assert.equal(result.skipped.length, 0, 'should skip none');
  assert.equal(created.length, 5, 'mutation should have been called 5 times');

  // Verify each created record has the expected shape.
  for (const record of created) {
    assert.ok(record.name, 'created record should have a name');
    assert.ok(record.htmlSource, 'created record should have htmlSource');
    assert.equal(record.status, 'DRAFT', 'created record status should be DRAFT');
    assert.ok(record.boundObjectName, 'created record should have boundObjectName');
  }
});

// ── Logic: skips templates that already exist ─────────────────────────

test('skips templates that already exist', async () => {
  const existingNames = new Set(['Sales Proposal', 'Welcome Letter', 'Task Handover']);
  const created = [];
  const fakeClient = {
    async query(request) {
      const field = Object.keys(request)[0];
      if (field === 'documentTemplates') {
        const name = request.documentTemplates.__args.filter.name.eq;
        if (existingNames.has(name)) {
          return { documentTemplates: { edges: [{ node: { id: 'existing-1', name } }] } };
        }
        return { documentTemplates: { edges: [] } };
      }
      throw new Error(`unexpected query field ${field}`);
    },
    async mutation(request) {
      const field = Object.keys(request)[0];
      if (field === 'createDocumentTemplate') {
        const data = request.createDocumentTemplate.__args.data;
        created.push(data);
        return { createDocumentTemplate: { id: `tpl-${created.length}` } };
      }
      throw new Error(`unexpected mutation field ${field}`);
    },
  };

  const result = await runSeedStarterTemplates({}, { client: fakeClient });

  assert.equal(result.created.length, 2, 'should create 2 new templates');
  assert.equal(result.skipped.length, 3, 'should skip 3 existing templates');
  assert.ok(result.skipped.includes('Sales Proposal'), 'Sales Proposal should be skipped');
  assert.ok(result.skipped.includes('Welcome Letter'), 'Welcome Letter should be skipped');
  assert.ok(result.skipped.includes('Task Handover'), 'Task Handover should be skipped');
  assert.ok(result.created.includes('Company Invoice'), 'Company Invoice should be created');
  assert.ok(result.created.includes('Meeting Summary'), 'Meeting Summary should be created');
});

// ── Logic: force flag re-creates all templates ────────────────────────

test('force flag re-creates even when templates exist', async () => {
  const created = [];
  const queryCalls = [];
  const fakeClient = {
    async query(request) {
      queryCalls.push(request);
      // Should not be called when force is true.
      return { documentTemplates: { edges: [{ node: { id: 'existing-1', name: 'x' } }] } };
    },
    async mutation(request) {
      const field = Object.keys(request)[0];
      if (field === 'createDocumentTemplate') {
        const data = request.createDocumentTemplate.__args.data;
        created.push(data);
        return { createDocumentTemplate: { id: `tpl-${created.length}` } };
      }
      throw new Error(`unexpected mutation field ${field}`);
    },
  };

  const result = await runSeedStarterTemplates({ force: true }, { client: fakeClient });

  assert.equal(queryCalls.length, 0, 'should not query when force is true');
  assert.equal(result.created.length, 5, 'should create all 5 templates');
  assert.equal(result.skipped.length, 0, 'should skip none');
});
