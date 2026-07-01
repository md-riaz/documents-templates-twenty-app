export const DOCUMENTS_TEMPLATES_PERMISSION_SCOPES = [
  'viewTemplates',
  'manageTemplates',
  'generateDocuments',
  'viewGeneratedDocs',
  'deleteGeneratedDocs',
] as const;

export type DocumentsTemplatesPermissionScope =
  (typeof DOCUMENTS_TEMPLATES_PERMISSION_SCOPES)[number];

export const PERMISSION_SCOPE_LABELS: Record<DocumentsTemplatesPermissionScope, string> = {
  viewTemplates: 'View templates',
  manageTemplates: 'Manage templates',
  generateDocuments: 'Generate documents',
  viewGeneratedDocs: 'View generated documents',
  deleteGeneratedDocs: 'Delete generated documents',
};
