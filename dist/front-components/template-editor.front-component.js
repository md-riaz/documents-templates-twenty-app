"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEditorController = exports.templateEditorFrontComponent = exports.renderTemplateEditorMarkup = exports.insertVariableExpression = exports.validateTemplateEditorState = exports.createTemplateEditorState = void 0;
const defaultTemplate = {
    name: '',
    slug: '',
    htmlSource: '',
    cssSource: '',
    previewData: {},
    variables: [],
    renderer: 'HANDLEBARS',
    defaultSubject: '',
    provider: '',
    allowedOutputTypes: ['HTML'],
    status: 'DRAFT',
    isActive: false,
    version: 0,
};
const escapeAttribute = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const createTemplateEditorState = (input = {}) => {
    const template = { ...defaultTemplate, ...(input.template ?? {}) };
    const previewData = template.previewData ?? {};
    return {
        id: template.id,
        name: template.name,
        slug: template.slug,
        htmlSource: template.htmlSource,
        cssSource: template.cssSource ?? '',
        previewData,
        previewJson: JSON.stringify(previewData, null, 2),
        variables: template.variables ?? [],
        renderer: template.renderer ?? 'HANDLEBARS',
        defaultSubject: template.defaultSubject ?? '',
        provider: template.provider ?? '',
        allowedOutputTypes: template.allowedOutputTypes ?? ['HTML'],
        status: template.status ?? 'DRAFT',
        isActive: template.isActive ?? false,
        version: template.version ?? 0,
        activeTab: 'html',
        previewHtml: '',
        warnings: [],
        validationErrors: [],
        statusMessage: '',
        originalHtmlSource: template.htmlSource,
        originalCssSource: template.cssSource ?? '',
    };
};
exports.createTemplateEditorState = createTemplateEditorState;
const validateTemplateEditorState = (state) => {
    const errors = [];
    if (!state.name.trim())
        errors.push('Template name is required.');
    if (!state.htmlSource.trim())
        errors.push('HTML source is required.');
    try {
        JSON.parse(state.previewJson || '{}');
    }
    catch {
        errors.push('Preview JSON is not valid JSON.');
    }
    return errors;
};
exports.validateTemplateEditorState = validateTemplateEditorState;
const insertVariableExpression = (value, variablePath, cursor) => {
    const expression = `{{${variablePath}}}`;
    return {
        value: `${value.slice(0, cursor)}${expression}${value.slice(cursor)}`,
        cursor: cursor + expression.length,
    };
};
exports.insertVariableExpression = insertVariableExpression;
const tabs = [
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' },
    { id: 'preview', label: 'Preview JSON' },
    { id: 'settings', label: 'Settings' },
];
const renderTemplateEditorMarkup = (state) => `
<section class="template-editor" aria-label="Template editor" data-responsive-layout="split-stack">
  <div role="tablist" aria-label="Template editor tabs">
    ${tabs.map((tab) => `<button role="tab" aria-selected="${state.activeTab === tab.id}" data-tab="${tab.id}">${tab.label}</button>`).join('')}
  </div>
  <label>HTML<textarea aria-label="HTML template source">${escapeAttribute(state.htmlSource)}</textarea></label>
  <label>CSS<textarea aria-label="CSS template source">${escapeAttribute(state.cssSource)}</textarea></label>
  <label>Preview JSON<textarea aria-label="Preview JSON data">${escapeAttribute(state.previewJson)}</textarea></label>
  <aside role="listbox" aria-label="Available template variables">
    ${state.variables.map((variable) => `<button role="option" data-variable="${escapeAttribute(variable.path)}">${escapeAttribute(variable.label ?? variable.path)}</button>`).join('')}
  </aside>
  <output aria-live="polite">${escapeAttribute(state.statusMessage || state.validationErrors.join(' '))}</output>
</section>`;
exports.renderTemplateEditorMarkup = renderTemplateEditorMarkup;
exports.templateEditorFrontComponent = {
    name: 'template-editor',
    label: 'Template Editor',
    description: 'HTML/CSS template editor with preview JSON, settings, live preview, and variable browser.',
    component: exports.renderTemplateEditorMarkup,
};
class TemplateEditorController {
    state;
    api;
    debounceMs;
    previewTimer;
    pendingPreview;
    constructor(options) {
        this.state = options.initialState ?? (0, exports.createTemplateEditorState)();
        this.api = options.api;
        this.debounceMs = options.debounceMs ?? 250;
    }
    updateField(field, value) {
        this.state = { ...this.state, [field]: value };
        if (['htmlSource', 'cssSource', 'previewJson'].includes(String(field))) {
            this.schedulePreview();
        }
    }
    schedulePreview() {
        if (this.previewTimer)
            clearTimeout(this.previewTimer);
        this.pendingPreview = new Promise((resolve) => {
            this.previewTimer = setTimeout(() => {
                void this.runPreview().then(resolve);
            }, this.debounceMs);
        });
    }
    async runPreview() {
        const validationErrors = (0, exports.validateTemplateEditorState)(this.state);
        if (validationErrors.length) {
            this.state = { ...this.state, validationErrors, previewHtml: '' };
            return;
        }
        const previewData = JSON.parse(this.state.previewJson || '{}');
        const result = await this.api.renderPreview({ htmlSource: this.state.htmlSource, cssSource: this.state.cssSource, previewData });
        this.state = {
            ...this.state,
            previewData,
            previewHtml: result.ok ? result.html : '',
            warnings: result.warnings ?? [],
            validationErrors: result.ok ? [] : result.errors.map((error) => error.userMessage ?? error.message ?? 'Template preview failed.'),
        };
    }
    async flushPreview() {
        if (this.pendingPreview)
            await this.pendingPreview;
    }
    async save() {
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
            this.previewTimer = undefined;
            this.pendingPreview = undefined;
        }
        const validationErrors = (0, exports.validateTemplateEditorState)(this.state);
        if (validationErrors.length) {
            this.state = { ...this.state, validationErrors };
            return { ok: false, errors: validationErrors };
        }
        const sourceChanged = this.state.htmlSource !== this.state.originalHtmlSource || this.state.cssSource !== this.state.originalCssSource;
        const nextVersion = this.state.id && sourceChanged ? this.state.version + 1 : Math.max(this.state.version, 1);
        const previewData = JSON.parse(this.state.previewJson || '{}');
        const template = await this.api.saveTemplate({
            id: this.state.id,
            name: this.state.name,
            slug: this.state.slug,
            htmlSource: this.state.htmlSource,
            cssSource: this.state.cssSource,
            previewData,
            variables: this.state.variables,
            renderer: this.state.renderer,
            defaultSubject: this.state.defaultSubject,
            provider: this.state.provider,
            allowedOutputTypes: this.state.allowedOutputTypes,
            status: this.state.status,
            isActive: this.state.isActive,
            version: nextVersion,
        });
        if (this.state.id && sourceChanged) {
            await this.api.createTemplateVersion({
                templateId: this.state.id,
                versionNumber: nextVersion,
                htmlSource: this.state.htmlSource,
                cssSource: this.state.cssSource,
                name: `${this.state.name} v${nextVersion}`,
            });
        }
        this.state = {
            ...this.state,
            id: template.id,
            version: template.version ?? nextVersion,
            previewData,
            validationErrors: [],
            statusMessage: `Saved version ${template.version ?? nextVersion}`,
            originalHtmlSource: this.state.htmlSource,
            originalCssSource: this.state.cssSource,
        };
        return { ok: true, template };
    }
    static reduceKey(state, event) {
        if (event.target !== 'tabs')
            return state;
        const index = tabs.findIndex((tab) => tab.id === state.activeTab);
        if (event.key === 'Home')
            return { ...state, activeTab: tabs[0].id };
        if (event.key === 'End')
            return { ...state, activeTab: tabs[tabs.length - 1].id };
        if (event.key === 'ArrowRight')
            return { ...state, activeTab: tabs[(index + 1) % tabs.length].id };
        if (event.key === 'ArrowLeft')
            return { ...state, activeTab: tabs[(index - 1 + tabs.length) % tabs.length].id };
        return state;
    }
}
exports.TemplateEditorController = TemplateEditorController;
