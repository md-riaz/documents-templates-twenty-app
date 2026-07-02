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

### DocumentTemplate fields

Every template is a `DocumentTemplate` record. Here is what each field does:

| Field | Purpose |
| --- | --- |
| **Name** | Display name shown in template pickers and the Templates list view. |
| **HTML Source** | The Handlebars HTML markup that defines your document. This is where all your HTML, CSS (`<style>` tags), and `{{variable}}` expressions go. |
| **Bound Object Name** | The Twenty object this template is designed for — e.g. `company`, `person`, `opportunity`, or any custom object. When set, the renderer automatically loads that record and its relations as template context. Validated against live metadata on save. |
| **Status** | `ACTIVE` (default), `DRAFT`, or `ARCHIVED`. Only **Active** templates appear in the Generate Document picker. |
| **Category** | Optional grouping — link to a `TemplateCategory` record for organizing templates (e.g. "Sales", "Onboarding"). |
| **Preview Data** | Sample JSON context for the live preview. Lets you see what the rendered document looks like without saving or loading a real record. |
| **Variables** | Optional explicit variable schema (JSON). The editor also auto-discovers variables from `htmlSource` and the bound object's field schema. |
| **Allowed Output Types** | Defaults to `['PDF']`. Informational — does not currently gate output. |
| **Version** | Auto-incremented version number. Each save that changes HTML Source creates a `TemplateVersion` snapshot. |
| **Description** | Optional rich-text description for documentation purposes. |

### Step 1: Create a template

1. Open **Documents & Templates → Templates** in the left navigation menu.
2. Click **+ Add New** — Twenty creates the record with defaults (`status: Active`).
3. Open the new row. The record page has two tabs:

   **Fields tab** (opens by default) — Twenty's native field editor with all the fields
   listed above. The **HTML Source** field has a large editing area at the bottom of this
   tab, so you can write Handlebars markup directly here.

   **Preview tab** — a rich editor with a variable picker (showing fields from the bound
   object's schema) and a live rendered preview of your template against the Preview Data.

4. Fill in the key fields:
   - **Name** — give the template a descriptive name (e.g. "Opportunity Proposal").
   - **Bound Object Name** — set this to the object you'll generate documents from (e.g.
     `opportunity`). This tells the renderer which record to load and which relations are
     available.
   - **HTML Source** — write your Handlebars HTML (see "Writing HTML Source" below).
   - **Preview Data** — paste sample JSON so you can preview the output without a real
     record.
   - **Status** — leave as `ACTIVE` (or set to `DRAFT` while authoring).

5. Switch to the **Preview** tab to see the rendered output. The preview updates
   client-side from Preview Data — no save needed.
6. Save the record. Changing HTML Source on an existing template automatically creates a
   `TemplateVersion` snapshot.

### Step 2: Generate a document from a template

1. Navigate to any CRM record (e.g. an Opportunity, Company, or Person).
2. Open the **command menu** (click the `⌘` button or use the keyboard shortcut) and
   choose **Generate Document**.
3. Select an **Active** template from the picker. Only templates whose `boundObjectName`
   matches the current record's object type (or templates with no bound object) appear.
4. The app renders the template against the live CRM record — you see a preview of the
   final HTML.
5. Click **Generate PDF** to convert the rendered HTML to a PDF and save it.
6. The app creates a **Document** audit record linked to the source CRM record, generates
   the PDF via Puppeteer, uploads it to Twenty's file storage, and attaches it to the
   Document record.
7. The source record's **Documents** tab now shows the new Document with a "View Document"
   link. The Document record's own **Files** tab holds the PDF — durable, re-signed on
   every query (the cached `pdfUrl` expires after ~24h).

You can also automate this with workflows — see
[docs/workflow-examples.md](docs/workflow-examples.md) for a step-by-step walkthrough of
chaining **Render Template → Save Document → Generate PDF** in Twenty's workflow builder.

### Writing HTML Source (Handlebars guide)

