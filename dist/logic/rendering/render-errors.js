"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTemplateRenderError = exports.createMissingVariableError = exports.TemplateRenderError = void 0;
class TemplateRenderError extends Error {
    code;
    userMessage;
    line;
    column;
    path;
    phase;
    constructor(details) {
        super(details.message);
        this.name = 'TemplateRenderError';
        this.code = details.code;
        this.userMessage = details.userMessage;
        this.line = details.line;
        this.column = details.column;
        this.path = details.path;
        this.phase = details.phase;
    }
}
exports.TemplateRenderError = TemplateRenderError;
const createMissingVariableError = (path) => new TemplateRenderError({
    code: 'MISSING_REQUIRED_VARIABLE',
    message: `Missing required template variable: ${path}`,
    userMessage: `The template references “${path}”, but that value is not available for this record.`,
    path,
    phase: 'validation',
});
exports.createMissingVariableError = createMissingVariableError;
const lineColumnFromMessage = (message) => {
    const match = message.match(/line\s+(\d+)(?:[^\d]+column\s+(\d+))?/i);
    return {
        line: match?.[1] ? Number(match[1]) : undefined,
        column: match?.[2] ? Number(match[2]) : undefined,
    };
};
const mapTemplateRenderError = (error, phase = 'render') => {
    if (error instanceof TemplateRenderError)
        return error;
    const message = error instanceof Error ? error.message : String(error);
    const location = lineColumnFromMessage(message);
    const lower = message.toLowerCase();
    if (phase === 'compile' ||
        lower.includes('unexpected') ||
        lower.includes('unclosed') ||
        lower.includes('mismatched') ||
        lower.includes('parse')) {
        return new TemplateRenderError({
            code: 'TEMPLATE_SYNTAX_ERROR',
            message,
            userMessage: 'The template syntax is invalid. Check Handlebars tags, block openings, and closing tags.',
            line: location.line,
            column: location.column,
            phase,
        });
    }
    if (lower.includes('unknown template helper')) {
        return new TemplateRenderError({
            code: 'UNKNOWN_HELPER',
            message,
            userMessage: 'The template uses a helper that is not registered.',
            phase,
        });
    }
    return new TemplateRenderError({
        code: 'TEMPLATE_RENDER_ERROR',
        message,
        userMessage: 'The template could not be rendered. Review the template and source data, then try again.',
        phase,
    });
};
exports.mapTemplateRenderError = mapTemplateRenderError;
