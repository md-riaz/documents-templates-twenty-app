import { DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS, DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS } from 'src/constants/model-identifiers';

const makeDocumentsPageLayoutTab = (object: keyof typeof DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS) => ({
  universalIdentifier: DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS[object],
  label: 'Documents',
  object,
  position: 60,
  widgets: [
    {
      universalIdentifier: DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS[object],
      type: 'front-component',
      component: 'document-shell',
      props: { mode: 'record-history', primaryObjectType: object },
    },
  ],
  requiredPermissionScope: 'viewGeneratedDocs',
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
