# Workflow examples — Documents & Templates

This app ships its logic as Twenty workflow-builder steps (logic functions carrying
`workflowActionTriggerSettings`): **Render Template**, **Generate PDF**, and **Save
Document**. There is no app-internal "workflow action registry" — a step you add in Twenty's
workflow builder UI is a logic function, and you chain these three steps together directly in
the builder to go from a template to an attached, audited PDF. The app does not send documents;
it renders, generates a PDF, attaches it to the Document record, and saves an audit record.

## Example 1: Opportunity Proposal PDF (default example)

This is the out-of-the-box example workflow that ships with the app. It generates a
professional proposal PDF from an Opportunity record using the pre-installed
"Opportunity Proposal" template (bound to the `opportunity` object, status `ACTIVE`).

### Setup in Twenty's Workflow Builder

1. **Create a new workflow** in Twenty (Settings > Workflows > + New).
2. **Trigger**: choose "Record Action" on the **Opportunity** object — this makes the
   workflow available from the command menu on any Opportunity record page.
3. Add three steps, in order:

#### Step 1 — Render Template

| Input | Value |
| --- | --- |
| Template ID | ID of the "Opportunity Proposal" template (find it in the Templates view) |
| Primary object type | `opportunity` |
| Primary record ID | `{{trigger.recordId}}` (the Opportunity that triggered the workflow) |

The renderer loads the Opportunity record and its related Company and Point of Contact,
merges them into the Handlebars template, and outputs rendered HTML.

#### Step 2 — Save Document

| Input | Value |
| --- | --- |
| Template ID | Same template ID as step 1 |
| Primary object type | `opportunity` |
| Primary record ID | `{{trigger.recordId}}` |
| Rendered HTML | `{{step1.html}}` (output from Render Template) |

This creates a Document audit record linked to the Opportunity and returns its `documentId`.

#### Step 3 — Generate PDF

| Input | Value |
| --- | --- |
| HTML | `{{step1.html}}` (output from Render Template) |
| Document ID | `{{step2.documentId}}` (output from Save Document) |
| File name | `proposal-{{trigger.recordId}}.pdf` (optional, for a readable filename) |

Puppeteer converts the HTML to an A4 PDF, uploads it to Twenty file storage, and attaches
it to the Document record. The Document's status updates to `PDF_GENERATED`.

### Result

- The Opportunity's **Documents** tab shows the new Document record with a "View Document"
  link.
- The Document record's own **Files** tab holds the generated PDF — durable, re-signable
  on every query (unlike the cached `pdfUrl` which expires after ~24h).
- The workflow run log in Twenty shows each step's inputs and outputs for debugging.

### Template fields used

The "Opportunity Proposal" template uses these Handlebars expressions (all resolved
automatically from the Opportunity record and its relations):

- `{{opportunity.name}}` — deal name
- `{{opportunity.stage}}` — pipeline stage (displayed as a badge)
- `{{opportunity.closeDate}}` — target close date
- `{{opportunity.amount.amountMicros}}` — deal value (Twenty stores currency in micros)
- `{{opportunity.company.name}}` — related company name
- `{{opportunity.pointOfContact.name.firstName}}` / `{{...lastName}}` — contact name
- `{{opportunity.pointOfContact.jobTitle}}` — contact title

## Example 2: single-record Company/Person PDF

Trigger: record action or workflow on a Company or Person record.

1. **Render Template**
   - `templateId`: template ID (bound to `company` or `person`)
   - `primaryObjectType`: `company` or `person`
   - `primaryRecordId`: trigger record ID
2. **Save Document**
   - `templateId`: same template ID
   - `primaryObjectType`: trigger object type
   - `primaryRecordId`: trigger record ID
   - `renderedHtml`: output from Render Template
3. **Generate PDF**
   - `html`: output from Render Template
   - `documentId`: the ID returned by Save Document

Expected result: the proposal PDF attaches to the new Document record, and the source record's
Documents tab shows a "View Document" link to it alongside the audit history.

## Example 3: BulkIterator renewal notices

Trigger: scheduled workflow or filtered list iterator.

1. Use a **BulkIterator** over expiring contracts/opportunities.
2. For each item, chain **Render Template** → **Save Document** → **Generate PDF** with
   the iterator record ID.

Bulk guidance:

- Keep each iterator output isolated; do not reuse mutable render results between records.
- Capture per-record errors so one failed record does not cancel the whole batch.

## Example 4: Global trigger requirements

For Global triggers, pass all context explicitly:

- `templateId`
- `primaryObjectType`
- `primaryRecordId`
- any `contextOverrides` required by the selected template

Global triggers do not automatically know which CRM record to load, so missing object type or
record ID should be treated as a workflow configuration error.
