import { defineObject, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_FIELDS,
  DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  TEMPLATE_VERSION_FIELDS,
  TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

export default defineObject({
  universalIdentifier: TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'templateVersion',
  namePlural: 'templateVersions',
  labelSingular: 'TemplateVersion',
  labelPlural: 'Template Versions',
  description: 'Version history entry for a DocumentTemplate.',
  icon: 'IconHistory',
  labelIdentifierFieldMetadataUniversalIdentifier: TEMPLATE_VERSION_FIELDS.name,
  fields: [
    { universalIdentifier: TEMPLATE_VERSION_FIELDS.name, type: FieldType.TEXT, name: 'name', label: 'Name', description: 'Version label', icon: 'IconAbc' },
    {
      universalIdentifier: TEMPLATE_VERSION_FIELDS.template,
      type: FieldType.RELATION,
      name: 'template',
      label: 'DocumentTemplate',
      description: 'Template owning this version',
      icon: 'IconTemplate',
      relationTargetFieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.versions,
      relationTargetObjectMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      universalSettings: { relationType: RelationType.MANY_TO_ONE, onDelete: OnDeleteAction.CASCADE, joinColumnName: 'templateId' },
    },
    { universalIdentifier: TEMPLATE_VERSION_FIELDS.versionNumber, type: FieldType.NUMBER, name: 'versionNumber', label: 'Version Number', description: 'Sequential version number', icon: 'IconVersions', defaultValue: 1 },
    { universalIdentifier: TEMPLATE_VERSION_FIELDS.htmlSource, type: FieldType.TEXT, name: 'htmlSource', label: 'HTML Source', description: 'Snapshot of HTML source', icon: 'IconCode' },
    { universalIdentifier: TEMPLATE_VERSION_FIELDS.cssSource, type: FieldType.TEXT, name: 'cssSource', label: 'CSS Source', description: 'Snapshot of CSS source', icon: 'IconCodeDots', isNullable: true, defaultValue: null },
    { universalIdentifier: TEMPLATE_VERSION_FIELDS.diff, type: FieldType.RAW_JSON, name: 'diff', label: 'Diff', description: 'Structured diff metadata', icon: 'IconGitCompare', isNullable: true, defaultValue: null },
    { universalIdentifier: TEMPLATE_VERSION_FIELDS.createdBy, type: FieldType.TEXT, name: 'versionCreatedBy', label: 'Version Created By', description: 'User id or display name that created the version', icon: 'IconUser', isNullable: true, defaultValue: null },
  ],
});
