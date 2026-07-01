"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatedDocumentHistoryFrontComponent = exports.generateDocumentFrontComponent = exports.GenerateDocumentController = exports.renderGenerateDocumentModalMarkup = exports.renderGeneratedDocumentHistoryMarkup = exports.filterGeneratedDocumentHistory = exports.isGenerateDocumentActionVisible = exports.createGenerateDocumentState = void 0;
const permission_guards_1 = require("../permissions/permission-guards");
const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const isTemplateSelectable = (template) => template.isActive === true || String(template.status ?? '').toUpperCase() === 'ACTIVE';
const firstSelectableTemplateId = (templates) => templates.find(isTemplateSelectable)?.id ?? '';
const createGenerateDocumentState = (input = {}) => {
    const templates = input.templates ?? [];
    return {
        primaryObjectType: input.primaryObjectType ?? '',
        primaryRecordId: input.primaryRecordId ?? '',
        templates,
        selectedTemplateId: input.selectedTemplateId ?? firstSelectableTemplateId(templates),
        previewHtml: input.previewHtml ?? '',
        shouldSave: input.shouldSave ?? true,
        isGenerating: input.isGenerating ?? false,
        warnings: input.warnings ?? [],
        errors: input.errors ?? [],
        statusMessage: input.statusMessage ?? '',
        generatedDocumentId: input.generatedDocumentId,
    };
};
exports.createGenerateDocumentState = createGenerateDocumentState;
const isGenerateDocumentActionVisible = (input) => Boolean(input.primaryObjectType && input.primaryRecordId && (0, permission_guards_1.hasPermissionScope)(input.principal, 'generateDocuments'));
exports.isGenerateDocumentActionVisible = isGenerateDocumentActionVisible;
const filterGeneratedDocumentHistory = (input) => {
    const objectType = input.primaryObjectType.toLowerCase();
    return input.records
        .filter((record) => String(record.primaryObjectType ?? '').toLowerCase() === objectType
        && record.primaryRecordId === input.primaryRecordId)
        .sort((left, right) => String(right.generatedAt ?? '').localeCompare(String(left.generatedAt ?? '')));
};
exports.filterGeneratedDocumentHistory = filterGeneratedDocumentHistory;
const renderGeneratedDocumentHistoryMarkup = (input) => {
    const records = (0, exports.filterGeneratedDocumentHistory)(input);
    return `
<section aria-label="Generated document history">
  <h2>Generated Documents</h2>
  <table>
    <thead><tr><th>Template</th><th>Status</th><th>Generated</th><th>PDF</th><th>Email</th></tr></thead>
    <tbody>
      ${records.map((record) => `
        <tr data-generated-document-id="${escapeHtml(record.id)}">
          <td>${escapeHtml(record.templateName ?? 'Generated document')}</td>
          <td>${escapeHtml(record.status ?? 'RENDERED')}</td>
          <td>${escapeHtml(record.generatedAt ?? '')}</td>
          <td>${record.pdfUrl ? `<a href="${escapeHtml(record.pdfUrl)}">Open PDF</a>` : '—'}</td>
          <td>${escapeHtml(record.emailSentAt ?? 'Not sent')}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  ${records.length === 0 ? '<p>No generated documents for this record yet.</p>' : ''}
</section>`;
};
exports.renderGeneratedDocumentHistoryMarkup = renderGeneratedDocumentHistoryMarkup;
const renderGenerateDocumentModalMarkup = (state) => {
    const selectableTemplates = state.templates.filter(isTemplateSelectable);
    const saveChecked = state.shouldSave ? ' checked' : '';
    const disabled = state.isGenerating || !state.selectedTemplateId ? ' disabled' : '';
    return `
<section role="dialog" aria-modal="true" aria-label="Generate document" aria-busy="${state.isGenerating}" data-responsive-layout="stack">
  <h2>Generate Document</h2>
  <label>Template
    <select aria-label="Document template" name="templateId">
      ${selectableTemplates.map((template) => `<option value="${escapeHtml(template.id)}"${template.id === state.selectedTemplateId ? ' selected' : ''}>${escapeHtml(template.name)}</option>`).join('')}
    </select>
  </label>
  <label><input type="checkbox" aria-label="Save generated document"${saveChecked}> Save generated document history</label>
  <div aria-label="Rendered document preview">${state.previewHtml}</div>
  ${state.errors.length ? `<div role="alert">${escapeHtml(state.errors.join(' '))}</div>` : ''}
  ${state.warnings.length ? `<div role="status">${escapeHtml(state.warnings.join(' '))}</div>` : ''}
  <button type="button"${disabled}>Generate</button>
  <output aria-live="polite">${escapeHtml(state.statusMessage || (state.isGenerating ? 'Generating document…' : ''))}</output>
</section>`;
};
exports.renderGenerateDocumentModalMarkup = renderGenerateDocumentModalMarkup;
const messagesFromErrors = (errors) => (errors ?? []).map((error) => error.userMessage ?? error.message ?? 'Document generation failed.');
class GenerateDocumentController {
    state;
    api;
    principal;
    currentUser;
    constructor(options) {
        this.api = options.api;
        this.principal = options.principal;
        this.currentUser = options.currentUser;
        this.state = options.initialState;
    }
    async loadTemplates() {
        const templates = await this.api.listTemplates?.() ?? [];
        this.state = {
            ...this.state,
            templates,
            selectedTemplateId: this.state.selectedTemplateId || firstSelectableTemplateId(templates),
        };
    }
    selectTemplate(templateId) {
        this.state = { ...this.state, selectedTemplateId: templateId, errors: [], statusMessage: '' };
    }
    async generate(options = {}) {
        if (!this.state.selectedTemplateId) {
            const errors = ['Select a template before generating a document.'];
            this.state = { ...this.state, errors };
            return { ok: false, errors };
        }
        this.state = { ...this.state, isGenerating: true, errors: [], statusMessage: 'Generating document…' };
        const rendered = await this.api.renderTemplate({
            templateId: this.state.selectedTemplateId,
            primaryObjectType: this.state.primaryObjectType,
            primaryRecordId: this.state.primaryRecordId,
            principal: this.principal,
            currentUser: this.currentUser,
        });
        if (!rendered.ok) {
            const errors = messagesFromErrors(rendered.errors);
            const message = errors[0] ?? 'Document generation failed.';
            this.state = { ...this.state, isGenerating: false, previewHtml: '', errors, statusMessage: message };
            this.api.notify?.({ type: 'error', message });
            return { ok: false, errors };
        }
        const shouldSave = options.save ?? this.state.shouldSave;
        let generatedDocumentId;
        if (shouldSave) {
            const saved = await this.api.saveGeneratedDocument({
                templateId: this.state.selectedTemplateId,
                primaryObjectType: this.state.primaryObjectType,
                primaryRecordId: this.state.primaryRecordId,
                renderedHtml: rendered.html,
                status: 'RENDERED',
                warnings: rendered.warnings,
                principal: this.principal,
                currentUser: this.currentUser,
            });
            if (!saved.ok) {
                const errors = messagesFromErrors(saved.errors);
                const message = errors[0] ?? 'Generated document could not be saved.';
                this.state = { ...this.state, isGenerating: false, previewHtml: rendered.html, warnings: rendered.warnings ?? [], errors, statusMessage: message };
                this.api.notify?.({ type: 'error', message });
                return { ok: false, errors };
            }
            generatedDocumentId = saved.id;
        }
        const message = shouldSave ? 'Document generated and saved.' : 'Document generated.';
        this.state = {
            ...this.state,
            isGenerating: false,
            previewHtml: rendered.html,
            warnings: rendered.warnings ?? [],
            errors: [],
            statusMessage: message,
            generatedDocumentId,
        };
        this.api.notify?.({ type: 'success', message });
        return { ok: true, generatedDocumentId };
    }
}
exports.GenerateDocumentController = GenerateDocumentController;
exports.generateDocumentFrontComponent = {
    name: 'generate-document-modal',
    label: 'Generate Document Modal',
    description: 'Record action modal for template selection, preview, optional save, and notifications.',
    component: exports.renderGenerateDocumentModalMarkup,
};
exports.generatedDocumentHistoryFrontComponent = {
    name: 'generated-document-history',
    label: 'Generated Document History',
    description: 'Record tab list filtered by primary object and record ID.',
    component: exports.renderGeneratedDocumentHistoryMarkup,
};
