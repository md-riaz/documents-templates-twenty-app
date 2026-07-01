"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
exports.default = (0, define_1.definePageLayoutTab)({
    universalIdentifier: '2b248e42-d90b-4aa1-ad0e-e23a2361811e',
    pageLayoutUniversalIdentifier: define_1.STANDARD_PAGE_LAYOUT.companyRecordPage.universalIdentifier,
    title: 'Documents',
    icon: 'IconFileText',
    position: 60,
    layoutMode: define_1.PageLayoutTabLayoutMode.GRID,
    widgets: [{
            universalIdentifier: 'f1563bac-ce95-40dc-9239-5f9a6c3f033c',
            title: 'Document Activity',
            type: 'TIMELINE',
            gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
            configuration: {
                configurationType: 'TIMELINE',
            },
        }],
});
