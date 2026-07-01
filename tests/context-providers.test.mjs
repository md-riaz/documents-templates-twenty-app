import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/context/provider-registry.ts',
  'src/logic/context/default-providers.ts',
];

test('context provider modules exist and are publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'ContextProviderRegistry',
    'createContextProviderRegistry',
    'createDefaultContextProviders',
    'loadDefaultRecordContext',
    'registerContextProvider',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const {
  ContextProviderRegistry,
  createContextProviderRegistry,
  registerContextProvider,
} = await import('../dist/logic/context/provider-registry.js');
const {
  DEFAULT_CONTEXT_PROVIDER_NAMES,
  createDefaultContextProviders,
  loadDefaultRecordContext,
} = await import('../dist/logic/context/default-providers.js');

test('default providers are registered for standard Twenty CRM objects', async () => {
  const registry = createContextProviderRegistry({ includeDefaultProviders: true });

  assert.deepEqual([...DEFAULT_CONTEXT_PROVIDER_NAMES].sort(), [
    'calendarEvent',
    'company',
    'note',
    'opportunity',
    'person',
    'task',
  ].sort());

  for (const name of DEFAULT_CONTEXT_PROVIDER_NAMES) {
    assert.equal(registry.has(name), true, `${name} provider should be registered`);
  }
});

test('default provider loads primary records and omits unreadable fields with warnings', async () => {
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

  const result = await loadDefaultRecordContext({
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
  const registry = createContextProviderRegistry({ providers: createDefaultContextProviders() });
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
