import type { MetadataApi, MetadataObjectField } from '../metadata/metadata-client';

export type ContextProviderApi = {
  getRecord?: (objectName: string, id: string) => Promise<Record<string, unknown> | null | undefined>;
};

export type ContextProviderPermissions = {
  readableFields?: Record<string, string[]>;
};

export type ContextProviderInput = {
  primaryObjectType: string;
  primaryRecordId: string;
  api?: ContextProviderApi;
  permissions?: ContextProviderPermissions;
  currentUser?: Record<string, unknown>;
  workspace?: Record<string, unknown>;
  /**
   * Optional live metadata client. When provided, `loadGenericRecordContext`
   * uses it to discover which fields are relations and performs a one-level
   * shallow expansion of them. When NOT provided, behavior is exactly as
   * before and NO metadata call is made — this keeps latency-sensitive paths
   * that don't inject a metadata client fast and non-breaking.
   */
  metadataApi?: MetadataApi;
};

export type ContextProviderResult = {
  context: Record<string, unknown>;
  warnings: string[];
};

export type ContextProvider = (input: ContextProviderInput) => Promise<ContextProviderResult> | ContextProviderResult;

export const normalizeProviderName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Context provider name is required.');
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
};

const providerKey = (name: string): string => normalizeProviderName(name).toLowerCase();

/**
 * `defaultWhenUnconfigured` controls what happens when the caller has NOT
 * configured `readableFields[objectName]` at all:
 *  - 'allow-all' (the primary object the caller explicitly asked to load):
 *    trust the caller to have configured permissions for what it asked for.
 *  - 'deny-all' (any object reached only as a side effect, e.g. a relation
 *    pulled in by expandRelations): the caller never asked for this object,
 *    so an absent allowlist must NOT be read as "expose everything" — that
 *    would let relation expansion leak fields the caller never vetted.
 */
const filterReadableFields = (
  objectName: string,
  record: Record<string, unknown>,
  permissions: ContextProviderPermissions | undefined,
  defaultWhenUnconfigured: 'allow-all' | 'deny-all',
): { record: Record<string, unknown>; warnings: string[] } => {
  const readable = permissions?.readableFields?.[objectName];

  if (!readable) {
    if (defaultWhenUnconfigured === 'allow-all') return { record, warnings: [] };
    return {
      record: {},
      warnings: [`No readableFields configured for ${objectName}; omitted all fields (deny-by-default for relation-expanded objects).`],
    };
  }

  const allowed = new Set(readable);
  const filtered: Record<string, unknown> = {};
  const omitted: string[] = [];
  for (const [field, value] of Object.entries(record)) {
    if (allowed.has(field)) filtered[field] = value;
    else omitted.push(field);
  }

  return {
    record: filtered,
    warnings: omitted.length ? [`Omitted unreadable field(s) from ${objectName}: ${omitted.join(', ')}`] : [],
  };
};

// Candidate fields, in priority order, from which we derive a human-readable
// label for a shallow-expanded related record.
const RELATION_LABEL_FIELDS = ['name', 'label', 'title', 'displayName', 'subject'];

const deriveRelationLabel = (record: Record<string, unknown>): string | undefined => {
  for (const key of RELATION_LABEL_FIELDS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object') {
      const parts = [
        (value as Record<string, unknown>).firstName,
        (value as Record<string, unknown>).lastName,
      ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
      if (parts.length) return parts.join(' ');
    }
  }
  return undefined;
};

/**
 * One-level, shallow expansion of relation fields discovered via metadata.
 * For each relation field with a resolvable raw id (`<field>Id` on the record,
 * or the field value itself being an id string), we fetch the related record
 * once (no recursion, no further metadata lookups) and inline it under the
 * field name, adding a derived `label`. Related records are themselves passed
 * through `readableFields[targetObjectName]` so relation expansion can never be
 * used to bypass field-level permissions on the target object either.
 */
