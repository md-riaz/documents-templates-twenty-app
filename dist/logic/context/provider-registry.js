"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultContextProviderRegistry = exports.registerContextProvider = exports.createContextProviderRegistry = exports.ContextProviderRegistry = exports.loadGenericRecordContext = exports.normalizeProviderName = void 0;
const normalizeProviderName = (name) => {
    const trimmed = name.trim();
    if (!trimmed)
        throw new Error('Context provider name is required.');
    return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
};
exports.normalizeProviderName = normalizeProviderName;
const providerKey = (name) => (0, exports.normalizeProviderName)(name).toLowerCase();
const filterReadableFields = (objectName, record, permissions) => {
    const readable = permissions?.readableFields?.[objectName];
    if (!readable)
        return { record, warnings: [] };
    const allowed = new Set(readable);
    const filtered = {};
    const omitted = [];
    for (const [field, value] of Object.entries(record)) {
        if (allowed.has(field))
            filtered[field] = value;
        else
            omitted.push(field);
    }
    return {
        record: filtered,
        warnings: omitted.length ? [`Omitted unreadable field(s) from ${objectName}: ${omitted.join(', ')}`] : [],
    };
};
const loadGenericRecordContext = async (input) => {
    const objectName = (0, exports.normalizeProviderName)(input.primaryObjectType);
    const warnings = [];
    let record = {};
    try {
        record = (await input.api?.getRecord?.(objectName, input.primaryRecordId)) ?? { id: input.primaryRecordId };
    }
    catch (error) {
        warnings.push(`Could not load ${objectName} context: ${error instanceof Error ? error.message : String(error)}`);
    }
    const filtered = filterReadableFields(objectName, record, input.permissions);
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
exports.loadGenericRecordContext = loadGenericRecordContext;
class ContextProviderRegistry {
    providers = new Map();
    constructor(providers = {}) {
        for (const [name, provider] of Object.entries(providers)) {
            this.register(name, provider);
        }
    }
    register(name, provider) {
        this.providers.set(providerKey(name), provider);
    }
    has(name) {
        return this.providers.has(providerKey(name));
    }
    async load(input) {
        const objectName = (0, exports.normalizeProviderName)(input.primaryObjectType);
        const provider = this.providers.get(providerKey(objectName));
        if (!provider) {
            const fallback = await (0, exports.loadGenericRecordContext)({ ...input, primaryObjectType: objectName });
            return {
                context: fallback.context,
                warnings: [`No context provider registered for ${objectName}; used generic primary context.`, ...fallback.warnings],
            };
        }
        try {
            const result = await provider({ ...input, primaryObjectType: objectName });
            return { context: result.context ?? {}, warnings: result.warnings ?? [] };
        }
        catch (error) {
            return (0, exports.loadGenericRecordContext)({ ...input, primaryObjectType: objectName }).then((fallback) => ({
                context: fallback.context,
                warnings: [`Could not load ${objectName} context: ${error instanceof Error ? error.message : String(error)}`, ...fallback.warnings],
            }));
        }
    }
}
exports.ContextProviderRegistry = ContextProviderRegistry;
const createContextProviderRegistry = (options = {}) => {
    const providers = { ...(options.providers ?? {}) };
    if (options.includeDefaultProviders) {
        for (const name of ['company', 'person', 'opportunity', 'task', 'note', 'calendarEvent']) {
            providers[name] = (input) => (0, exports.loadGenericRecordContext)({ ...input, primaryObjectType: name });
        }
    }
    return new ContextProviderRegistry(providers);
};
exports.createContextProviderRegistry = createContextProviderRegistry;
const registerContextProvider = (name, provider, registry = exports.defaultContextProviderRegistry) => {
    registry.register(name, provider);
};
exports.registerContextProvider = registerContextProvider;
exports.defaultContextProviderRegistry = new ContextProviderRegistry();
