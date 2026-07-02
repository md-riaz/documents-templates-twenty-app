import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/context/provider-registry.ts',
  'src/logic/metadata/metadata-client.ts',
];

test('context provider + metadata modules exist and the hardcoded defaults module is gone', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }
  assert.equal(
    existsSync(join(root, 'src/logic/context/default-providers.ts')),
    false,
    'default-providers.ts should have been deleted in favor of the metadata-enhanced generic loader',
  );

  const index = read('src/index.ts');
  for (const exportName of [
    'ContextProviderRegistry',
    'createContextProviderRegistry',
    'registerContextProvider',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const {
  ContextProviderRegistry,
  createContextProviderRegistry,
  registerContextProvider,
  loadGenericRecordContext,
} = await import('../dist/logic/context/provider-registry.js');
const {
  createMetadataApi,
  createCachedMetadataApi,
} = await import('../dist/logic/metadata/metadata-client.js');

test('generic loader loads primary records and omits unreadable fields with warnings', async () => {
  const api = {
    async getRecord(objectName, id) {
      assert.equal(objectName, 'company');
      assert.equal(id, 'company-1');
      return {
        id,
        name: 'Acme Corp',
        domainName: 'acme.test',
        annualRecurringRevenue: 250000,
      };
    },
  };

  const result = await loadGenericRecordContext({
    primaryObjectType: 'Company',
    primaryRecordId: 'company-1',
    api,
    permissions: { readableFields: { company: ['id', 'name'] } },
    currentUser: { id: 'user-1', name: 'Ada Admin' },
    workspace: { id: 'workspace-1', displayName: 'Demo Workspace' },
  });

  assert.deepEqual(result.context.company, { id: 'company-1', name: 'Acme Corp' });
  assert.deepEqual(result.context.primary, { objectType: 'company', record: result.context.company });
  assert.deepEqual(result.context.currentUser, { id: 'user-1', name: 'Ada Admin' });
  assert.deepEqual(result.context.workspace, { id: 'workspace-1', displayName: 'Demo Workspace' });
  assert.match(result.warnings.join('\n'), /omitted unreadable field/i);
  assert.equal('domainName' in result.context.company, false);
});

test('generic loader makes NO metadata call when no MetadataApi is injected', async () => {
  let metadataCalls = 0;
  const metadataApi = {
    async listObjects() { metadataCalls += 1; return []; },
    async getFields() { metadataCalls += 1; return []; },
  };

  // metadataApi is intentionally NOT passed to preserve legacy fast-path behavior.
  const result = await loadGenericRecordContext({
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    api: { async getRecord(_object, id) { return { id, companyId: 'company-1' }; } },
  });

  assert.equal(metadataCalls, 0, 'no metadata call should happen without an injected MetadataApi');
  assert.equal(result.context.person.companyId, 'company-1', 'relation stays a raw id without metadata');
  assert.equal(typeof result.context.person.company, 'undefined');
});

test('metadata-enhanced generic loader shallow-expands relations, then applies readableFields', async () => {
  const fakeMetadata = {
    async listObjects() { return []; },
    async getFields(objectName) {
      if (objectName === 'person') {
        return [
          { name: 'name', label: 'Name', type: 'FULL_NAME', isRelation: false },
          { name: 'company', label: 'Company', type: 'RELATION', isRelation: true, relationTargetObjectName: 'company' },
        ];
      }
      return [];
    },
  };

  const api = {
    async getRecord(objectName, id) {
      if (objectName === 'person') {
        return { id, name: { firstName: 'Ada', lastName: 'Lovelace' }, companyId: 'company-1', ssn: 'secret' };
      }
      if (objectName === 'company') {
        return { id, name: 'Acme Corp', domainName: 'acme.test' };
      }
      return null;
    },
  };

  const result = await loadGenericRecordContext({
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    api,
    metadataApi: fakeMetadata,
    permissions: {
      readableFields: {
        // Note: 'ssn' is deliberately excluded to prove filtering runs AFTER expansion.
        person: ['id', 'name', 'companyId', 'company'],
        company: ['id', 'name'],
      },
    },
  });

  // Relation expanded one level, with a derived label, and nested company filtered by its own readableFields.
  assert.equal(result.context.person.company.id, 'company-1');
  assert.equal(result.context.person.company.name, 'Acme Corp');
  assert.equal(result.context.person.company.label, 'Acme Corp');
  assert.equal('domainName' in result.context.person.company, false, 'nested relation is also permission-filtered');

  // readableFields still governs the primary record after expansion.
  assert.equal('ssn' in result.context.person, false, 'unreadable primary field must be dropped after expansion');
  assert.match(result.warnings.join('\n'), /omitted unreadable field/i);
});

test('registry falls back to generic primary context and records provider warnings', async () => {
  const registry = new ContextProviderRegistry();
  const result = await registry.load({
    primaryObjectType: 'CustomInvoice',
    primaryRecordId: 'invoice-1',
    api: {
      async getRecord(objectName, id) {
        assert.equal(objectName, 'customInvoice');
        return { id, total: 42 };
      },
    },
  });

  assert.deepEqual(result.context.primary, {
    objectType: 'customInvoice',
    record: { id: 'invoice-1', total: 42 },
  });
  assert.equal(result.context.customInvoice.total, 42);
  assert.match(result.warnings.join('\n'), /No context provider registered/i);
});

test('registry turns recoverable provider failures into warnings', async () => {
  const registry = createContextProviderRegistry({ includeDefaultProviders: true });
  const result = await registry.load({
    primaryObjectType: 'Person',
    primaryRecordId: 'person-1',
    api: {
      async getRecord() {
        throw new Error('API denied field access');
      },
    },
  });

  assert.deepEqual(result.context.person, {});
  assert.deepEqual(result.context.primary, { objectType: 'person', record: {} });
  assert.match(result.warnings.join('\n'), /Could not load person context: API denied field access/);
});

test('custom provider registration overrides fallback without mutating other registries', async () => {
  const registry = createContextProviderRegistry();
  const otherRegistry = createContextProviderRegistry();

  registerContextProvider('hostbill', async ({ primaryRecordId }) => ({
    context: { hostbill: { accountId: primaryRecordId, status: 'active' } },
    warnings: ['HostBill balance unavailable'],
  }), registry);

  assert.equal(registry.has('HostBill'), true);
  assert.equal(otherRegistry.has('HostBill'), false);

  const result = await registry.load({ primaryObjectType: 'HostBill', primaryRecordId: 'hb-1' });
  assert.deepEqual(result.context.hostbill, { accountId: 'hb-1', status: 'active' });
  assert.deepEqual(result.warnings, ['HostBill balance unavailable']);
});

test('createMetadataApi translates the genql objects response into normalized objects/fields', async () => {
  let queries = 0;
  const fakeClient = {
    async query(_request) {
      queries += 1;
      return {
        objects: {
          edges: [
            {
              node: {
                nameSingular: 'person',
                namePlural: 'people',
                labelSingular: 'Person',
                fieldsList: [
                  { name: 'name', label: 'Name', type: 'FULL_NAME', isNullable: false },
                  {
                    name: 'company',
                    label: 'Company',
                    type: 'RELATION',
                    isNullable: true,
                    relation: { targetObjectMetadata: { nameSingular: 'company' } },
                  },
                ],
              },
            },
          ],
        },
      };
    },
  };

  const metadata = createMetadataApi(fakeClient);
  const objects = await metadata.listObjects();
  assert.equal(objects.length, 1);
  assert.equal(objects[0].nameSingular, 'person');
  assert.equal(objects[0].namePlural, 'people');
  assert.equal(objects[0].fields.length, 2);

  const fields = await metadata.getFields('person');
  const relationField = fields.find((f) => f.name === 'company');
  assert.equal(relationField.isRelation, true);
  assert.equal(relationField.relationTargetObjectName, 'company');
  assert.equal(relationField.isNullable, true);
  const textField = fields.find((f) => f.name === 'name');
  assert.equal(textField.isRelation, false);
  assert.equal('relationTargetObjectName' in textField, false);
  assert.ok(queries >= 1);
});

test('createCachedMetadataApi caches results and invalidate() forces a refetch', async () => {
  let listCalls = 0;
  let fieldCalls = 0;
  const inner = {
    async listObjects() { listCalls += 1; return [{ nameSingular: 'person', labelSingular: 'Person', fields: [] }]; },
    async getFields() { fieldCalls += 1; return [{ name: 'name', label: 'Name', type: 'TEXT', isRelation: false }]; },
  };

  const cached = createCachedMetadataApi(inner, { cacheKey: 'workspace-1' });
  await cached.listObjects();
  await cached.listObjects();
  assert.equal(listCalls, 1, 'listObjects should be cached');

  await cached.getFields('person');
  await cached.getFields('person');
  assert.equal(fieldCalls, 1, 'getFields should be cached per object');

  cached.invalidate();
  await cached.listObjects();
  await cached.getFields('person');
  assert.equal(listCalls, 2, 'invalidate() clears the objects cache');
  assert.equal(fieldCalls, 2, 'invalidate() clears the fields cache');
});

test('createCachedMetadataApi respects a short TTL', async () => {
  let calls = 0;
  const inner = {
    async listObjects() { calls += 1; return []; },
    async getFields() { return []; },
  };
  const cached = createCachedMetadataApi(inner, { ttlMs: 1 });
  await cached.listObjects();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await cached.listObjects();
  assert.equal(calls, 2, 'expired entries should be refetched');
});
