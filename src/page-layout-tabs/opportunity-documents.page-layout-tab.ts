import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

export default definePageLayoutTab({
  universalIdentifier: '0951a49e-d410-44d8-8b8b-3c450c665d48',
  pageLayoutUniversalIdentifier: STANDARD_PAGE_LAYOUT.opportunityRecordPage.universalIdentifier,
  title: 'Documents',
  icon: 'IconFileText',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [{
    universalIdentifier: '45436271-3b58-449f-8f7b-0fb4ca866401',
    title: 'Document Activity',
    type: 'TIMELINE',
    gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
    configuration: {
      configurationType: 'TIMELINE',
    },
  }],
});
