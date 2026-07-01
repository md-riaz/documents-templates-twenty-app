import { GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER } from 'src/constants/model-identifiers';

export const generateDocumentCommandMenuItem = {
  universalIdentifier: GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
  label: 'Generate Document',
  icon: 'IconFileText',
  section: 'Documents & Templates',
  frontComponent: 'document-shell',
  context: 'record',
  requiredPermissionScope: 'generateDocuments',
};
