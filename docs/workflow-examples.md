# Workflow examples — Documents & Templates

These examples show how to compose the registered workflow actions in Twenty.

## Example 1: single-record proposal PDF

Trigger: record action or workflow on a Company/Opportunity record.

1. **Render Template**
   - `templateId`: proposal template ID
   - `primaryObjectType`: `company` or `opportunity`
   - `primaryRecordId`: trigger record ID
2. **Generate PDF**
   - `html`: output from Render Template
   - `generatedDocumentId`: optional saved record ID
   - `sourceObjectName`: trigger object type
   - `sourceRecordId`: trigger record ID
3. **Save Generated Document**
   - `templateId`: proposal template ID
   - `primaryObjectType`: trigger object type
   - `primaryRecordId`: trigger record ID
   - `renderedHtml`: rendered HTML
   - `pdfUrl`: PDF output URL

Expected result: the proposal PDF is attached to the source CRM record, and the record history tab shows audit details with the PDF link.

## Example 2: send templated email with PDF attachment

Trigger: manual workflow from a Person or Opportunity record.

1. **Render Template** for preview and subject data.
2. **Generate PDF** if the template allows PDF output.
3. **Send Templated Email**
   - `templateId`: email-ready template
   - `recipients`: validated email addresses
   - `subjectOverride`: optional Handlebars subject
   - `attachPdf`: `true`
   - `pdfUrl`: generated PDF URL
4. **Save Generated Document** with status `sent` or error status from the email action.

Expected result: recipient receives escaped text fallback plus HTML body, and the GeneratedDocument audit fields record send status.

## Example 3: BulkIterator renewal notices

Trigger: scheduled workflow or filtered list iterator.

1. Use a **BulkIterator** over expiring contracts/opportunities.
2. For each item, run **Render Template** with the iterator record ID.
3. Run **Send Templated Email** per item.
4. Run **Save Generated Document** per item with the returned status and message ID.

Bulk guidance:

- Keep each iterator output isolated; do not reuse mutable render results between records.
- Prefer idempotency keys in external transport adapters if available.
- Capture per-record errors so one failed recipient does not cancel the whole batch.

## Example 4: Global trigger requirements

For Global triggers, pass all context explicitly:

- `templateId`
- `primaryObjectType`
- `primaryRecordId`
- any `contextOverrides` required by the selected template

Global triggers do not automatically know which CRM record to load, so missing object type or record ID should be treated as a workflow configuration error.
