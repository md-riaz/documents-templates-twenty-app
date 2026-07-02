import { definePageLayoutTab, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_EDITOR_TAB_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_EDITOR_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

/**
 * "Editor" tab on the app's own DocumentTemplate record page (see
 * `src/page-layouts/document-template.page-layout.ts`), hosting the rich
 * template editor front component (HTML/CSS/Preview JSON with live preview
 * and a schema-backed variable picker). Sits alongside the native "Fields"
 * tab (see `document-template-fields.page-layout-tab.ts`, position 0), which
 * handles Name/Category/Renderer/Bound Object/Status/etc. via Twenty's
 * standard field editor — this tab only covers what a native field can't do.
 *
 * NOTE: the Twenty CLI discovers entities via static analysis of the
 * `export default defineXxx({...})` expression — it must be inline (not a
 * re-exported reference to a named const), and one entity per file, or the
 * entity is silently skipped.
 */
export default definePageLayoutTab({
  universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_EDITOR_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  title: 'Editor',
  icon: 'IconFileText',
  position: 1,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [
    {
      universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_EDITOR_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'Template Editor',
      type: 'FRONT_COMPONENT',
      gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
