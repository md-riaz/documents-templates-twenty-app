# Documents & Templates for Twenty CRM

Documents & Templates turns Twenty CRM records into reusable business documents: proposals, quotes, invoices, onboarding packs, renewal notices, customer documents, and internal handover notes. Teams define templates once, merge them with live CRM data, generate PDFs, attach files back to the source record, and keep a searchable audit trail.

## Why use this app?

- **Faster document creation:** generate polished customer documents from Companies, People, Opportunities, Tasks, Notes, and Calendar Events.
- **Consistent branding and language:** centralize approved HTML/CSS templates, subjects, variables, and output rules.
- **Record-first file management:** the CRM record you generated from links straight to its Document record, whose Files tab holds the PDF — no duplicate copies.
- **Auditability:** Document records keep template, status, PDF URL, attachment, error, and workflow history without replacing Twenty's native attachments.
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
5. From a supported record page, choose **Generate Document**.
6. Review the rendered content, optionally generate a PDF, then save.
7. Generated PDFs attach to the Document audit record itself — so the PDF can always be
   retrieved later from that record's own Files tab using only its ID, even after the
   cached `pdfUrl` (a signed link that expires) goes stale. The source CRM record reaches
   the same file through its **Documents** tab's "View Document" link, so nothing is
   duplicated.
8. Use the **Documents** record tab to review document audit/history.

### Template authoring basics

- Use Handlebars expressions such as `{{person.name}}`, `{{company.name}}`, and loops such as `{{#each opportunities}}...{{/each}}`.
- Add preview JSON that matches the expected CRM context so editors can validate before publishing.
- Keep unsafe HTML out of user-supplied fields; normal `{{variable}}` output is escaped by default.
- Use triple-stash only for trusted, sanitized content.
- Keep templates inactive until preview data, variable coverage, and permissions are reviewed.

### Common user flows

- **Create a proposal:** select a Company or Opportunity template, preview CRM fields, generate a PDF, and save audit history — the PDF attaches to the new Document record, reachable from the source record's Documents tab.
- **Follow up on a record:** render an updated template against the record's current CRM data, generate a fresh PDF, and get a new Document record with a new audit entry — no separate send step required.
- **Regenerate a document:** open the record's Documents tab, find a previous document, and rerun the template with current CRM data.
- **Run a bulk workflow:** iterate over filtered records, render one document per item, and keep each output isolated on its own Document record.

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

## Generating documents from any record

The primary, zero-configuration way to generate a document is the **Generate Document**
command-menu item. Select any record — on any standard or custom object, no per-object setup
required — open the command menu, and choose **Generate Document**. This works out of the box
because it does not depend on a page layout being customized for that object.

### Documents history tab (optional, per-object)

The app also ships a Documents widget (a real front component) that shows document history
filtered by the current record's type and ID, with a link to each Document record's own Files
tab. It comes pre-attached to Company, Person,
and Opportunity record pages. Admins who want the same dedicated tab on another object (a custom
object, Task, Note, etc.) can attach it manually, per object, through Twenty's own UI:

1. Open the record page for the object (e.g., Task, custom "Proposal" object).
2. Go to **Settings → Data Model → [Object] → Page Layout** (or use the **+** tab button on the
   record page).
3. Add a new tab, name it "Documents".
4. Add a **Front Component** widget and select the Documents history front component from this
   app.
5. Save the layout.

### Why there's no fully dynamic Documents tab

Twenty's page-layout system is compile-time/static: which tabs and widgets exist on an object's
record page is defined ahead of time (via the Settings UI or an app's object/page-layout
definitions), not computed per-request. That means a single Documents *tab* cannot automatically
appear on every current and future custom object without either rebuilding the app or an admin
attaching it by hand as described above. The two mechanisms that *do* work without a rebuild for
an arbitrary object are: the **Generate Document** command-menu item (available everywhere, zero
configuration) and manually attaching the Documents history widget via the Data Model UI
(per-object, admin-driven, no rebuild required — just a UI action).

## PDF Generation

PDF generation uses Puppeteer with Chromium. Requires Chromium installed on the server.

### Docker deployment (recommended)

Use the provided Dockerfile that extends Twenty with Chromium:

```bash
# Clone and build
git clone https://github.com/md-riaz/documents-templates-twenty-app.git
cd documents-templates-twenty-app/docker

# Create .env file
cp .env.example .env
# Edit .env with your settings

# Build and start
docker compose up -d
```

The Dockerfile installs Alpine's musl-native Chromium automatically. See `docker/Dockerfile`.

### VPS deployment (non-Docker)

On Ubuntu/Debian:

```bash
# Install Chromium
sudo apt update
sudo apt install -y chromium-browser

# Set environment variables
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Or add to /etc/environment for persistence
echo 'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true' | sudo tee -a /etc/environment
echo 'PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser' | sudo tee -a /etc/environment
```

On Alpine (if running Twenty without Docker):

```bash
apk add --no-cache chromium nss freetype harfbuzz ttf-freefont font-noto dbus
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

On RHEL/CentOS/Fedora:

```bash
sudo dnf install -y chromium
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### How it works

1. Templates are rendered to HTML using Handlebars + CRM data
2. Puppeteer converts HTML to PDF using system Chromium
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
