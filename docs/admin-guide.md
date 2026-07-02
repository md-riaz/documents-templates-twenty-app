# Admin guide — Documents & Templates

## Admin guide overview

This guide helps Twenty workspace administrators install, configure, verify, and release the Documents & Templates app internally or through a marketplace review process.

## Permissions

Grant the default app role only to users who need document automation.

| Scope | Recommended users | Purpose |
| --- | --- | --- |
| `viewTemplates` | Sales, success, operations | Browse and preview active templates. |
| `manageTemplates` | Template owners/admins | Create, edit, deactivate, and version templates. |
| `generateDocuments` | Sales, success, operations | Render documents, generate PDFs, and save document records. |
| `viewDocuments` | Record collaborators | View document history. |
| `deleteDocuments` | Admins/compliance owners | Remove document records where policy allows. |

UI visibility is convenience only; logic functions enforce permissions server-side.

## DocumentTemplate field reference

For admins/integrators authoring templates programmatically (see the README's
"Creating a template" section for the UI path):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | TEXT | Yes | Display name shown in template pickers. |
| `htmlSource` | TEXT | Yes | Handlebars markup. |
| `boundObjectName` | TEXT | No | Twenty object singular name (e.g. `company`, or any custom object). Validated against live metadata when saved through the Template Editor UI; not enforced for direct API writes that bypass the editor. |
| `previewData` | RAW_JSON | No | Sample context for the live preview. |
| `variables` | RAW_JSON | No | Optional explicit variable metadata; the editor also auto-discovers variables from `htmlSource` and the bound object's schema. |
| `allowedOutputTypes` | ARRAY | No (default `['PDF']`) | Informational; does not currently gate `Generate PDF`. |
| `status` | SELECT | No (default `ACTIVE`) | `DRAFT` / `ACTIVE` / `ARCHIVED` — only `ACTIVE` templates appear in **Generate Document**. |

## Configuration

1. Confirm the app package uses `twenty-sdk` and `twenty-client-sdk` versions compatible with the installed workspace.
2. Review marketplace metadata placeholders in `src/application-config.ts` before external submission.
3. Configure PDF defaults in the app settings surface before enabling PDF output for users.
4. Register any custom SDK context providers before workflows rely on provider-specific variables.

## Operational guidance

- Keep templates inactive until preview data and permission coverage have been reviewed.
- Prefer escaped Handlebars expressions for user data.
- Treat generated PDFs, attached to their Document record, as customer-facing files subject to retention policy.
- Document records ARE the primary file location (via their own Files tab) — not just audit/history metadata.
- Audit PDF-generation errors from document statuses.

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
- **Template renders missing data:** check bound object/context provider name, record type, permissions, and preview JSON.
- **PDF generation fails:** verify browser/PDF adapter availability and storage upload configuration.
- **Attachment missing on the Document record:** verify the storage adapter is configured and a Document record was saved (via Save Document) before Generate PDF ran, since the PDF attaches to that record's ID.
