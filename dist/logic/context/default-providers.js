"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDefaultRecordContext = exports.createDefaultContextProviders = exports.DEFAULT_CONTEXT_PROVIDER_NAMES = void 0;
const provider_registry_1 = require("./provider-registry");
exports.DEFAULT_CONTEXT_PROVIDER_NAMES = [
    'company',
    'person',
    'opportunity',
    'task',
    'note',
    'calendarEvent',
];
const loadStandardContext = async (expectedObjectType, input) => {
    const objectName = (0, provider_registry_1.normalizeProviderName)(input.primaryObjectType || expectedObjectType);
    return (0, provider_registry_1.loadGenericRecordContext)({ ...input, primaryObjectType: objectName });
};
const createDefaultContextProviders = () => ({
    company: (input) => loadStandardContext('company', input),
    person: (input) => loadStandardContext('person', input),
    opportunity: (input) => loadStandardContext('opportunity', input),
    task: (input) => loadStandardContext('task', input),
    note: (input) => loadStandardContext('note', input),
    calendarEvent: (input) => loadStandardContext('calendarEvent', input),
});
exports.createDefaultContextProviders = createDefaultContextProviders;
const loadDefaultRecordContext = async (input) => {
    const objectName = (0, provider_registry_1.normalizeProviderName)(input.primaryObjectType);
    const providers = (0, exports.createDefaultContextProviders)();
    const provider = providers[objectName];
    return provider ? provider({ ...input, primaryObjectType: objectName }) : (0, provider_registry_1.loadGenericRecordContext)({ ...input, primaryObjectType: objectName });
};
exports.loadDefaultRecordContext = loadDefaultRecordContext;
