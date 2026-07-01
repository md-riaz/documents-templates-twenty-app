"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultHelperRegistry = exports.createHelperRegistry = void 0;
const assertHelperName = (name) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`Invalid template helper name: ${name}`);
    }
};
const createHelperRegistry = (initialHelpers = {}) => {
    const helpers = new Map();
    const registry = {
        register(name, helper) {
            assertHelperName(name);
            if (helpers.has(name)) {
                throw new Error(`Template helper “${name}” is already registered.`);
            }
            helpers.set(name, helper);
        },
        has(name) {
            return helpers.has(name);
        },
        invoke(name, args, context) {
            const helper = helpers.get(name);
            if (!helper)
                throw new Error(`Unknown template helper: ${name}`);
            return helper.apply(context, args);
        },
        entries() {
            return helpers;
        },
    };
    for (const [name, helper] of Object.entries(initialHelpers)) {
        registry.register(name, helper);
    }
    return registry;
};
exports.createHelperRegistry = createHelperRegistry;
const toStringValue = (value) => value == null ? '' : String(value);
const createDefaultHelperRegistry = () => (0, exports.createHelperRegistry)({
    formatDate(value, locale = 'en-US', options) {
        if (value == null || value === '')
            return '';
        const date = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(date.getTime()))
            return '';
        const formatOptions = options && typeof options === 'object'
            ? options
            : undefined;
        return new Intl.DateTimeFormat(String(locale || 'en-US'), formatOptions).format(date);
    },
    formatCurrency(value, currency = 'USD', locale = 'en-US') {
        const amount = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(amount))
            return '';
        return new Intl.NumberFormat(String(locale || 'en-US'), {
            style: 'currency',
            currency: String(currency || 'USD'),
        }).format(amount);
    },
    uppercase(value) {
        return toStringValue(value).toUpperCase();
    },
    lowercase(value) {
        return toStringValue(value).toLowerCase();
    },
    default(value, fallback = '') {
        return value == null || value === '' ? fallback : value;
    },
});
exports.createDefaultHelperRegistry = createDefaultHelperRegistry;
