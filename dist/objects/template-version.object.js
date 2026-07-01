"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.default = (0, define_1.defineObject)({
    universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'templateVersion',
    namePlural: 'templateVersions',
    labelSingular: 'TemplateVersion',
    labelPlural: 'Template Versions',
    description: 'Version history entry for a DocumentTemplate.',
    icon: 'IconHistory',
    labelIdentifierFieldMetadataUniversalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.name,
    fields: [
        { universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.name, type: define_1.FieldType.TEXT, name: 'name', label: 'Name', description: 'Version label', icon: 'IconAbc' },
        {
            universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.template,
            type: define_1.FieldType.RELATION,
            name: 'template',
            label: 'DocumentTemplate',
            description: 'Template owning this version',
            icon: 'IconTemplate',
            relationTargetFieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.versions,
            relationTargetObjectMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
            universalSettings: { relationType: define_1.RelationType.MANY_TO_ONE, onDelete: define_1.OnDeleteAction.CASCADE, joinColumnName: 'templateId' },
        },
        { universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.versionNumber, type: define_1.FieldType.NUMBER, name: 'versionNumber', label: 'Version Number', description: 'Sequential version number', icon: 'IconVersions', defaultValue: 1 },
        { universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.htmlSource, type: define_1.FieldType.RICH_TEXT, name: 'htmlSource', label: 'HTML Source', description: 'Snapshot of HTML source', icon: 'IconCode' },
        { universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.cssSource, type: define_1.FieldType.RICH_TEXT, name: 'cssSource', label: 'CSS Source', description: 'Snapshot of CSS source', icon: 'IconCodeDots', isNullable: true, defaultValue: null },
        { universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.diff, type: define_1.FieldType.RAW_JSON, name: 'diff', label: 'Diff', description: 'Structured diff metadata', icon: 'IconGitCompare', isNullable: true, defaultValue: null },
        { universalIdentifier: model_identifiers_1.TEMPLATE_VERSION_FIELDS.createdBy, type: define_1.FieldType.TEXT, name: 'versionCreatedBy', label: 'Version Created By', description: 'User id or display name that created the version', icon: 'IconUser', isNullable: true, defaultValue: null },
    ],
});
