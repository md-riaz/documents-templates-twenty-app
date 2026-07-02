# Release notes — Documents & Templates

## 0.2.2

### Changed

- **`GeneratedDocument` renamed to `Document`.** The app's two core object types now plainly read
  as **Template** and **Document** — `nameSingular`/`namePlural`/labels, every constant, file,
  logic function, front-component export, and permission scope (`viewGeneratedDocs`/
  `deleteGeneratedDocs` → `viewDocuments`/`deleteDocuments`) were renamed accordingly. Object and
  field universal identifiers are unchanged (only their JS constant names changed) — this is a
  pure rename, not a new schema.
- **Removed the duplicate PDF attachment.** `generatePdfFromHtmlLogic` previously uploaded and
  attached the generated PDF to *two* records: the source CRM record (e.g. a Company) and the
  Document audit record itself. Since a record's "Documents" tab already lists its related
  Document records, attaching to the source record too was a redundant second copy of the same
  file. The PDF now attaches only to the Document record.
- **Added a "View Document" link to the Documents tab.** Removing the duplicate attachment would
  otherwise have made the PDF harder to reach from the source CRM record — there was previously no
  way to navigate from that tab to a Document record's own page (only a direct link to the signed,
  ~24h-expiring `pdfUrl`). `document-shell.front-component.tsx` now links to the Document record's
  own page (`/object/document/{id}`, built from `twenty-sdk/front-component`'s exported `AppPath`
  enum) alongside the existing quick-view PDF link.
- Deleted `src/adapters/twenty-storage.adapter.ts` — confirmed dead (no callers besides its own
  `index.ts` re-export) and independently broken (a fictional `uploadFile` GraphQL mutation, a
  fictional `Attachment.file` shape, and a `RECORD_TYPE_FIELD_MAP` lookup whose casing never
  matched its own keys). Superseded entirely by `createCoreStorageAdapter`.

## 0.2.1

### Fixed

Found and fixed by deploying the app to a real Twenty workspace and exercising render → PDF
generation end-to-end for the first time — these bugs were invisible to unit tests because they
only used mocked API clients, not the real Twenty GraphQL schema.

- **`htmlSource`/`cssSource`/`renderedHtml`/`errorMessage` were `RICH_TEXT`, not `TEXT`.**
  `RICH_TEXT` is a composite `{ blocknote, markdown }` type in Twenty's schema — genql's
  `__scalar: true` (used by the generic record-repository bridge) silently omits composite
  fields, so `DocumentTemplate.htmlSource` was never actually retrievable at runtime and every
  render would fail with "Document template has no HTML source." Changed to plain `TEXT` on
  `DocumentTemplate`, `TemplateVersion`, and `GeneratedDocument`.
- **`MetadataApi`'s `isActive` filter used `eq`, which doesn't exist.** `BooleanFieldComparison`
  only supports `is`/`isNot`; the server rejects `eq` outright. Fixed in
  `src/logic/metadata/metadata-client.ts`.
- **PDF upload/attach used entirely fictional mutations.** There is no generic `uploadFile`
  GraphQL mutation on Twenty's Core API, and `AttachmentCreateInput.file` is `[{ fileId, label }]`
  (referencing an already-uploaded file), not `{ url, name, id }`. The real, documented path is
  `MetadataApiClient.uploadFile(buffer, filename, contentType, fieldMetadataUniversalIdentifier)`
  targeting Twenty's built-in `Attachment.file` FILES-type field, then `createAttachment` with the
  returned `fileId`. Rewrote `createCoreStorageAdapter` (`src/logic-functions/core-client-adapters.ts`)
  accordingly; it now takes both a `CoreApiClient` and a `MetadataApiClient`. Verified live: a
  real PDF renders, uploads, and attaches to a real CRM record.
- Removed `src/adapters/puppeteer-pdf.adapter.ts` — an unused, unwired duplicate of
  `pdf.adapter.ts` missing the container-safe `--no-sandbox` launch flags.
- **`getAttachmentField` normalized its lookup key but not the map it looked up.** The
  attachment-target map used camelCase keys (`generatedDocument`, `calendarEvent`, ...) while the
  lookup lower-cased the input, so every multi-word object name missed the map and created an
  Attachment with no target relation at all (not even an error — a silently orphaned file).
  Replaced the static map with `` `target${PascalCase(objectName)}Id` `` — confirmed live to be
  Twenty's actual, uniform naming convention across every object, including custom ones the old
  map never listed — which also finishes the "works with any object" goal for attachments.
- **Generated PDFs now also attach to the `GeneratedDocument` record itself**, in addition to the
  source CRM record, so a workflow holding only a `generatedDocumentId` can retrieve the file via
  that record's own Files tab/`attachments` relation — durable even after the cached `pdfUrl`
  (a signed link) expires. This required uploading the PDF bytes once per attachment target: Twenty
  permanently binds an uploaded file to the first Attachment it's used in and rejects reusing the
  same `fileId` for a second one ("File ... is already associated with a permanent files field",
  confirmed live) — so "upload once, attach twice" isn't possible; `generatePdfFromHtmlLogic` now
  uploads independently per configured target. `runGeneratePdf`'s output gained
  `documentAttachmentId` alongside `attachmentId`.
- **Fixed a double-submit race in the Generate Document dialog.** `controller.generate()` set
  `isGenerating` on its internal state, but the button's `disabled` prop reads React state that
  only updates after the surrounding `await` resolves, leaving a window where a second click could
  queue a duplicate save/PDF request. `generate()` now guards itself at entry, and the button
  handler syncs state immediately after starting the request instead of only after it finishes.

