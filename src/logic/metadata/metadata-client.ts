import { MetadataApiClient } from 'twenty-client-sdk/metadata';

/**
 * Normalized, transport-agnostic view of a single field on a Twenty object.
 * This is intentionally a small, flat shape (not the raw genql `Field`) so
 * that consumers and unit-test fakes never depend on the metadata GraphQL
 * schema directly.
 */
export type MetadataObjectField = {
  name: string;
  label: string;
  /** FieldMetadataType as a plain string, e.g. 'TEXT', 'RELATION', 'MORPH_RELATION'. */
  type: string;
  isRelation: boolean;
  /** For relation fields, the `nameSingular` of the object this field points at. */
  relationTargetObjectName?: string;
  isNullable?: boolean;
};

/** Normalized view of a single Twenty object (standard or custom). */
export type MetadataObject = {
  nameSingular: string;
  namePlural?: string;
  labelSingular: string;
  fields: MetadataObjectField[];
};

/**
 * The injected metadata dependency other logic depends on. Kept deliberately
 * tiny so unit tests can supply a hand-written fake (matching the repo's
 * dependency-injection convention, cf. `TemplateRepositoryApi`).
 */
export type MetadataApi = {
  listObjects(): Promise<MetadataObject[]>;
  getFields(objectNameSingular: string): Promise<MetadataObjectField[]>;
};

/**
 * Minimal structural contract for the genql metadata client. Both the real
 * `MetadataApiClient` from `twenty-client-sdk/metadata` and any test double
 * satisfy this, so callers can inject a fake without pulling in genql types.
 */
export type MetadataQueryClient = {
  query(request: Record<string, unknown> & { __name?: string }): Promise<unknown>;
};

const RELATION_TYPES = new Set(['RELATION', 'MORPH_RELATION']);

/**
 * The exact genql field-selection used against the metadata GraphQL endpoint.
 * `objects.__args` is required by the schema (paging + filter are non-optional),
 * so we request the active objects and their `fieldsList`, resolving each
 * relation's target object name via `relation.targetObjectMetadata.nameSingular`.
 * `filter.isActive` is confirmed (via the real generated schema's `ObjectFilter`
 * type) to be the only relevant scoping filter available — an empty `filter: {}`
 * would also return inactive/archived objects.
 */
const OBJECTS_QUERY = {
  objects: {
    __args: { paging: { first: 1000 }, filter: { isActive: { eq: true } } },
    edges: {
      node: {
        nameSingular: true,
        namePlural: true,
        labelSingular: true,
        fieldsList: {
          name: true,
          label: true,
          type: true,
          isNullable: true,
          relation: { targetObjectMetadata: { nameSingular: true } },
        },
      },
    },
  },
} as const;

type RawField = {
  name?: unknown;
  label?: unknown;
  type?: unknown;
  isNullable?: unknown;
  relation?: { targetObjectMetadata?: { nameSingular?: unknown } | null } | null;
};

type RawObject = {
  nameSingular?: unknown;
  namePlural?: unknown;
  labelSingular?: unknown;
  fieldsList?: RawField[] | null;
};

const toStr = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''));

const normalizeField = (field: RawField): MetadataObjectField => {
  const type = toStr(field.type);
  const isRelation = RELATION_TYPES.has(type);
  const target = field.relation?.targetObjectMetadata?.nameSingular;
  return {
    name: toStr(field.name),
    label: toStr(field.label),
    type,
    isRelation,
    ...(isRelation && typeof target === 'string' && target
      ? { relationTargetObjectName: target }
      : {}),
    ...(typeof field.isNullable === 'boolean' ? { isNullable: field.isNullable } : {}),
  };
};

const normalizeObject = (node: RawObject): MetadataObject => ({
  nameSingular: toStr(node.nameSingular),
  ...(typeof node.namePlural === 'string' ? { namePlural: node.namePlural } : {}),
  labelSingular: toStr(node.labelSingular),
  fields: (node.fieldsList ?? []).map(normalizeField),
});

