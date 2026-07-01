import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

export default definePageLayoutTab({
  universalIdentifier: '0cabbf97-f800-4d3d-b3b3-3cf1f41c26e2',
  pageLayoutUniversalIdentifier: STANDARD_PAGE_LAYOUT.noteRecordPage.universalIdentifier,
  title: 'Documents',
  icon: 'IconFileText',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [{
    universalIdentifier: 'fa34fa4b-42fd-408d-a107-e5aad39dd7eb',
    title: 'Document Activity',
    type: 'TIMELINE',
    gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
    configuration: {
      configurationType: 'TIMELINE',
    },
  }],
});
