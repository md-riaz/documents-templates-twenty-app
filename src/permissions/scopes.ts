export const DOCUMENTS_TEMPLATES_PERMISSION_SCOPES = [
  'viewTemplates',
  'manageTemplates',
  'generateDocuments',
  'sendEmails',
  'viewGeneratedDocs',
  'deleteGeneratedDocs',
] as const;

export type DocumentsTemplatesPermissionScope =
  (typeof DOCUMENTS_TEMPLATES_PERMISSION_SCOPES)[number];

export const PERMISSION_SCOPE_LABELS: Record<DocumentsTemplatesPermissionScope, string> = {
  viewTemplates: 'View templates',
  manageTemplates: 'Manage templates',
  generateDocuments: 'Generate documents',
  sendEmails: 'Send templated emails',
  viewGeneratedDocs: 'View generated documents',
  deleteGeneratedDocs: 'Delete generated documents',
};