/**
 * Real implementation of `MetadataApi` backed by the Twenty metadata GraphQL
 * client. Translates the genql response into the normalized shapes above.
 *
 * @param client Optional genql client (real `MetadataApiClient` or compatible
 *   fake). When omitted, a default `MetadataApiClient` is constructed (which
 *   reads connection details/token from its own environment configuration).
 */
export const createMetadataApi = (client?: MetadataQueryClient): MetadataApi => {
  const resolvedClient: MetadataQueryClient = client ?? new MetadataApiClient();

  const fetchObjects = async (): Promise<MetadataObject[]> => {
    const response = (await resolvedClient.query(OBJECTS_QUERY as Record<string, unknown>)) as {
      objects?: { edges?: Array<{ node?: RawObject | null } | null> | null } | null;
    };
    const edges = response?.objects?.edges ?? [];
    return edges
      .map((edge) => edge?.node)
      .filter((node): node is RawObject => Boolean(node))
      .map(normalizeObject);
  };

  return {
    listObjects: fetchObjects,
    // NOTE: cannot be scoped to a single object server-side — confirmed against
    // the real generated metadata schema that `ObjectFilter` only supports
    // `id`/`isRemote`/`isActive`/`isSystem`/`isUIEditable`/`isUICreatable`/
    // `isUIReadOnly`/`isSearchable` (no name-based filter), and the schema's
    // singular `object` query takes a UUID `id`, not a `nameSingular` — which
    // callers here don't have. Wrap this `MetadataApi` in `createCachedMetadataApi`
    // to avoid repeated whole-catalog fetches on hot paths.
    async getFields(objectNameSingular: string): Promise<MetadataObjectField[]> {
      const objects = await fetchObjects();
      const match = objects.find((object) => object.nameSingular === objectNameSingular);
      return match ? match.fields : [];
    },
  };
};

type CacheEntry<T> = { value: T; expiresAt: number };

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type CachedMetadataApiOptions = {
  ttlMs?: number;
  /**
   * SECURITY: this cache may run inside a single process that serves multiple
   * workspaces/users. Metadata (object + field schema) is tenant-specific, so
   * a cache shared across tenants would leak one workspace's schema into
   * another's responses. The caller MUST derive `cacheKey` from something that
   * uniquely identifies the tenant/principal (e.g. workspace id or a hash of
   * the access token) so cached entries are never reused across tenants.
   * When omitted, entries are only reused within this single wrapper instance;
   * do NOT share one wrapper instance across tenants without a distinct key.
   */
  cacheKey?: string;
};

/**
 * Wraps any `MetadataApi` with a small in-memory, TTL'd cache for
 * `listObjects()` and per-object `getFields()`, plus an explicit `invalidate()`
 * for a future "refresh fields" UI action.
 */
export const createCachedMetadataApi = (
  inner: MetadataApi,
  options: CachedMetadataApiOptions = {},
): MetadataApi & { invalidate(): void } => {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const keyPrefix = options.cacheKey ? `${options.cacheKey}::` : '';

  let objectsEntry: CacheEntry<MetadataObject[]> | undefined;
  const fieldsCache = new Map<string, CacheEntry<MetadataObjectField[]>>();

  const isFresh = (entry: { expiresAt: number } | undefined): boolean =>
    Boolean(entry) && entry!.expiresAt > Date.now();

  return {
    async listObjects(): Promise<MetadataObject[]> {
      if (isFresh(objectsEntry)) return objectsEntry!.value;
      const value = await inner.listObjects();
      objectsEntry = { value, expiresAt: Date.now() + ttlMs };
      return value;
    },
    async getFields(objectNameSingular: string): Promise<MetadataObjectField[]> {
      const key = `${keyPrefix}${objectNameSingular}`;
      const cached = fieldsCache.get(key);
      if (isFresh(cached)) return cached!.value;
      const value = await inner.getFields(objectNameSingular);
      fieldsCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    },
    invalidate(): void {
      objectsEntry = undefined;
      fieldsCache.clear();
    },
  };
};
