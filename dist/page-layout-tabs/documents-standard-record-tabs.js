"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsStandardRecordTabs = exports.calendarEventDocumentsPageLayoutTab = exports.noteDocumentsPageLayoutTab = exports.taskDocumentsPageLayoutTab = exports.opportunityDocumentsPageLayoutTab = exports.personDocumentsPageLayoutTab = exports.companyDocumentsPageLayoutTab = void 0;
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
const RECORD_PAGE_LAYOUTS = {
    company: define_1.STANDARD_PAGE_LAYOUT.companyRecordPage.universalIdentifier,
    person: define_1.STANDARD_PAGE_LAYOUT.personRecordPage.universalIdentifier,
    opportunity: define_1.STANDARD_PAGE_LAYOUT.opportunityRecordPage.universalIdentifier,
    task: define_1.STANDARD_PAGE_LAYOUT.taskRecordPage.universalIdentifier,
    note: define_1.STANDARD_PAGE_LAYOUT.noteRecordPage.universalIdentifier,
    calendarEvent: define_1.STANDARD_PAGE_LAYOUT.calendarEventRecordPage.universalIdentifier,
};
const makeDocumentsPageLayoutTab = (object) => (0, define_1.definePageLayoutTab)({
    universalIdentifier: model_identifiers_1.DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS[object],
    pageLayoutUniversalIdentifier: RECORD_PAGE_LAYOUTS[object],
    title: 'Documents',
    icon: 'IconFileText',
    position: 60,
    layoutMode: define_1.PageLayoutTabLayoutMode.GRID,
    widgets: [
        {
            universalIdentifier: model_identifiers_1.DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS[object],
            title: 'Generated Documents',
            type: 'front-component',
            gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
            configuration: {
                configurationType: 'FRONT_COMPONENT',
                frontComponentUniversalIdentifier: model_identifiers_1.DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
            },
        },
    ],
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
exports.default = exports.documentsStandardRecordTabs;
