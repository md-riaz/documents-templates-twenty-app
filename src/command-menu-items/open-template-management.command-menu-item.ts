import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  OPEN_TEMPLATE_MANAGEMENT_COMMAND_UNIVERSAL_IDENTIFIER,
} from 'src/constants/model-identifiers';

const openTemplateManagementCommandMenuItem = defineCommandMenuItem({
  universalIdentifier: OPEN_TEMPLATE_MANAGEMENT_COMMAND_UNIVERSAL_IDENTIFIER,
  label: 'Open Template Management',
  shortLabel: 'Templates',
  icon: 'IconTemplate',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});

export default openTemplateManagementCommandMenuItem;

