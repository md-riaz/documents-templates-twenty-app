import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/validate-template.ts',
  'src/logic/list-template-variables.ts',
];

test('standalone logic modules exist and are publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'validateTemplateLogic',
    'listTemplateVariablesLogic',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const { validateTemplateLogic } = await import('../dist/logic/validate-template.js');
const { listTemplateVariablesLogic, listBoundObjectFields } = await import('../dist/logic/list-template-variables.js');

test('validateTemplateLogic reports valid template with no errors', () => {
  const result = validateTemplateLogic({
    htmlSource: '<h1>{{company.name}}</h1>',
    context: { company: { name: 'Acme' } },
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.referencedVariables.length, 1);
  assert.equal(result.referencedVariables[0], 'company.name');
});

test('validateTemplateLogic reports syntax errors for invalid templates', () => {
  const result = validateTemplateLogic({
    htmlSource: '<h1>{{unclosed</h1>',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.equal(result.errors[0].code, 'TEMPLATE_SYNTAX_ERROR');
});

test('validateTemplateLogic reports missing variables as warnings when not strict', () => {
  const result = validateTemplateLogic({
    htmlSource: '<p>{{missing.var}}</p>',
    strictMissingVariables: false,
  });
  assert.equal(result.valid, true);
  assert.ok(result.warnings.length > 0);
});

test('validateTemplateLogic reports missing variables as errors when strict', () => {
  const result = validateTemplateLogic({
    htmlSource: '<p>{{missing.var}}</p>',
    strictMissingVariables: true,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('listTemplateVariablesLogic returns variable info with path and helper flag', () => {
  const result = listTemplateVariablesLogic({
    htmlSource: '<p>{{uppercase company.name}} {{formatDate closeDate}}</p>',
  });
  assert.ok(Array.isArray(result));
  assert.ok(result.length >= 2);

  const companyVar = result.find((v) => v.name === 'company.name');
  assert.ok(companyVar, 'should find company.name');
  assert.deepEqual(companyVar.path, ['company', 'name']);
  assert.equal(companyVar.isHelper, false);

  const closeDateVar = result.find((v) => v.name === 'closeDate');
  assert.ok(closeDateVar, 'should find closeDate as variable');
  assert.equal(closeDateVar.isHelper, false);

  const helpers = result.filter((v) => v.isHelper);
  assert.equal(helpers.length, 0, 'helpers should not be in variable list');
});

test('listTemplateVariablesLogic handles empty template', () => {
  const result = listTemplateVariablesLogic({ htmlSource: '<p>No vars</p>' });
  assert.equal(result.length, 0);
});

test('listBoundObjectFields returns schema-backed fields prefixed with the object name', async () => {
  const fakeMetadataApi = {
    listObjects: async () => [],
    getFields: async (objectName) => {
      assert.equal(objectName, 'company');
      return [
        { name: 'name', label: 'Name', type: 'TEXT', isRelation: false },
        { name: 'employees', label: 'Employees', type: 'RELATION', isRelation: true, relationTargetObjectName: 'person' },
      ];
    },
  };

  const result = await listBoundObjectFields('company', fakeMetadataApi);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { name: 'company.name', path: ['company', 'name'], isHelper: false });
  assert.deepEqual(result[1].path, ['company', 'employees']);
});

test('listBoundObjectFields returns an empty list when no object is bound', async () => {
  const result = await listBoundObjectFields('', {
    listObjects: async () => [],
    getFields: async () => {
      throw new Error('should not be called without a bound object');
    },
  });
  assert.deepEqual(result, []);
});
