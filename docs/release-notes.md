# Release notes — Documents & Templates

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
