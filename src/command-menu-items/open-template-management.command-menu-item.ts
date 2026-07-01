import { OPEN_TEMPLATE_MANAGEMENT_COMMAND_UNIVERSAL_IDENTIFIER } from 'src/constants/model-identifiers';

export const openTemplateManagementCommandMenuItem = {
  universalIdentifier: OPEN_TEMPLATE_MANAGEMENT_COMMAND_UNIVERSAL_IDENTIFIER,
  label: 'Open Template Management',
  icon: 'IconTemplate',
  section: 'Documents & Templates',
  route: '/objects/documentTemplate',
  requiredPermissionScope: 'viewTemplates',
};
