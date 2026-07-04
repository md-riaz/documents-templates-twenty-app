import { definePageLayoutTab, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_BETA_EDITOR_TAB_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_BETA_EDITOR_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  TINYMCE_BETA_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

export default definePageLayoutTab({
  universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_BETA_EDITOR_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  title: 'Editor (Beta)',
  icon: 'IconEdit',
  position: 2,
  layoutMode: PageLayoutTabLayoutMode.CANVAS,
  widgets: [
    {
      universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_BETA_EDITOR_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'TinyMCE Editor',
      type: 'FRONT_COMPONENT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: TINYMCE_BETA_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
