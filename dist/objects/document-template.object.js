"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
var DocumentTemplateRenderer;
(function (DocumentTemplateRenderer) {
    DocumentTemplateRenderer["HANDLEBARS"] = "HANDLEBARS";
})(DocumentTemplateRenderer || (DocumentTemplateRenderer = {}));
var DocumentTemplateStatus;
(function (DocumentTemplateStatus) {
    DocumentTemplateStatus["DRAFT"] = "DRAFT";
    DocumentTemplateStatus["ACTIVE"] = "ACTIVE";
    DocumentTemplateStatus["ARCHIVED"] = "ARCHIVED";
})(DocumentTemplateStatus || (DocumentTemplateStatus = {}));
exports.default = (0, define_1.defineObject)({
    universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'documentTemplate',
    namePlural: 'documentTemplates',
    labelSingular: 'DocumentTemplate',
    labelPlural: 'Document Templates',
    description: 'Code-first HTML/CSS template for document generation.',
    icon: 'IconTemplate',
    isSearchable: true,
    labelIdentifierFieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.name,
    fields: [
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.name, type: define_1.FieldType.TEXT, name: 'name', label: 'Name', description: 'Template name', icon: 'IconAbc' },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.slug, type: define_1.FieldType.TEXT, name: 'slug', label: 'Slug', description: 'Unique template slug', icon: 'IconLink' },
        {
            universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.category,
            type: define_1.FieldType.RELATION,
            name: 'category',
            label: 'TemplateCategory',
            description: 'Category for this DocumentTemplate',
            icon: 'IconFolder',
            isNullable: true,
            relationTargetFieldMetadataUniversalIdentifier: model_identifiers_1.TEMPLATE_CATEGORY_FIELDS.templates,
            relationTargetObjectMetadataUniversalIdentifier: model_identifiers_1.TEMPLATE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
            universalSettings: { relationType: define_1.RelationType.MANY_TO_ONE, onDelete: define_1.OnDeleteAction.SET_NULL, joinColumnName: 'categoryId' },
        },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.description, type: define_1.FieldType.RICH_TEXT, name: 'description', label: 'Description', description: 'Template description', icon: 'IconNotes', isNullable: true, defaultValue: null },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.htmlSource, type: define_1.FieldType.RICH_TEXT, name: 'htmlSource', label: 'HTML Source', description: 'Handlebars HTML source', icon: 'IconCode' },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.cssSource, type: define_1.FieldType.RICH_TEXT, name: 'cssSource', label: 'CSS Source', description: 'Template CSS source', icon: 'IconCodeDots', isNullable: true, defaultValue: null },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.previewData, type: define_1.FieldType.RAW_JSON, name: 'previewData', label: 'Preview Data', description: 'JSON preview context', icon: 'IconJson', isNullable: true, defaultValue: null },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.variables, type: define_1.FieldType.RAW_JSON, name: 'variables', label: 'Variables', description: 'Variable schema as JSON', icon: 'IconBraces', isNullable: true, defaultValue: null },
        {
            universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.renderer,
            type: define_1.FieldType.SELECT,
            name: 'renderer',
            label: 'Renderer',
            description: 'Template rendering engine',
            icon: 'IconEngine',
            defaultValue: `'${DocumentTemplateRenderer.HANDLEBARS}'`,
            options: [{ value: DocumentTemplateRenderer.HANDLEBARS, label: 'Handlebars', position: 0, color: 'blue' }],
        },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.defaultSubject, type: define_1.FieldType.TEXT, name: 'defaultSubject', label: 'Default Subject', description: 'Default email subject', icon: 'IconMail', isNullable: true, defaultValue: null },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.provider, type: define_1.FieldType.TEXT, name: 'provider', label: 'Provider', description: 'Context provider override', icon: 'IconPlug', isNullable: true, defaultValue: null },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.allowedOutputTypes, type: define_1.FieldType.ARRAY, name: 'allowedOutputTypes', label: 'Allowed Output Types', description: 'Allowed outputs such as HTML/PDF/email', icon: 'IconFiles', defaultValue: [] },
        {
            universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.status,
            type: define_1.FieldType.SELECT,
            name: 'status',
            label: 'Status',
            description: 'Template lifecycle status',
            icon: 'IconStatusChange',
            defaultValue: `'${DocumentTemplateStatus.DRAFT}'`,
            options: [
                { value: DocumentTemplateStatus.DRAFT, label: 'Draft', position: 0, color: 'gray' },
                { value: DocumentTemplateStatus.ACTIVE, label: 'Active', position: 1, color: 'green' },
                { value: DocumentTemplateStatus.ARCHIVED, label: 'Archived', position: 2, color: 'yellow' },
            ],
        },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.isActive, type: define_1.FieldType.BOOLEAN, name: 'isActive', label: 'Active', description: 'Whether this template can be used for generation', icon: 'IconCircleCheck', defaultValue: false },
        { universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.version, type: define_1.FieldType.NUMBER, name: 'version', label: 'Version', description: 'Current template version number', icon: 'IconVersions', defaultValue: 1 },
        {
            universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.versions,
            type: define_1.FieldType.RELATION,
            name: 'versions',
            label: 'TemplateVersion records',
            description: 'TemplateVersion history for this DocumentTemplate',
            icon: 'IconHistory',
            isNullable: true,
            relationTargetFieldMetadataUniversalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.template,
            relationTargetObjectMetadataUniversalIdentifier: model_identifiers_1.TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
            universalSettings: { relationType: define_1.RelationType.ONE_TO_MANY },
        },
        {
            universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.generatedDocuments,
            type: define_1.FieldType.RELATION,
            name: 'generatedDocuments',
            label: 'GeneratedDocument records',
            description: 'GeneratedDocument history from this DocumentTemplate',
            icon: 'IconFileText',
            isNullable: true,
            relationTargetFieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.template,
            relationTargetObjectMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER,
            universalSettings: { relationType: define_1.RelationType.ONE_TO_MANY },
        },
    ],
});
