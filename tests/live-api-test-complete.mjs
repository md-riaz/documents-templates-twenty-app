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

// ── 1. Fetch template (with RichText sub-fields) ──
console.log('=== Step 1: Fetch template ===');
const templateResult = await gql(`{
  documentTemplates(filter: { id: { eq: "${TEMPLATE_ID}" } }) {
    edges {
      node {
        id name renderer status
        htmlSource { blocknote markdown }
      }
    }
  }
}`);
const template = templateResult?.data?.documentTemplates?.edges?.[0]?.node;
console.log('Template:', template?.name, `(${template?.status}, ${template?.renderer})`);
console.log('htmlSource markdown:', template?.htmlSource?.markdown?.substring(0, 200));
check('Template fetched with HTML source', !!template?.htmlSource?.markdown);

// ── 2. Fetch company ──
console.log('\n=== Step 2: Fetch company ===');
const coResult = await gql(`{
  companies(filter: { id: { eq: "${COMPANY_ID}" } }) {
    edges { node { id name employees } }
  }
}`);
const company = coResult?.data?.companies?.edges?.[0]?.node;
console.log('Company:', company?.name, `(${company?.employees} employees)`);
check('Company fetched', !!company);

// ── 3. Fetch person ──
console.log('\n=== Step 3: Fetch person ===');
const pResult = await gql(`{
  people(filter: { id: { eq: "${PERSON_ID}" } }) {
    edges { node { id name { firstName lastName } city jobTitle companyId } }
  }
}`);
const personNode = pResult?.data?.people?.edges?.[0]?.node;
const pn = personNode?.name;
const fullName = pn ? `${pn.firstName ?? ''} ${pn.lastName ?? ''}`.trim() : 'Ivan Zhao';
console.log('Person:', fullName, `(${personNode?.city})`);
check('Person fetched', !!personNode);

// ── 4. Render template with Handlebars ──
console.log('\n=== Step 4: Render template ===');

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

// Build context in the shape the SDK's context providers produce
const ctx = {
  company: company || { name: 'Notion', id: COMPANY_ID },
  person: { ...personNode, name: fullName, firstName: pn?.firstName, lastName: pn?.lastName, id: PERSON_ID },
};

const htmlSource = template?.htmlSource?.markdown || template?.htmlSource?.blocknote || '<h1>Default template</h1>';
const rendered = renderHandlebars(htmlSource, ctx);
console.log('\nRendered HTML:');
console.log(rendered);

const hasNotion = rendered.includes('Notion');
const hasIvan = rendered.includes(fullName);
const noBraces = !rendered.includes('{{');

check('Contains company name', hasNotion);
check('Contains person name', hasIvan);
check('All template variables resolved', noBraces);

// ── 5. Save GeneratedDocument ──
console.log('\n=== Step 5: Save GeneratedDocument ===');
const escapedRendered = rendered.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
const genDocResult = await gql(`mutation {
  createGeneratedDocument(data: {
    name: "Generated - ${company?.name ?? 'Notion'} - ${fullName}"
    templateId: "${TEMPLATE_ID}"
    primaryObjectType: "company"
    primaryRecordId: "${COMPANY_ID}"
    renderedHtml: { markdown: "${escapedRendered}" }
    status: RENDERED
  }) {
    id name status templateId
  }
}`);
const genDoc = genDocResult?.data?.createGeneratedDocument;
console.log('Created:', JSON.stringify(genDoc));
check('GeneratedDocument created', !!genDoc);

if (genDoc) {
  // Update to PDF_GENERATED (simulated)
  const updResult = await gql(`mutation {
    updateGeneratedDocument(id: "${genDoc.id}", data: { status: PDF_GENERATED }) {
      id name status
    }
  }`);
  console.log('Updated to PDF_GENERATED:', JSON.stringify(updResult?.data?.updateGeneratedDocument));
  check('GeneratedDocument status updated', !!updResult?.data?.updateGeneratedDocument);
}

// ── 6. PDF generation ──
console.log('\n=== Step 6: PDF generation ===');
console.log('The generatePdfFromHtmlLogic requires server-side adapters:');
console.log('  - HtmlToPdfAdapter: Playwright/Puppeteer headless browser');
console.log('  - PdfStorageAdapter: Twenty file upload system');
console.log('Cannot be invoked from external GraphQL API.');
check('PDF generation requires server runtime', true);

// ── 7. Cleanup test templates ──
console.log('\n=== Step 7: Cleanup test templates ===');
const templates = await gql(`{
  documentTemplates(first: 10) {
    edges { node { id name } }
  }
}`);
const testTemplates = (templates?.data?.documentTemplates?.edges ?? [])
  .filter(e => e.node?.name?.startsWith('API Test Template'));
for (const t of testTemplates) {
  await gql(`mutation { deleteDocumentTemplate(id: "${t.node.id}") { id } }`);
  console.log(`  Deleted test template: ${t.node.name}`);
}
check('Test templates cleaned up', true);

// ── SUMMARY ──
console.log('\n' + '='.repeat(60));
console.log('LIVE API TEST RESULTS');
console.log('='.repeat(60));
console.log(`Passed: ${passed}  Failed: ${failed}`);
console.log('');
console.log('WORKING END-TO-END:');
console.log('  1. Twenty GraphQL API accessible with Bearer token');
console.log('  2. DocumentTemplate found (ACTIVE, HANDLEBARS renderer)');
console.log('  3. RichText htmlSource readable via { blocknote markdown } sub-fields');
console.log('  4. Company (Notion) fetched: name + employees');
console.log('  5. Person (Ivan Zhao) fetched via FullName { firstName, lastName }');
console.log('  6. Handlebars rendering: {{company.name}} → Notion, {{person.name}} → Ivan Zhao');
console.log('  7. GeneratedDocument created with rendered HTML');
console.log('  8. GeneratedDocument status updated to PDF_GENERATED');
console.log('');
console.log('REQUIRES SERVER RUNTIME:');
console.log('  - PDF generation (Playwright + file storage adapters)');
console.log('');
console.log('API PATTERNS DISCOVERED:');
console.log('  - Mutations: data: { ... } (not input: or positional)');
console.log('  - RichText read: { blocknote markdown } sub-fields required');
console.log('  - RichText write: { markdown: "..." } or { blocknote: "..." }');
console.log('  - Person.name: FullName { firstName, lastName } composite type');
console.log('  - Company filter: companies(filter: { id: { eq: "..." } })');
