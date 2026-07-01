import { DOCUMENTS_TEMPLATES_NAVIGATION_UNIVERSAL_IDENTIFIER } from 'src/constants/model-identifiers';

export const documentsTemplatesNavigationMenuItem = {
  universalIdentifier: DOCUMENTS_TEMPLATES_NAVIGATION_UNIVERSAL_IDENTIFIER,
  label: 'Documents & Templates',
  icon: 'IconTemplate',
  object: 'documentTemplate',
  position: 40,
  requiredPermissionScope: 'viewTemplates',
};