### Known limitation

The uploaded file's `url` is a signed download link that expires in 24 hours (a JWT `exp` claim),
so persisting it long-term in `GeneratedDocument.pdfUrl` is not durable — treat that field as a
best-effort cache, not a permanent reference. Fetching the file via the `GeneratedDocument`'s own
`Attachment` (re-signed on every query) is the durable path — see "Generated PDFs now also attach
to the `GeneratedDocument` record itself" above.

## 0.2.0

### Added

- **PDF generation via Puppeteer.** Bundled Puppeteer adapter converts rendered HTML to PDF using
  system Chromium — A4/A3/A5/Letter/Legal formats, portrait/landscape, custom margins,
  header/footer templates, and background graphics. Docker deployment (Alpine musl-native
  Chromium, no extra setup) and VPS deployment guidance (Ubuntu/Debian, Alpine, RHEL/CentOS/Fedora)
  are documented in the README.
- **Attachment to source records.** Generated PDFs upload through a Twenty storage adapter and
  attach automatically to the CRM record that triggered generation.
- **Workflow output chaining.** The Render Template → Generate PDF → Save Generated Document
  steps pass their outputs forward automatically, so a workflow author does not have to manually
  rewire each step's inputs.
- `validateTemplate` and `listTemplateVariables` standalone logic functions for checking a
  template's Handlebars syntax and enumerating its variables before publishing.
- Documents tab (generated-document history, filtered by record) shipped on Company, Person, and
  Opportunity records out of the box, with README guidance for admins who want to add it to other
  record types via Twenty's Settings → Data Model page-layout UI.

### Changed

- **Removed documents-sending.** The `sendDocuments` permission scope and all send/email code
  paths are gone. Twenty's native email handles outbound delivery; this app's scope ends at
  render → generate PDF → attach → audit. Current permission scopes are `viewTemplates`,
  `manageTemplates`, `generateDocuments`, `viewGeneratedDocs`, and `deleteGeneratedDocs`.
- **Removed `slug` and `isActive` fields** from `DocumentTemplate`. The `status` lifecycle field
  (`DRAFT` / `ACTIVE` / `ARCHIVED`) already covers activation state, and templates are addressed by
  ID rather than slug.
- Simplified app navigation to a single/two-item menu with default PDF output behavior.
- **`boundObjectName` replaces the `provider` enum.** `DocumentTemplate.provider` (a SELECT enum
  with `DEFAULT`/`company`/`person`/.../`custom` sentinel values) is now `boundObjectName`, a plain
  TEXT field naming the Twenty object (standard or custom) the template is bound to. This is a
  breaking change with no migration path — the app is in beta with no production installs to
  preserve. See `src/objects/document-template.object.ts`.
- **Runtime metadata-driven object/field discovery.** A `MetadataApi` client
  (`src/logic/metadata/metadata-client.ts`) can now be injected into context loading so templates
  work against any standard or custom object rather than a fixed list. When supplied, relation
  fields are discovered from live metadata and shallow-expanded (one level, permission-filtered)
  automatically. The old hardcoded `createDefaultContextProviders`/`loadDefaultRecordContext`
  helpers for a fixed set of standard objects (Company/Person/Opportunity/Task/Note/CalendarEvent)
  have been removed in favor of the generic, metadata-aware path.
- **Front-component and workflow registration fixed.** The template editor, generate-document
  modal, PDF settings panel, and document-shell UI are now real React components registered via
  `defineFrontComponent`; the three workflow steps (Render Template, Generate PDF, Save Generated
  Document) are registered as Twenty **logic functions** carrying `workflowActionTriggerSettings`
  (`src/logic-functions/`) — Twenty has no separate "workflow action" registration concept, so the
  old `src/workflow-actions/` descriptor module has been removed. Verified against a real
  `twenty dev:build` and a live sync: the built manifest registers all 3 front components, all 3
  logic functions, the "Generate Document" command-menu item, and the Document Template page
  layout/tab.
- **Real Handlebars renderer.** `src/logic/rendering/handlebars-renderer.ts` now delegates to the
  `handlebars` npm library instead of a hand-rolled subset, giving template authors standard syntax
  (`{{else if}}`, `{{#with}}`, subexpressions, real partials).
- Bumped to v0.2.0.

## 0.1.0

Initial internal/marketplace release candidate for the Twenty CRM Documents & Templates app.

### Added

- Template library and editor for HTML, CSS, preview JSON, variable browsing, and version creation.
- Handlebars rendering core with helpers, CSS combination, escaping, validation, and error mapping.
- Context providers for common Twenty record types plus SDK provider registration.
- Record actions and modals for generating documents.
- Generated-document history tab filtered by primary object and record ID.
- PDF settings and HTML-to-PDF adapter boundary, including source-record attachment support when
  record context is available.
- Workflow actions: Render Template, Generate PDF, and Save Generated Document.
- Typed SDK wrappers and usage examples.
- Acceptance, accessibility, i18n, security, and audit-trail tests.

### Known limitations

- `yarn twenty dev --once --dry-run` requires a local Twenty server and CLI support; if
  unavailable, document the blocker rather than treating it as an app failure.
- Marketplace screenshots are placeholders until product-approved captures are available.
- PDF generation depends on configured runtime adapters (Puppeteer/Chromium, storage) in the
  target Twenty environment.

### Verification

Release verification command:

```bash
node ./node_modules/typescript/bin/tsc --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck && npm test
```

Optional Twenty dry-run command when supported locally:

```bash
yarn twenty dev --once --dry-run
```
