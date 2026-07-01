"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentTemplateView = void 0;
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.documentTemplateView = {
    universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
    object: 'documentTemplate',
    name: 'Active Templates',
    type: 'table',
    fields: ['name', 'category', 'status', 'renderer', 'version', 'isActive'],
    sort: [{ field: 'name', direction: 'asc' }],
    filters: [{ field: 'isActive', operator: 'eq', value: true }],
};
