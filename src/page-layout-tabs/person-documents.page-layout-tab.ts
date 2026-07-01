import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

export default definePageLayoutTab({
  universalIdentifier: '596b907d-db12-437e-a76c-6e4a598a34ab',
  pageLayoutUniversalIdentifier: STANDARD_PAGE_LAYOUT.personRecordPage.universalIdentifier,
  title: 'Documents',
  icon: 'IconFileText',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [{
    universalIdentifier: '9dc0b870-8baf-46ab-9bd8-099183f06901',
    title: 'Document Activity',
    type: 'TIMELINE',
    gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
    configuration: {
      configurationType: 'TIMELINE',
    },
  }],
});
