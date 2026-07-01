import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

import {
  DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS,
  DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS,
  DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/model-identifiers';

const RECORD_PAGE_LAYOUTS = {
  company: STANDARD_PAGE_LAYOUT.companyRecordPage.universalIdentifier,
  person: STANDARD_PAGE_LAYOUT.personRecordPage.universalIdentifier,
  opportunity: STANDARD_PAGE_LAYOUT.opportunityRecordPage.universalIdentifier,
  task: STANDARD_PAGE_LAYOUT.taskRecordPage.universalIdentifier,
  note: STANDARD_PAGE_LAYOUT.noteRecordPage.universalIdentifier,
  calendarEvent: STANDARD_PAGE_LAYOUT.calendarEventRecordPage.universalIdentifier,
} as const;

const makeDocumentsPageLayoutTab = (object: keyof typeof DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS) => definePageLayoutTab({
  universalIdentifier: DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS[object],
  pageLayoutUniversalIdentifier: RECORD_PAGE_LAYOUTS[object],
  title: 'Documents',
  icon: 'IconFileText',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [
    {
      universalIdentifier: DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS[object],
      title: 'Generated Documents',
      type: 'front-component',
      gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});

export const companyDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('company');
export const personDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('person');
export const opportunityDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('opportunity');
export const taskDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('task');
export const noteDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('note');
export const calendarEventDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('calendarEvent');

export const documentsStandardRecordTabs = [
  companyDocumentsPageLayoutTab,
  personDocumentsPageLayoutTab,
  opportunityDocumentsPageLayoutTab,
  taskDocumentsPageLayoutTab,
  noteDocumentsPageLayoutTab,
  calendarEventDocumentsPageLayoutTab,
];

export default documentsStandardRecordTabs;
