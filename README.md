# Documents & Templates for Twenty CRM

Documents & Templates is a Twenty CRM app for creating reusable HTML/CSS templates, previewing them with CRM data, generating PDFs, saving generated-document history, and sending templated email.

## User guide

### Quick start

1. Open **Documents & Templates** from the Twenty navigation menu.
2. Create or select a template in the template library.
3. Add Handlebars HTML, optional CSS, default subject, preview JSON, and allowed outputs.
4. Use the live preview to validate variables before publishing.
5. From a supported record page, choose **Generate Document** or **Send Templated Email**.
6. Review the rendered content, optionally generate a PDF, then save or send.
7. Use the **Documents** record tab to review generated-document history.

### Template authoring basics

- Use Handlebars expressions such as `{{person.name}}`, `{{company.name}}`, and loops such as `{{#each opportunities}}...{{/each}}`.
- Keep unsafe HTML out of user-supplied fields; normal `{{variable}}` output is escaped by default.
- Use triple-stash only for trusted, sanitized content.
- Add preview JSON that matches the expected CRM context so editors can validate before sending.

### Common user flows

- **Create a proposal:** select a Company template, preview company/opportunity fields, generate a PDF, and save it to history.
- **Send a follow-up email:** choose an email-ready template, verify recipients and rendered subject, optionally attach the PDF, then send.
- **Regenerate a document:** open the record history tab, find the previous generated document, and run the template again with current CRM data.

## Screenshots placeholders

Marketplace screenshots are tracked as placeholder briefs until final UI captures are approved:

- [Template library](docs/screenshots/01-template-library.md)
- [Template editor](docs/screenshots/02-template-editor.md)
- [Generate document modal](docs/screenshots/03-generate-document-modal.md)
- [Send email modal](docs/screenshots/04-send-email-modal.md)
- [Workflow builder](docs/screenshots/05-workflow-builder.md)

## Workflow examples

See [docs/workflow-examples.md](docs/workflow-examples.md) for single-record, bulk iterator, and email/PDF chaining examples.

## SDK examples

See [examples/sdk-usage.ts](examples/sdk-usage.ts) for typed SDK usage, provider registration, template listing, render, PDF, and email calls.

## Marketplace readiness

- Release notes: [docs/release-notes.md](docs/release-notes.md)
- Admin guide: [docs/admin-guide.md](docs/admin-guide.md)
- CI commands: [docs/ci-commands.md](docs/ci-commands.md)

## Verification

Run the release verification command from the app root:

```bash
node ./node_modules/typescript/bin/tsc --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck && npm test
```

If a local Twenty server and CLI script are available, also run:

```bash
yarn twenty dev --once --dry-run
```
