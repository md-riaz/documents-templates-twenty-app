# Workflow examples — Documents & Templates

This app ships its logic as Twenty workflow-builder steps (logic functions carrying
`workflowActionTriggerSettings`): **Render Template**, **Generate PDF**, and **Save
Document**. There is no app-internal "workflow action registry" — a step you add in Twenty's
workflow builder UI is a logic function, and you chain these three steps together directly in
the builder to go from a template to an attached, audited PDF. The app does not send documents;
it renders, generates a PDF, attaches it to the Document record, and saves an audit record.

## Example 1: single-record proposal PDF

Trigger: record action or workflow on a Company/Opportunity record.

1. **Render Template**
   - `templateId`: proposal template ID
   - `primaryObjectType`: `company` or `opportunity`
   - `primaryRecordId`: trigger record ID
2. **Save Document**
   - `templateId`: proposal template ID
   - `primaryObjectType`: trigger object type
   - `primaryRecordId`: trigger record ID
   - `renderedHtml`: rendered HTML
3. **Generate PDF**
   - `html`: output from Render Template
   - `documentId`: the ID returned by Save Document

Expected result: the proposal PDF attaches to the new Document record, and the source record's
Documents tab shows a "View Document" link to it alongside the audit history.

## Example 2: BulkIterator renewal notices

Trigger: scheduled workflow or filtered list iterator.

1. Use a **BulkIterator** over expiring contracts/opportunities.
2. For each item, chain **Render Template** → **Save Document** → **Generate PDF** with
   the iterator record ID.

Bulk guidance:

- Keep each iterator output isolated; do not reuse mutable render results between records.
- Capture per-record errors so one failed record does not cancel the whole batch.

## Example 3: Global trigger requirements

For Global triggers, pass all context explicitly:

- `templateId`
- `primaryObjectType`
- `primaryRecordId`
- any `contextOverrides` required by the selected template

Global triggers do not automatically know which CRM record to load, so missing object type or
record ID should be treated as a workflow configuration error.