const expandRelations = async (
  record: Record<string, unknown>,
  fields: MetadataObjectField[],
  input: ContextProviderInput,
  warnings: string[],
): Promise<Record<string, unknown>> => {
  const getRecord = input.api?.getRecord;
  if (!getRecord) return record;

  const expanded: Record<string, unknown> = { ...record };

  const relationFields = fields.filter((field) => field.isRelation && field.relationTargetObjectName);
  const results = await Promise.all(relationFields.map(async (field) => {
    const joinColumnValue = record[`${field.name}Id`];
    const inlineValue = record[field.name];
    const relatedId =
      typeof joinColumnValue === 'string'
        ? joinColumnValue
        : typeof inlineValue === 'string'
          ? inlineValue
          : undefined;
    if (!relatedId) return null;

    const targetObject = normalizeProviderName(field.relationTargetObjectName!);
    try {
      const related = (await getRecord(targetObject, relatedId)) ?? { id: relatedId };
      // 'deny-all': the caller asked to load `objectName`, not this related
      // object — an unconfigured readableFields entry here must not expose
      // the full related record (see filterReadableFields's docstring).
      const filteredRelated = filterReadableFields(targetObject, related, input.permissions, 'deny-all');
      const label = deriveRelationLabel(filteredRelated.record);
      return {
        fieldName: field.name,
        warnings: filteredRelated.warnings,
        value: {
          ...filteredRelated.record,
          ...(label && !('label' in filteredRelated.record) ? { label } : {}),
        },
      };
    } catch (error) {
      return {
        fieldName: field.name,
        warnings: [`Could not expand ${targetObject} relation "${field.name}": ${error instanceof Error ? error.message : String(error)}`],
        value: undefined,
      };
    }
  }));

  for (const result of results) {
    if (!result) continue;
    warnings.push(...result.warnings);
    if (result.value !== undefined) expanded[result.fieldName] = result.value;
  }

  return expanded;
};

export const loadGenericRecordContext = async (input: ContextProviderInput): Promise<ContextProviderResult> => {
  const objectName = normalizeProviderName(input.primaryObjectType);
  const warnings: string[] = [];
  let record: Record<string, unknown> = {};

  try {
    record = (await input.api?.getRecord?.(objectName, input.primaryRecordId)) ?? { id: input.primaryRecordId };
  } catch (error) {
    warnings.push(`Could not load ${objectName} context: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Metadata-driven relation expansion happens BEFORE permission filtering so
  // that the existing readableFields filter is still the final authority on
  // which primary-object fields are exposed (dynamically discovered/expanded
  // relation fields cannot bypass it). Only runs when a MetadataApi is injected.
  if (input.metadataApi) {
    try {
      const fields = await input.metadataApi.getFields(objectName);
      record = await expandRelations(record, fields, input, warnings);
    } catch (error) {
      warnings.push(
        `Could not load ${objectName} field metadata: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 'allow-all': this is the object the caller explicitly asked to load, so an
  // unconfigured readableFields entry is treated as "trust the caller" — unlike
  // relation-expanded objects (see expandRelations), which default to deny-all.
  const filtered = filterReadableFields(objectName, record, input.permissions, 'allow-all');
  warnings.push(...filtered.warnings);

  return {
    context: {
      [objectName]: filtered.record,
      primary: { objectType: objectName, record: filtered.record },
      ...(input.currentUser ? { currentUser: input.currentUser } : {}),
      ...(input.workspace ? { workspace: input.workspace } : {}),
    },
    warnings,
  };
};

export class ContextProviderRegistry {
  private readonly providers = new Map<string, ContextProvider>();

  constructor(providers: Record<string, ContextProvider> = {}) {
    for (const [name, provider] of Object.entries(providers)) {
      this.register(name, provider);
    }
  }

  register(name: string, provider: ContextProvider): void {
    this.providers.set(providerKey(name), provider);
  }

  has(name: string): boolean {
    return this.providers.has(providerKey(name));
  }

  async load(input: ContextProviderInput): Promise<ContextProviderResult> {
    const objectName = normalizeProviderName(input.primaryObjectType);
    const provider = this.providers.get(providerKey(objectName));

    if (!provider) {
      const fallback = await loadGenericRecordContext({ ...input, primaryObjectType: objectName });
      return {
        context: fallback.context,
        warnings: [`No context provider registered for ${objectName}; used generic primary context.`, ...fallback.warnings],
      };
    }

    try {
      const result = await provider({ ...input, primaryObjectType: objectName });
      return { context: result.context ?? {}, warnings: result.warnings ?? [] };
    } catch (error) {
      return loadGenericRecordContext({ ...input, primaryObjectType: objectName }).then((fallback) => ({
        context: fallback.context,
        warnings: [`Could not load ${objectName} context: ${error instanceof Error ? error.message : String(error)}`, ...fallback.warnings],
      }));
    }
  }
}

export const createContextProviderRegistry = (options: {
  providers?: Record<string, ContextProvider>;
  includeDefaultProviders?: boolean;
} = {}): ContextProviderRegistry => {
  const providers = { ...(options.providers ?? {}) };

  if (options.includeDefaultProviders) {
    for (const name of ['company', 'person', 'opportunity', 'task', 'note', 'calendarEvent']) {
      providers[name] = (input: ContextProviderInput) => loadGenericRecordContext({ ...input, primaryObjectType: name });
    }
  }

  return new ContextProviderRegistry(providers);
};

export const registerContextProvider = (
  name: string,
  provider: ContextProvider,
  registry = defaultContextProviderRegistry,
): void => {
  registry.register(name, provider);
};

export const defaultContextProviderRegistry = new ContextProviderRegistry();
