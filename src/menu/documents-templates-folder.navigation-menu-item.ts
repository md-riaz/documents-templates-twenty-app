import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { DOCUMENTS_TEMPLATES_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DOCUMENTS_TEMPLATES_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Documents & Templates',
  icon: 'IconFileText',
  position: 40,
});
