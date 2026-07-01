import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  GENERATED_DOCUMENTS_NAVIGATION_UNIVERSAL_IDENTIFIER,
  GENERATED_DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/model-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: GENERATED_DOCUMENTS_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.VIEW,
  name: 'Generated Documents',
  icon: 'IconFileText',
  position: 41,
  viewUniversalIdentifier: GENERATED_DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
});
