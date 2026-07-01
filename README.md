# Documents & Templates for Twenty CRM

Documents & Templates turns Twenty CRM records into reusable business documents: proposals, quotes, invoices, onboarding packs, renewal notices, customer documents, and internal handover notes. Teams define templates once, merge them with live CRM data, generate PDFs, attach files back to the source record, send templated documents, and keep a searchable audit trail.

## Why use this app?

- **Faster document creation:** generate polished customer documents from Companies, People, Opportunities, Tasks, Notes, and Calendar Events.
- **Consistent branding and language:** centralize approved HTML/CSS templates, subjects, variables, and output rules.
- **Record-first file management:** generated PDFs attach to the originating CRM record so users find them where they already work.
- **Auditability:** GeneratedDocument records keep template, status, PDF URL, attachment, error, and workflow history without replacing Twenty's native attachments.
- **Automation-ready:** workflow actions support single-record and bulk iterator patterns for repeatable operational processes.

## Reusable business scenarios

| Scenario | Example output | Business value |
| --- | --- | --- |
| Sales proposals | Opportunity proposal PDF attached to the Opportunity | Shortens sales cycle and keeps latest proposal beside deal activity. |
| Quotes and invoices | Company or Person quote/invoice PDF | Standardizes commercial documents and reduces manual copying. |
| Customer onboarding | Welcome pack, implementation checklist, kickoff documents | Creates repeatable onboarding material from live CRM context. |
| Renewals and account management | Renewal notice, QBR summary, success-plan documents | Helps account teams communicate consistently at scale. |
| Support and operations | Incident summary, task handover, service report | Converts internal CRM notes into shareable customer/internal documents. |
| Recruiting or partner workflows | Candidate brief, partner agreement, introduction documents | Reuses the same template engine for non-sales CRM processes. |
| Bulk campaigns | One document/documents per filtered record through workflow iterators | Automates repetitive document generation while preserving per-record history. |

## User guide

### Quick start

1. Open **Documents & Templates** from the Twenty navigation menu.
2. Create or select a template in the template library.
3. Add Handlebars HTML, optional CSS, default subject, preview JSON, and allowed outputs.
4. Use the live preview to validate variables before publishing.
5. From a supported record page, choose **Generate Document** or **Generate Documents**.
6. Review the rendered content, optionally generate a PDF, then save or send.
7. Generated PDFs attach to the source CRM record when record context is available.
8. Use the **Documents** record tab to review generated-document audit/history.

### Template authoring basics

- Use Handlebars expressions such as `{{person.name}}`, `{{company.name}}`, and loops such as `{{#each opportunities}}...{{/each}}`.
- Add preview JSON that matches the expected CRM context so editors can validate before sending.
- Keep unsafe HTML out of user-supplied fields; normal `{{variable}}` output is escaped by default.
- Use triple-stash only for trusted, sanitized content.
- Keep templates inactive until preview data, variable coverage, and permissions are reviewed.

### Common user flows

- **Create a proposal:** select a Company or Opportunity template, preview CRM fields, generate a PDF, attach it to the source record, and save audit history.
- **Send a follow-up documents:** choose an documents-ready template, verify recipients and rendered subject, optionally attach the generated PDF, then send.
- **Regenerate a document:** open the record history tab, find a previous generated document, and rerun the template with current CRM data.
- **Run a bulk workflow:** iterate over filtered records, render one document per item, and keep each output isolated on its source record.

## Documentation links

- [Admin guide](docs/admin-guide.md)
- [Workflow examples](docs/workflow-examples.md)
- [SDK usage examples](examples/sdk-usage.ts)
- [Release notes](docs/release-notes.md)
- [CI commands](docs/ci-commands.md)
- [Issue tracker / support](https://github.com/md-riaz/documents-templates-twenty-app/issues)
- [Repository](https://github.com/md-riaz/documents-templates-twenty-app)

## Marketplace readiness

- User guide: this README.
- Admin guide: [docs/admin-guide.md](docs/admin-guide.md)
- Workflow examples: [docs/workflow-examples.md](docs/workflow-examples.md)
- Release notes: [docs/release-notes.md](docs/release-notes.md)
- CI commands: [docs/ci-commands.md](docs/ci-commands.md)

## Screenshot briefs

Marketplace screenshots are tracked as placeholder briefs until final UI captures are approved:

- [Template library](docs/screenshots/01-template-library.md)
- [Template editor](docs/screenshots/02-template-editor.md)
- [Generate document modal](docs/screenshots/03-generate-document-modal.md)
- [Workflow builder](docs/screenshots/05-workflow-builder.md)

## Adding Documents tab to any record page

The app ships with a Documents tab on Company, Person, and Opportunity records. To add a filtered Documents tab to any other record (custom objects, Tasks, Notes, etc.):

### Via Twenty UI

1. Open the record page for the object (e.g., Task, custom "Proposal" object)
2. Click the **+** tab button or go to **Settings → Data Model → [Object] → Page Layout**
3. Add a new tab, name it "Documents"
4. Add a **Front Component** widget
5. Select the **Documents Shell** front component from this app
6. Save the layout

The widget automatically filters generated documents by the current record's type and ID.

### Via code (for app developers)

```typescript
import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

// For a standard object (e.g., customTask):
definePageLayoutTab({
  universalIdentifier: '<your-unique-uuid>',
  pageLayoutUniversalIdentifier: STANDARD_PAGE_LAYOUT.customTaskRecordPage.universalIdentifier,
  title: 'Documents',
  icon: 'IconFileText',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [{
    universalIdentifier: '<widget-uuid>',
    title: 'Generated Documents',
    type: 'front-component',
    gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
    configuration: {
      configurationType: 'FRONT_COMPONENT',
      frontComponentUniversalIdentifier: '<DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER>',
    },
  }],
});
```

For custom objects, use the object's page layout universal identifier from the metadata API or your object definition.

## PDF Generation

PDF generation is **bundled** — the app includes Puppeteer with its own Chromium. No server modifications needed.

### How it works

1. Templates are rendered to HTML using Handlebars + CRM data
2. Puppeteer converts HTML to PDF using bundled Chromium
3. PDF is stored and attached to the source record

### Supported formats

- A4, A3, A5, Letter, Legal
- Portrait or landscape orientation
- Custom margins (mm, cm, in, px, pt)
- Header/footer templates
- Background graphics printing

### Using the adapter

```typescript
import { pdfAdapter } from 'documents-templates';

const pdfBytes = await pdfAdapter.renderHtmlToPdf({
  html: '<h1>Invoice</h1><p>...</p>',
  options: {
    format: 'A4',
    landscape: false,
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    displayHeaderFooter: false,
    preferCSSPageSize: true,
  }
});
```

## Verification

Run the release verification command from the app root:

```bash
node ./node_modules/typescript/bin/tsc --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck && npm test
```

If a local Twenty server and CLI script are available, also run:

```bash
yarn twenty dev --once --dry-run
```
