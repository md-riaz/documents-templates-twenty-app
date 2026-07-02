import { definePageLayoutTab, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_TAB_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

/**
 * "Fields" tab on the app's own DocumentTemplate record page (see
 * `src/page-layouts/document-template.page-layout.ts`), showing Twenty's
 * native field editor (General/System groups) for Name, Category,
 * Description, Renderer, Bound Object Name, Status, etc. — the same
 * experience every other object gets by default. The "Editor" tab (see
 * `document-template-editor.page-layout-tab.ts`) is reserved for what a
 * native field can't do: HTML/CSS/Preview JSON with live preview.
 *
 * NOTE: the Twenty CLI discovers entities via static analysis of the
 * `export default defineXxx({...})` expression — it must be inline (not a
 * re-exported reference to a named const), and one entity per file, or the
 * entity is silently skipped.
 */
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
  ],
});