Templates use [Handlebars](https://handlebarsjs.com/) syntax inside standard HTML. The
renderer loads the bound object's record and its **first-level relations** automatically,
so you can reference related data without any extra setup.

#### Basic variables

Use `{{object.field}}` to insert a field value. The top-level key is always the bound
object's singular name:

```handlebars
<!-- boundObjectName: "company" -->
<h1>{{company.name}}</h1>
<p>Domain: {{company.domainName}}</p>
<p>Employees: {{company.employees}}</p>
```

```handlebars
<!-- boundObjectName: "person" -->
<h1>{{person.name.firstName}} {{person.name.lastName}}</h1>
<p>Email: {{person.email}}</p>
<p>Job title: {{person.jobTitle}}</p>
```

#### Accessing related objects (relations)

When the renderer loads a record, it **shallow-expands one level of relations** from live
metadata. This means you can access any directly related object's fields using dot
notation — no extra configuration needed:

```handlebars
<!-- boundObjectName: "opportunity" -->
<h1>{{opportunity.name}}</h1>
<p>Company: {{opportunity.company.name}}</p>
<p>Contact: {{opportunity.pointOfContact.name.firstName}} {{opportunity.pointOfContact.name.lastName}}</p>
<p>Contact title: {{opportunity.pointOfContact.jobTitle}}</p>
<p>Deal value: ${{opportunity.amount.amountMicros}}</p>
<p>Stage: {{opportunity.stage}}</p>
<p>Close date: {{opportunity.closeDate}}</p>
```

```handlebars
<!-- boundObjectName: "person" -->
<h1>{{person.name.firstName}} {{person.name.lastName}}</h1>
<p>Works at: {{person.company.name}}</p>
<p>Company domain: {{person.company.domainName}}</p>
```

The available relation paths depend on the object's schema in your workspace. Use the
**variable picker** in the Preview tab to browse all available fields and relations for
the bound object — click any field to insert its `{{path}}` automatically.

#### Conditionals

```handlebars
{{#if opportunity.closeDate}}
  <p>Target close: {{opportunity.closeDate}}</p>
{{else}}
  <p>Close date not set</p>
{{/if}}
```

#### Loops

```handlebars
{{#each items}}
  <tr>
    <td>{{this.name}}</td>
    <td>{{this.quantity}}</td>
    <td>{{this.price}}</td>
  </tr>
{{/each}}
```

#### Built-in helpers

The renderer includes standard Handlebars helpers (`#if`, `#unless`, `#each`, `#with`)
and a set of utility helpers:

```handlebars
{{uppercase company.name}}          {{!-- "ACME CORPORATION" --}}
{{lowercase person.email}}           {{!-- "ada@example.com" --}}
{{capitalize opportunity.stage}}     {{!-- "Proposal" --}}
{{formatDate opportunity.closeDate}} {{!-- formatted date string --}}
```

#### Embedding CSS

Put `<style>` tags directly in `htmlSource` — there is no separate CSS field. This keeps
everything in one place and ensures the PDF renderer sees the same styles:

```html
<style>
  body { font-family: 'Segoe UI', sans-serif; color: #1a1a2e; }
  .header { background: #1a1a2e; color: white; padding: 40px; }
  .amount { font-size: 28px; font-weight: 700; color: #0f3460; }
</style>

<div class="header">
  <h1>Proposal for {{opportunity.company.name}}</h1>
</div>
<p class="amount">${{opportunity.amount.amountMicros}}</p>
```

#### HTML escaping

- `{{variable}}` — auto-escaped (safe for user-supplied data).
- `{{{variable}}}` — unescaped (raw HTML). Only use for trusted, sanitized content.

#### Preview Data example

The **Preview Data** field (JSON) lets you test your template without a real record. Its
shape should mirror the context the renderer produces — the bound object name as the
top-level key, with nested relations:

```json
{
  "opportunity": {
    "name": "Enterprise CRM Migration",
    "stage": "PROPOSAL",
    "closeDate": "2026-08-15",
    "amount": { "amountMicros": 75000000000, "currencyCode": "USD" },
    "company": { "name": "Acme Corporation" },
    "pointOfContact": {
      "name": { "firstName": "Sarah", "lastName": "Chen" },
      "jobTitle": "VP of Operations"
    }
  }
}
```

### Creating a template programmatically

For bulk-seeding, CI, or migrations, use `twenty-client-sdk`'s `CoreApiClient` directly:

```ts
import { CoreApiClient } from 'twenty-client-sdk/core';

const client = new CoreApiClient();
await client.mutation({
  createDocumentTemplate: {
    __args: {
      data: {
        name: 'Opportunity Proposal',
        htmlSource: '<h1>Proposal for {{opportunity.company.name}}</h1>...',
        boundObjectName: 'opportunity',
        status: 'ACTIVE',
        previewData: JSON.stringify({
          opportunity: {
            name: 'Sample Deal',
            company: { name: 'Acme Corp' },
            pointOfContact: { name: { firstName: 'Jane', lastName: 'Doe' } },
          },
        }),
      },
    },
    id: true,
  },
});
```

See [docs/admin-guide.md](docs/admin-guide.md) for the full field reference.

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
