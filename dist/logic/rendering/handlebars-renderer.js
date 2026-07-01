"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderHandlebarsTemplate = exports.escapeHtml = void 0;
const css_combiner_1 = require("./css-combiner");
const helper_registry_1 = require("./helper-registry");
const render_errors_1 = require("./render-errors");
const template_validation_1 = require("./template-validation");
const TOKEN_PATTERN = /{{{\s*([^}]+?)\s*}}}|{{\s*([^}]+?)\s*}}/g;
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
exports.escapeHtml = escapeHtml;
const splitExpression = (expression) => {
    const tokens = [];
    const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
    for (const match of expression.matchAll(pattern)) {
        tokens.push(match[1] ?? match[2] ?? match[3]);
    }
    return tokens;
};
const readPath = (source, path) => {
    if (path === 'this' || path === '.')
        return source;
    return path.split('.').reduce((current, segment) => {
        if (current == null)
            return undefined;
        if (isPlainObject(current) || Array.isArray(current)) {
            return current[segment];
        }
        return undefined;
    }, source);
};
const resolvePath = (path, scope) => {
    let current = scope;
    while (current) {
        const scoped = readPath(current.value, path);
        if (scoped !== undefined)
            return scoped;
        current = current.parent;
    }
    return readPath(scope.root, path);
};
const resolveArgument = (token, scope) => {
    if (/^-?\d+(?:\.\d+)?$/.test(token))
        return Number(token);
    if (token === 'true')
        return true;
    if (token === 'false')
        return false;
    if (token === 'null')
        return null;
    return resolvePath(token, scope) ?? token;
};
const evaluateExpression = (expression, scope, helpers, missing) => {
    const parts = splitExpression(expression.trim());
    if (parts.length === 0)
        return '';
    const [name, ...argTokens] = parts;
    if (helpers.has(name)) {
        return helpers.invoke(name, argTokens.map((token) => resolveArgument(token, scope)), scope.root);
    }
    const value = resolvePath(name, scope);
    if (value === undefined)
        missing.add(name);
    return value ?? '';
};
const findMatchingBlock = (source, start, name) => {
    const pattern = /{{\s*(#|\/|else\b)([^}]*)}}/g;
    pattern.lastIndex = start;
    let depth = 1;
    let elseStart;
    for (const match of source.matchAll(pattern)) {
        const kind = match[1];
        const expression = match[2].trim();
        if (kind === '#' && expression.startsWith(name))
            depth += 1;
        if (kind === '/' && expression === name) {
            depth -= 1;
            if (depth === 0)
                return { elseStart, closeStart: match.index, closeEnd: match.index + match[0].length };
        }
        if (kind.startsWith('else') && depth === 1)
            elseStart = match.index;
    }
    throw new Error(`Unclosed ${name} block at line 1`);
};
const renderSection = (source, scope, helpers, partials, missing) => {
    let output = '';
    let cursor = 0;
    while (cursor < source.length) {
        TOKEN_PATTERN.lastIndex = cursor;
        const match = TOKEN_PATTERN.exec(source);
        if (!match)
            return output + source.slice(cursor);
        output += source.slice(cursor, match.index);
        const raw = Boolean(match[1]);
        const expression = (match[1] ?? match[2]).trim();
        const end = match.index + match[0].length;
        if (expression.startsWith('#if ')) {
            const block = findMatchingBlock(source, end, 'if');
            const trueStart = end;
            const trueEnd = block.elseStart ?? block.closeStart;
            const falseStart = block.elseStart == null ? block.closeStart : block.elseStart + source.slice(block.elseStart).match(/^{{\s*else\s*}}/)[0].length;
            const condition = evaluateExpression(expression.slice(4), scope, helpers, missing);
            output += renderSection(condition ? source.slice(trueStart, trueEnd) : source.slice(falseStart, block.closeStart), scope, helpers, partials, missing);
            cursor = block.closeEnd;
            continue;
        }
        if (expression.startsWith('#each ')) {
            const block = findMatchingBlock(source, end, 'each');
            const value = evaluateExpression(expression.slice(6), scope, helpers, missing);
            const array = Array.isArray(value) ? value : [];
            const body = source.slice(end, block.closeStart);
            output += array
                .map((item, index) => {
                const itemValue = isPlainObject(item) ? { ...item, index, number: index + 1 } : { this: item, index, number: index + 1 };
                return renderSection(body, { value: itemValue, root: scope.root, parent: scope }, helpers, partials, missing);
            })
                .join('');
            cursor = block.closeEnd;
            continue;
        }
        if (expression.startsWith('>')) {
            const partialName = expression.slice(1).trim();
            output += renderSection(partials[partialName] ?? '', scope, helpers, partials, missing);
            cursor = end;
            continue;
        }
        if (expression.startsWith('/') || expression === 'else') {
            throw new Error(`Unexpected ${expression} at line 1`);
        }
        const value = evaluateExpression(expression, scope, helpers, missing);
        output += raw ? String(value ?? '') : (0, exports.escapeHtml)(value);
        cursor = end;
    }
    return output;
};
const renderHandlebarsTemplate = ({ htmlSource, cssSource, context = {}, helpers = (0, helper_registry_1.createDefaultHelperRegistry)(), partials = {}, strictMissingVariables = false, }) => {
    const validation = (0, template_validation_1.validateHandlebarsTemplate)(htmlSource, context, { strictMissingVariables });
    if (!validation.valid && validation.errors.some((error) => error.code === 'TEMPLATE_SYNTAX_ERROR')) {
        return { html: '', context, warnings: [], errors: validation.errors };
    }
    try {
        const missing = new Set();
        const rendered = renderSection(htmlSource, { value: context, root: context }, helpers, partials, missing);
        const errors = strictMissingVariables
            ? [...validation.errors, ...[...missing].map(render_errors_1.createMissingVariableError)]
            : [];
        return {
            html: errors.length ? '' : (0, css_combiner_1.combineCssWithHtml)(rendered, cssSource),
            context,
            warnings: strictMissingVariables ? [] : [...missing].map((path) => `Missing template variable: ${path}`),
            errors,
        };
    }
    catch (error) {
        return { html: '', context, warnings: [], errors: [(0, render_errors_1.mapTemplateRenderError)(error, 'render')] };
    }
};
exports.renderHandlebarsTemplate = renderHandlebarsTemplate;
