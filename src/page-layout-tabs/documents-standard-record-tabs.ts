import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

import {
  DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS,
  DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS,
  DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

const RECORD_PAGE_LAYOUTS = {
  company: STANDARD_PAGE_LAYOUT.companyRecordPage.universalIdentifier,
  person: STANDARD_PAGE_LAYOUT.personRecordPage.universalIdentifier,
  opportunity: STANDARD_PAGE_LAYOUT.opportunityRecordPage.universalIdentifier,
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
      type: 'FRONT_COMPONENT',
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

export const documentsStandardRecordTabs = [
  companyDocumentsPageLayoutTab,
  personDocumentsPageLayoutTab,
  opportunityDocumentsPageLayoutTab,
];

export default documentsStandardRecordTabs;
