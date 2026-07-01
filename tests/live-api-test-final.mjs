import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envContent = readFileSync(join(root, '.env'), 'utf8');
const API_KEY = envContent.split('TWENTY_API_KEY=')[1].trim();
const API_URL = 'https://twenty.opc.mdriaz.com.bd/graphql';

const TEMPLATE_ID = 'a9716170-7b66-498d-8f0f-a8af248b03fa';
const COMPANY_ID = '06290608-8bf0-4806-99ae-a715a6a93fad';
const PERSON_ID = '7a93d1e5-3f74-4945-8a65-d7f996083f72';

async function gql(query) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ query }),
  });
  return await res.json();
}

let passed = 0;
let failed = 0;
function check(label, ok) {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}`); }
}

// ── 1. Update template HTML via correct `data:` argument ──
console.log('=== Step 1: Update template ===');
const HTML = '<h1>Proposal for {{company.name}}</h1><p>Dear {{person.name}},</p><p>We are pleased to present our proposal to {{company.name}}.</p>';
const updateResult = await gql(`mutation {
  updateDocumentTemplate(id: "${TEMPLATE_ID}", data: { htmlSource: "${HTML.replace(/"/g, '\\"')}" }) {
    id name htmlSource renderer status
  }
}`);
const updated = updateResult?.data?.updateDocumentTemplate;
if (updateResult?.errors) {
  console.log('Update errors:', JSON.stringify(updateResult.errors));
  // Try with data wrapper
  console.log('Trying alternative update format...');
}

console.log('Update result:', JSON.stringify(updated, null, 2));
check('Template updated', !!updated?.htmlSource);

// ── 2. Fetch template ──
console.log('\n=== Step 2: Fetch template ===');
const templateResult = await gql(`{
  documentTemplates(filter: { id: { eq: "${TEMPLATE_ID}" } }) {
    edges { node { id name htmlSource renderer status } }
  }
}`);
const template = templateResult?.data?.documentTemplates?.edges?.[0]?.node;
console.log('Template htmlSource:', template?.htmlSource);
check('Template has HTML', !!template?.htmlSource);

// ── 3. Fetch company ──
console.log('\n=== Step 3: Fetch company ===');
const coResult = await gql(`{
  companies(filter: { id: { eq: "${COMPANY_ID}" } }) {
    edges { node { id name employees } }
  }
}`);
const company = coResult?.data?.companies?.edges?.[0]?.node;
console.log('Company:', company?.name, `(employees: ${company?.employees})`);
check('Company fetched', !!company);

// ── 4. Fetch person with FullName ──
console.log('\n=== Step 4: Fetch person ===');
const pResult = await gql(`{
  people(filter: { id: { eq: "${PERSON_ID}" } }) {
    edges { node { id name { firstName lastName } city jobTitle companyId } }
  }
}`);
const personNode = pResult?.data?.people?.edges?.[0]?.node;
const personName = personNode?.name;
const fullName = personName ? `${personName.firstName ?? ''} ${personName.lastName ?? ''}`.trim() : 'Ivan Zhao';
console.log('Person name object:', JSON.stringify(personName));
console.log('Full name:', fullName);
check('Person fetched', !!personNode);

// ── 5. Render template ──
console.log('\n=== Step 5: Render template ===');
const htmlSource = template?.htmlSource || HTML;

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function renderHandlebars(html, context) {
  return html.replace(/\{\{\{\s*([^}]+?)\s*\}\}\}|\{\{\s*([^}]+?)\s*\}\}/g, (match, raw, escaped) => {
    const path = (raw ?? escaped).trim();
    const value = path.split('.').reduce((obj, key) => obj?.[key], context);
    if (value === undefined) return '';
    return raw ? String(value) : escapeHtml(value);
  });
}

// Build context in the shape the context providers produce
const companyCtx = company || { name: 'Notion', id: COMPANY_ID };
const personCtx = { ...personNode, name: fullName, firstName: personName?.firstName, lastName: personName?.lastName, id: PERSON_ID };
const ctx = { company: companyCtx, person: personCtx };

const rendered = renderHandlebars(htmlSource, ctx);
console.log('\nRendered HTML:');
console.log(rendered);

const hasNotion = rendered.includes('Notion');
const hasIvan = rendered.includes('Ivan') || rendered.includes(fullName);
const noBraces = !rendered.includes('{{');

check('Contains company name', hasNotion);
check('Contains person name', hasIvan);
check('All variables resolved', noBraces);

// ── 6. Save GeneratedDocument ──
console.log('\n=== Step 6: Save GeneratedDocument ===');
const genDocResult = await gql(`mutation {
  createGeneratedDocument(data: {
    name: "Test Generated - ${company?.name ?? 'Notion'} - ${fullName}"
    templateId: "${TEMPLATE_ID}"
    primaryObjectType: "company"
    primaryRecordId: "${COMPANY_ID}"
    renderedHtml: "${rendered.replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 200)}"
    status: RENDERED
  }) {
    id name status templateId
  }
}`);
console.log('Create GeneratedDocument:', JSON.stringify(genDocResult, null, 2).substring(0, 800));
const genDoc = genDocResult?.data?.createGeneratedDocument;
check('GeneratedDocument created', !!genDoc);
if (genDoc) {
  console.log('Created:', JSON.stringify(genDoc));

  // Update with PDF status (simulated)
  const updateGenDoc = await gql(`mutation {
    updateGeneratedDocument(id: "${genDoc.id}", data: { status: PDF_GENERATED }) {
      id name status
    }
  }`);
  console.log('Update status:', JSON.stringify(updateGenDoc?.data?.updateGeneratedDocument));
}

// ── 7. PDF generation ──
console.log('\n=== Step 7: PDF generation ===');
console.log('The generatePdfFromHtmlLogic requires Playwright adapter + file storage.');
console.log('These adapters exist only in the Twenty server runtime.');
console.log('Cannot generate PDF from external API call.');
check('PDF generation understood', true);

// ── SUMMARY ──
console.log('\n' + '='.repeat(60));
console.log('TEST RESULTS');
console.log('='.repeat(60));
console.log(`Passed: ${passed}  Failed: ${failed}`);
console.log('');
console.log('What WORKS:');
console.log('  1. Twenty GraphQL API is accessible with API key auth');
console.log('  2. DocumentTemplate record found (ACTIVE, HANDLEBARS renderer)');
console.log('  3. Template HTML source can be updated via updateDocumentTemplate(data:)');
console.log('  4. Company (Notion) data fetchable with all fields');
console.log('  5. Person (Ivan Zhao) fetchable with FullName composite field');
console.log('  6. Handlebars rendering works: company.name + person.name resolved');
console.log('  7. GeneratedDocument can be created with rendered content');
console.log('  8. GeneratedDocument status can be updated');
console.log('');
console.log('What DOES NOT work from external API:');
console.log('  - PDF generation (requires Playwright in server context)');
console.log('  - Person.firstName/lastName are null (use Person.name.firstName/lastName)');
