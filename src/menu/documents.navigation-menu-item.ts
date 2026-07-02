import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  DOCUMENTS_NAVIGATION_UNIVERSAL_IDENTIFIER,
  DOCUMENTS_TEMPLATES_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
  DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DOCUMENTS_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.VIEW,
  name: 'Documents',
  icon: 'IconFileText',
  position: 0,
  folderUniversalIdentifier: DOCUMENTS_TEMPLATES_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
  viewUniversalIdentifier: DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
});
