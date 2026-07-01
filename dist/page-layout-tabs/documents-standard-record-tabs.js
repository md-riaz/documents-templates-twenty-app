"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsStandardRecordTabs = exports.calendarEventDocumentsPageLayoutTab = exports.noteDocumentsPageLayoutTab = exports.taskDocumentsPageLayoutTab = exports.opportunityDocumentsPageLayoutTab = exports.personDocumentsPageLayoutTab = exports.companyDocumentsPageLayoutTab = void 0;
const model_identifiers_1 = require("src/constants/model-identifiers");
const makeDocumentsPageLayoutTab = (object) => ({
    universalIdentifier: model_identifiers_1.DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS[object],
    label: 'Documents',
    object,
    position: 60,
    widgets: [
        {
            universalIdentifier: model_identifiers_1.DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS[object],
            type: 'front-component',
            component: 'document-shell',
            props: { mode: 'record-history', primaryObjectType: object },
        },
    ],
    requiredPermissionScope: 'viewGeneratedDocs',
});
exports.companyDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('company');
exports.personDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('person');
exports.opportunityDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('opportunity');
exports.taskDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('task');
exports.noteDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('note');
exports.calendarEventDocumentsPageLayoutTab = makeDocumentsPageLayoutTab('calendarEvent');
exports.documentsStandardRecordTabs = [
    exports.companyDocumentsPageLayoutTab,
    exports.personDocumentsPageLayoutTab,
    exports.opportunityDocumentsPageLayoutTab,
    exports.taskDocumentsPageLayoutTab,
    exports.noteDocumentsPageLayoutTab,
    exports.calendarEventDocumentsPageLayoutTab,
];
