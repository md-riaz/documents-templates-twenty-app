# Admin guide — Documents & Templates

## Admin guide overview

This guide helps Twenty workspace administrators install, configure, verify, and release the Documents & Templates app internally or through a marketplace review process.

## Permissions

Grant the default app role only to users who need document automation.

| Scope | Recommended users | Purpose |
| --- | --- | --- |
| `viewTemplates` | Sales, success, operations | Browse and preview active templates. |
| `manageTemplates` | Template owners/admins | Create, edit, deactivate, and version templates. |
| `generateDocuments` | Sales, success, operations | Render documents and save generated records. |
| `sendDocuments` | Authorized documents senders | Send templated documents and optional PDF attachments. |
| `viewGeneratedDocs` | Record collaborators | View generated-document history. |
| `deleteGeneratedDocs` | Admins/compliance owners | Remove generated records where policy allows. |

UI visibility is convenience only; logic functions enforce permissions server-side.

## Configuration

1. Confirm the app package uses `twenty-sdk` and `twenty-client-sdk` versions compatible with the installed workspace.
2. Review marketplace metadata placeholders in `src/application-config.ts` before external submission.
3. Configure PDF defaults in the app settings surface before enabling PDF output for users.
4. Configure documents transport through Twenty-native documents or the SMTP adapter boundary when available.
5. Register any custom SDK context providers before workflows rely on provider-specific variables.

## Operational guidance

- Keep templates inactive until preview data, permission coverage, and recipients have been reviewed.
- Prefer escaped Handlebars expressions for user data.
- Treat generated PDFs attached to source CRM records as customer-facing files subject to retention policy.
- Treat GeneratedDocument records as audit/history metadata, not the primary file location.
- Audit failed sends and PDF-generation errors from generated-document statuses.

## Release checklist

- README/user guide reviewed.
- Admin guide reviewed.
- Workflow examples reviewed.
- Screenshot placeholders replaced or accepted for internal release.
- Release notes reviewed.
- CI commands executed successfully.
- `yarn twenty dev --once --dry-run` attempted when a local Twenty server and script are available.

## Troubleshooting

- **Cannot reach Twenty server:** start the local Twenty server before `yarn twenty dev --once --dry-run`.
- **Template renders missing data:** check provider name, record type, permissions, and preview JSON.
- **PDF generation fails:** verify browser/PDF adapter availability and storage upload configuration.
- **Documents is blocked:** verify recipient validation, sender permissions, and configured transport.
