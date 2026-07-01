# Release notes — Documents & Templates 0.1.0

## 0.1.0

Initial internal/marketplace release candidate for the Twenty CRM Documents & Templates app.

### Added

- Template library and editor for HTML, CSS, preview JSON, variable browsing, and version creation.
- Handlebars rendering core with helpers, CSS combination, escaping, validation, and error mapping.
- Context providers for common Twenty record types plus SDK provider registration.
- Record actions and modals for generating documents and sending templated documents.
- Generated-document history tab filtered by primary object and record ID.
- PDF settings and HTML-to-PDF adapter boundary, including source-record attachment support when record context is available.
- Documents settings, recipient validation, text fallback, optional PDF attachment, and send logging.
- Workflow actions: Render Template, Generate PDF, Generate Documents, and Save Generated Document.
- Typed SDK wrappers and usage examples.
- Acceptance, accessibility, i18n, security, and audit-trail tests.

### Known limitations

- `yarn twenty dev --once --dry-run` requires a local Twenty server and CLI support; if unavailable, document the blocker rather than treating it as an app failure.
- Marketplace screenshots are placeholders until product-approved captures are available.
- PDF and documents implementations depend on configured runtime adapters in the target Twenty environment.

### Verification

Release verification command:

```bash
node ./node_modules/typescript/bin/tsc --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck && npm test
```

Optional Twenty dry-run command when supported locally:

```bash
yarn twenty dev --once --dry-run
```
