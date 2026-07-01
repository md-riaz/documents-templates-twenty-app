"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHandlebarsTemplate = exports.extractReferencedVariables = void 0;
const render_errors_1 = require("./render-errors");
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasPath = (context, path) => {
    if (['this', '.', 'index', 'number'].includes(path))
        return true;
    const parts = path.split('.');
    let current = context;
    for (const part of parts) {
        if (!isPlainObject(current) && !Array.isArray(current))
            return false;
        if (!(part in current))
            return false;
        current = current[part];
    }
    return current !== undefined;
};
const lineColumnAt = (source, index) => {
    const before = source.slice(0, index).split('\n');
    return { line: before.length, column: before[before.length - 1].length + 1 };
};
const firstToken = (expression) => {
    const match = expression.trim().match(/^([^\s]+)/);
    return match?.[1] ?? '';
};
const builtInHelpers = new Set(['formatDate', 'formatCurrency', 'uppercase', 'lowercase', 'default']);
const keywords = new Set(['else', 'this', '.', 'true', 'false', 'null']);
const extractReferencedVariables = (source) => {
    const variables = new Set();
    const tokenPattern = /{{{?\s*([^#/>][^}]*)\s*}?}}/g;
    for (const match of source.matchAll(tokenPattern)) {
        const expression = match[1].trim();
        const token = firstToken(expression);
        if (!token || keywords.has(token) || builtInHelpers.has(token))
            continue;
        if (/^['"-]?\d/.test(token) || token.startsWith('>'))
            continue;
        variables.add(token);
    }
    for (const match of source.matchAll(/{{\s*#(?:if|each)\s+([^}\s]+)[^}]*}}/g)) {
        const variable = match[1].trim();
        if (!builtInHelpers.has(variable))
            variables.add(variable);
    }
    return [...variables];
};
exports.extractReferencedVariables = extractReferencedVariables;
const validateBlockSyntax = (source) => {
    const errors = [];
    const stack = [];
    const blockPattern = /{{\s*(#|\/)(if|each)\b[^}]*}}/g;
    for (const match of source.matchAll(blockPattern)) {
        const [, marker, name] = match;
        if (marker === '#') {
            stack.push({ name, index: match.index });
            continue;
        }
        const open = stack.pop();
        if (!open || open.name !== name) {
            const location = lineColumnAt(source, match.index);
            errors.push(new render_errors_1.TemplateRenderError({
                code: 'TEMPLATE_SYNTAX_ERROR',
                message: `Unexpected closing block: ${name}`,
                userMessage: 'The template syntax is invalid. A Handlebars block is closed without a matching opener.',
                ...location,
                phase: 'validation',
            }));
        }
    }
    for (const open of stack) {
        const location = lineColumnAt(source, open.index);
        errors.push(new render_errors_1.TemplateRenderError({
            code: 'TEMPLATE_SYNTAX_ERROR',
            message: `Unclosed ${open.name} block`,
            userMessage: `The template syntax is invalid. The {{#${open.name}}} block is missing a closing tag.`,
            ...location,
            phase: 'validation',
        }));
    }
    const withoutTriple = source.replace(/{{{[\s\S]*?}}}/g, '');
    const openTags = source.match(/{{{/g)?.length ?? 0;
    const closeTags = source.match(/}}}/g)?.length ?? 0;
    const doubleOpen = withoutTriple.match(/{{(?!{)/g)?.length ?? 0;
    const doubleClose = withoutTriple.match(/(?<!})}}(?!})/g)?.length ?? 0;
    if (openTags !== closeTags || doubleOpen !== doubleClose) {
        errors.push(new render_errors_1.TemplateRenderError({
            code: 'TEMPLATE_SYNTAX_ERROR',
            message: 'Unbalanced Handlebars delimiters',
            userMessage: 'The template syntax is invalid. Check for missing {{, }}, {{{, or }}} delimiters.',
            line: 1,
            column: 1,
            phase: 'validation',
        }));
    }
    return errors;
};
const validateHandlebarsTemplate = (source, context = {}, options = {}) => {
    const referencedVariables = (0, exports.extractReferencedVariables)(source);
    const errors = validateBlockSyntax(source);
    const warnings = [];
    for (const variable of referencedVariables) {
        if (!hasPath(context, variable)) {
            const error = (0, render_errors_1.createMissingVariableError)(variable);
            if (options.strictMissingVariables)
                errors.push(error);
            else
                warnings.push(error.userMessage);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        referencedVariables,
    };
};
exports.validateHandlebarsTemplate = validateHandlebarsTemplate;
