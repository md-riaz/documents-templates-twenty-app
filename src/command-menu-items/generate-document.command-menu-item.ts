import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
} from 'src/constants/model-identifiers';

const generateDocumentCommandMenuItem = defineCommandMenuItem({
  universalIdentifier: GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
  label: 'Generate Document',
  shortLabel: 'Generate',
  icon: 'IconFileText',
  availabilityType: 'GLOBAL_OBJECT_CONTEXT',
  frontComponentUniversalIdentifier: DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});

export default generateDocumentCommandMenuItem;

