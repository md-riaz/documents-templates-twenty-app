import { definePageLayoutTab, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_FIELDS,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_TAB_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_HTML_SOURCE_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

export default definePageLayoutTab({
  universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  title: 'Fields',
  icon: 'IconList',
  position: 0,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [
    {
      universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'Fields',
      type: 'FIELDS',
      gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
      configuration: {
        configurationType: 'FIELDS',
      },
    },
    {
      universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_HTML_SOURCE_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'HTML Source',
      type: 'FIELD',
      gridPosition: { row: 4, column: 0, rowSpan: 4, columnSpan: 4 },
      configuration: {
        configurationType: 'FIELD',
        fieldMetadataId: DOCUMENT_TEMPLATE_FIELDS.htmlSource,
        fieldDisplayMode: 'FIELD',
      },
    },
  ],
});
