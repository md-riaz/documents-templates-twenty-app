import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

export default definePageLayoutTab({
  universalIdentifier: 'c6e58054-e52d-4fb7-8125-bc4aa53b04dd',
  pageLayoutUniversalIdentifier: STANDARD_PAGE_LAYOUT.calendarEventRecordPage.universalIdentifier,
  title: 'Documents',
  icon: 'IconFileText',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [{
    universalIdentifier: 'f76c9512-ffb0-477a-b110-db6803dd69c1',
    title: 'Document Activity',
    type: 'TIMELINE',
    gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
    configuration: {
      configurationType: 'TIMELINE',
    },
  }],
});
