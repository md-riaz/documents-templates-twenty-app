"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
exports.default = (0, define_1.definePageLayoutTab)({
    universalIdentifier: '0951a49e-d410-44d8-8b8b-3c450c665d48',
    pageLayoutUniversalIdentifier: define_1.STANDARD_PAGE_LAYOUT.opportunityRecordPage.universalIdentifier,
    title: 'Documents',
    icon: 'IconFileText',
    position: 60,
    layoutMode: define_1.PageLayoutTabLayoutMode.GRID,
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
