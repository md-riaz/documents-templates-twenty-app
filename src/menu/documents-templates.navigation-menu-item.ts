import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  DOCUMENTS_TEMPLATES_NAVIGATION_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/model-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DOCUMENTS_TEMPLATES_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.VIEW,
  name: 'Templates',
  icon: 'IconTemplate',
  position: 40,
  viewUniversalIdentifier: DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
});
