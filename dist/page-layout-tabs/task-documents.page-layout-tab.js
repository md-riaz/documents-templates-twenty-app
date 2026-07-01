"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
exports.default = (0, define_1.definePageLayoutTab)({
    universalIdentifier: 'fd4f49ed-2456-4a73-a21b-bb82b6d8156c',
    pageLayoutUniversalIdentifier: define_1.STANDARD_PAGE_LAYOUT.taskRecordPage.universalIdentifier,
    title: 'Documents',
    icon: 'IconFileText',
    position: 60,
    layoutMode: define_1.PageLayoutTabLayoutMode.GRID,
    widgets: [{
            universalIdentifier: 'ab0107fc-d7cc-4109-8331-452f5f4e9d9b',
            title: 'Document Activity',
            type: 'TIMELINE',
            gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 },
            configuration: {
                configurationType: 'TIMELINE',
            },
        }],
});
