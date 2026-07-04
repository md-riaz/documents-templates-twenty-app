# Detailed Lessons from twenty-document-generator

Full analysis of the reference app at `C:\Users\vm_user\Downloads\Documents & Templates\twenty-document-generator` compared to our `documents-templates` app.

---

## 1. Markdown Editor — Split-Pane with Live Preview

### Reference Implementation

The editor is a **split-pane Markdown editor** using `marked` (v18.0.5) — no WYSIWYG library.

**Architecture** (`template-editor.front-component.tsx`):

```
┌─────────────────────────────────────────────┐
│ Toolbar: [B] [I] [</>] [Link] | [H1] [H2]  │
│         [H3] [List] [1.] [Quote] [---]      │
│         [🔴] [🟠] [🟢] [🔵] [🟣] [⚫]      │
├────────────────────┬────────────────────────┤
│   textarea (raw    │   Live rendered         │
│   Markdown)        │   preview               │
│                    │   (React components)     │
└────────────────────┴────────────────────────┘
```

**Key code patterns**:

```tsx
// Toolbar actions append snippets (can't access caret in remote-DOM sandbox)
const appendInline = (snippet: string) =>
  setBody((previous) => {
    if (previous === '') return snippet;
    return /\s$/.test(previous) ? previous + snippet : `${previous} ${snippet}`;
  });

const appendBlock = (snippet: string) =>
  setBody((previous) => {
    const base = previous === '' ? '' : `${previous.replace(/\n+$/, '')}\n\n`;
    return `${base}${snippet}\n`;
  });
```

**Color swatches** insert `:color[coloured text]` syntax — a custom Markdown extension.

### What We Have

Our editor was rewritten to a simple full-screen preview:
```tsx
// No textarea, no toolbar, just render
const rendered = renderHandlebarsTemplate({ htmlSource, context: previewData });
return <div dangerouslySetInnerHTML={{ __html: rendered.html }} />;
```

### What We Should Implement

1. **Add a textarea for raw HTML editing** — Our HTML Source editor is currently a native Twenty `FIELD` widget with `fieldDisplayMode: 'EDITOR'`. A custom textarea with a toolbar would give more control.

2. **Add formatting toolbar** — Insert Handlebars syntax snippets: `{{variable}}`, `{{#each items}}...{{/each}}`, `{{#if condition}}...{{/if}}`

3. **Keep the split-pane pattern** — Left: raw editor, Right: live Handlebars preview

---

## 2. Full-Height Layout — Flexbox Pattern

### Reference CSS Architecture

```tsx
const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',          // Fills parent
  },
  bar: { /* top bar */ },
  toolbar: { /* formatting toolbar */ },
  split: {
    display: 'flex',
    flex: 1,                 // Takes remaining vertical space
    minHeight: 0,            // Prevents flex overflow
  },
  editor: {
    flex: 1,                 // Left pane (textarea)
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontFamily: "'SFMono-Regular', Menlo, monospace",
    fontSize: '13px',
    lineHeight: 1.6,
  },
  preview: {
    flex: 1,                 // Right pane (rendered)
    overflow: 'auto',
    background: '#eef1f6',
    padding: '20px',
  },
  paper: {
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 6px 24px rgba(24, 39, 75, 0.08)',
    padding: '32px 36px',
  },
};
```

**The pattern**:
1. Root is `flex-direction: column` at `height: 100%`
2. Top bar and toolbar consume natural height
3. Split pane uses `flex: 1` + `minHeight: 0`
4. Both editor and preview use `flex: 1` for equal width

**Theme tokens** — The reference uses CSS variables from Twenty's theme:
```tsx
fontFamily: 'var(--t-font-family, sans-serif)',
background: 'var(--t-background-primary, #fff)',
borderBottom: '1px solid var(--t-border-color-light, #eee)',
```

### Our Current Approach

```tsx
// Uses viewport height units
minHeight: 'max(480px, calc(100dvh - 200px))'
```

### Recommendation

Adopt the flexbox pattern with CSS variable fallbacks for Twenty theme integration.

---

## 3. Relations — Clean ONE_TO_MANY Pattern

### Reference Implementation

Two separate field files define the bidirectional relation:

**One side** (`template-documents-relation.field.ts`):
```ts
export default defineField({
  universalIdentifier: TEMPLATE_DOCUMENTS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'documents',
  label: 'Documents',
  description: 'Documents generated from this template.',
  icon: 'IconFile',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
```

**Many side** (`document-template-relation.field.ts`):
```ts
export default defineField({
  universalIdentifier: DOCUMENT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'template',
  label: 'Template',
  description: 'The template this document was generated from.',
  icon: 'IconFileText',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: TEMPLATE_DOCUMENTS_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'templateId',
  },
});
```

### Our Approach

We define relations inline in the object:
```ts
{
  universalIdentifier: DOCUMENT_FIELDS.template,
  type: FieldType.RELATION,
  name: 'template',
  label: 'DocumentTemplate',
  isNullable: true,
  relationTargetFieldMetadataUniversalIdentifier: '18a6f32c-...',
  relationTargetObjectMetadataUniversalIdentifier: '7adbea9b-...',
  universalSettings: {
    relationType: 'MANY_TO_ONE',
    onDelete: 'SET_NULL',
    joinColumnName: 'templateId',
  },
}
```

### Key Differences

| Aspect | Reference | Ours |
|--------|-----------|------|
| File structure | Separate files per direction | Inline in object definition |
| `onDelete` | Explicit `SET_NULL` | Also `SET_NULL` |
| `isNullable` | Explicit `true` on both sides | Explicit `true` |
| `joinColumnName` | Explicit `templateId` | Also explicit |
| Comment style | "The one side" / "The many side" | None |

### Recommendation

Our inline approach is fine for simplicity. But for complex relations, the separate-file pattern is clearer.

---

## 4. Styling in Templates — Three-Layer System

### Layer 1: Custom Color Extension (`markdown-color.ts`)

```ts
// A fixed color palette shared by all rendering surfaces
export const TEXT_COLORS = {
  red: { hex: '#d1293d', rgb: [0.82, 0.16, 0.24] },
  orange: { hex: '#e8590c', rgb: [0.91, 0.35, 0.05] },
  green: { hex: '#177245', rgb: [0.09, 0.45, 0.27] },
  blue: { hex: '#1961ed', rgb: [0.098, 0.38, 0.929] },
  purple: { hex: '#7b2ff7', rgb: [0.48, 0.18, 0.97] },
  gray: { hex: '#6b7280', rgb: [0.42, 0.45, 0.5] },
};

// Tokenizer extension for :color[text] syntax
export const colorTextExtension: TokenizerAndRendererExtension = {
  name: 'colorText',
  level: 'inline',
  start(src) { return src.search(/:[a-z]+\[/) < 0 ? undefined : src.search(/:[a-z]+\[/); },
  tokenizer(src) {
    const match = COLOR_PATTERN.exec(src);
    if (!match) return undefined;
    const [raw, name, text] = match;
    if (!isColorName(name)) return undefined;  // Unknown colors fall through as plain text
    return { type: 'colorText', raw, colorName: name, text, tokens: this.lexer.inlineTokens(text) };
  },
  renderer(token) {
    const colorToken = token;
    const inner = this.parser.parseInline(colorToken.tokens);
    return `<span style="color:${escapeHtml(TEXT_COLORS[colorToken.colorName].hex)}">${inner}</span>`;
  },
};
```

**Key insight**: The color extension is shared across ALL rendering surfaces — React preview, HTML pages, and PDF. The `hex` values are for CSS, the `rgb` values are for pdf-lib.

### Layer 2: React Inline Styles (`markdown-to-react.tsx`)

```tsx
// Walk the marked token tree and produce React elements with inline CSSProperties
const renderInline = (tokens, keyPrefix) => {
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'strong': return <strong>{renderInline(token.tokens, key)}</strong>;
      case 'em': return <em>{renderInline(token.tokens, key)}</em>;
      case 'colorText':
        return <span style={{ color: TEXT_COLORS[token.colorName].hex }}>{renderInline(token.tokens, key)}</span>;
      case 'link':
        return safe ? <a href={token.href} target="_blank" rel="noopener noreferrer">{renderInline(token.tokens, key)}</a> : <span>{renderInline(token.tokens, key)}</span>;
      default: return <span>{token.text}</span>;
    }
  });
};
```

### Layer 3: HTML + CSS for Public Pages (`render-document.ts`)

```ts
// Full CSS stylesheet for public document rendering
export const DOCUMENT_PAPER_CSS = `
  .doc-paper {
    color: #1f2430;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif;
    line-height: 1.7;
    max-width: 720px;
    margin: 48px auto;
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(24, 39, 75, 0.08);
    overflow: hidden;
  }
  .doc-band { height: 6px; background: linear-gradient(90deg, #1961ed, #6b9bff); }
  .doc-body { padding: 64px 72px 72px; }
  .doc-title { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
  .doc-rule { height: 2px; width: 56px; background: #1961ed; border: 0; margin: 16px 0 32px; }
  .doc-body h1 { font-size: 24px; } .doc-body h2 { font-size: 20px; } .doc-body h3 { font-size: 16px; }
  .doc-body p { margin: 0 0 16px; }
  .doc-body blockquote { border-left: 3px solid #1961ed; background: #f6f8fd; }
  .doc-body code { font-family: monospace; background: #f1f3f9; padding: 2px 6px; border-radius: 4px; }
  @media print { .doc-paper { box-shadow: none; margin: 0; } }
`;

// Complete HTML page
export const documentHtmlPage = (title, content) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${PAGE_BODY_CSS}${DOCUMENT_PAPER_CSS}</style>
  </head>
  <body>${documentPaperHtml(title, content)}</body>
</html>`;
```

### Our Approach

We only have single-layer Handlebars rendering:
```ts
const rendered = renderHandlebarsTemplate({ htmlSource, context: previewData });
// Just raw HTML, no CSS layer
```

### What We Should Implement

1. **Add a CSS layer for public pages** — Create a `DOCUMENT_PAPER_CSS` equivalent for consistent public document rendering
2. **Add color extension** — Implement `:color[text]` syntax as a Handlebars helper
3. **Add print-friendly CSS** — `@media print` rules for PDF-quality output

---

## 5. PDF Generation — pdf-lib with Styled Typography

### Reference Implementation

The PDF generator (`generate-document-pdf.ts`) uses `pdf-lib` to create A4 PDFs with:

```ts
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 64;
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;

const ACCENT = rgb(0.098, 0.38, 0.929); // #1961ED
const INK = rgb(0.06, 0.08, 0.16);
const MUTED = rgb(0.28, 0.31, 0.42);

// Embed standard fonts
const fonts = {
  regular: await pdf.embedFont(StandardFonts.Helvetica),
  bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  mono: await pdf.embedFont(StandardFonts.Courier),
};
```

**Key features**:
- Colored header band with document title
- Word-wrapping with proper line breaks
- Bold/italic/code runs with font switching
- Blockquote accent bars spanning multiple pages
- List markers (bullets and numbers)
- Horizontal rules
- WinAnsi encoding fallback for non-Latin characters

### Our Approach

We use Puppeteer for PDF generation, which is heavier but simpler.

### Recommendation

Consider `pdf-lib` for lighter-weight PDF generation. The reference's approach is cleaner and doesn't require a browser instance.

---

## 6. Document Generation — Handler Pattern

### Reference Flow

```
User selects Person record
  → Opens side panel with template dropdown
  → Clicks "Generate"
  → POST /s/documents/generate { templateId, recordId }
  → Handler:
    1. Fetch template by ID
    2. Load Person record fields via GraphQL
    3. Flatten nested fields to dot-path keys
    4. Replace {{placeholders}} with values
    5. Create Document record
    6. Generate PDF with pdf-lib
    7. Upload PDF to document's file field
    8. Return success/error to UI
```

**Key code** (`generate-document-handler.ts`):

```ts
// Load record values
const record = await loadRecordValues(client, target, recordId);

// Render template
const { content, missingTokens } = renderTemplate(
  documentTemplate.body ?? '',
  record.values,
);

// Create document
const { createDocument } = await client.mutation({
  createDocument: {
    __args: {
      data: {
        name: `${documentTemplate.name} — ${record.displayName}`,
        content,
        status: DOCUMENT_STATUS_GENERATED,
        templateId: documentTemplate.id,
      },
    },
    id: true,
  },
});

// Generate and attach PDF
await attachGeneratedPdf(client, createDocument.id, createDocument.name, content);
```

**Record loading** (`load-record-values.ts`):
```ts
// Flattens nested GraphQL response to dot-path keys
// { name: { firstName: 'Ada' } } → { 'name.firstName': 'Ada' }
export const flattenRecord = (input, prefix = '') => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      acc[path] = '';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenRecord(value, path));
    } else if (typeof value !== 'object') {
      acc[path] = String(value);
    }
    return acc;
  }, {});
};
```

**Template rendering** (`render-template.ts`):
```ts
const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export const renderTemplate = (body, values) => {
  const missingTokens = new Set();
  const content = body.replace(PLACEHOLDER_PATTERN, (_match, token) => {
    const value = values[token];
    if (value === undefined || value === '') {
      missingTokens.add(token);
      return '';
    }
    return value;
  });
  return { content, missingTokens: [...missingTokens] };
};
```

### Our Approach

We use Handlebars which has built-in `{{#each}}`, `{{#if}}`, helpers, etc. — much more powerful than simple `{{placeholder}}` replacement.

### What We Should Adopt

1. **The `flattenRecord` pattern** — Our context providers could benefit from dot-path flattening
2. **Missing token reporting** — Show users which placeholders had no value
3. **The side panel UX** — Better than our modal approach

---

## 7. Object Model — Minimal but Complete

### Reference Objects

**DocumentTemplate** (3 fields):
| Field | Type | Purpose |
|-------|------|---------|
| `name` | TEXT | Template name (label identifier) |
| `body` | TEXT | Markdown template with `{{placeholders}}` |
| `target` | SELECT | Person or Company |

**Document** (4 fields):
| Field | Type | Purpose |
|-------|------|---------|
| `name` | TEXT | Auto-generated: "TemplateName — RecordName" |
| `content` | TEXT | Rendered Markdown with placeholders filled |
| `status` | SELECT | DRAFT or GENERATED |
| `file` | FILES | PDF attachment (max 1) |

### Our Objects

**DocumentTemplate** (8 fields): name, description, htmlSource, previewData, boundObjectName, allowedOutputTypes, status, version

**TemplateVersion** (6 fields): name, template, versionNumber, htmlSource, diff, createdBy

**Document** (10 fields): name, template, primaryObjectType, primaryRecordId, renderedHtml, pdfUrl, status, errorMessage, generatedBy, generatedAt, metadata

### Key Difference

Our model is more feature-rich (versioning, preview data, audit trail, error tracking) but also more complex. The reference keeps it minimal — just what's needed for the core workflow.

---

## 8. Roles — Least Privilege

### Reference Role

```ts
export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: `${APP_DISPLAY_NAME} default role`,
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canAccessAllTools: true,
  canBeAssignedToAgents: true,
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.UPLOAD_FILE],
});
```

**Key insight**: Uses `SystemPermissionFlag.UPLOAD_FILE` to grant PDF upload permission. Our role uses custom permission scopes.

---

## 9. Page Layouts — VERTICAL_LIST vs GRID

### Reference Template Layout

```ts
export default definePageLayout({
  universalIdentifier: TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Template record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      title: 'Fields',
      position: 0,
      icon: 'IconList',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,  // ← Key difference
      widgets: [{ type: 'FIELDS', configuration: { configurationType: 'FIELDS' } }],
    },
    {
      title: 'Editor',
      position: 50,
      icon: 'IconEdit',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [{ type: 'FRONT_COMPONENT', configuration: { frontComponentUniversalIdentifier: TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } }],
    },
  ],
});
```

### Our Template Layout

```ts
{
  title: 'Fields',
  position: 0,
  layoutMode: PageLayoutTabLayoutMode.GRID,  // ← Different
  widgets: [
    { type: 'FIELDS', gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 4 } },
    { type: 'FIELD', gridPosition: { row: 4, column: 0, rowSpan: 4, columnSpan: 4 },
      configuration: { fieldMetadataId: DOCUMENT_TEMPLATE_FIELDS.htmlSource, fieldDisplayMode: 'EDITOR' } },
  ],
}
```

### Key Difference

The reference uses `VERTICAL_LIST` which gives a cleaner, native-looking field display. We use `GRID` which requires explicit `gridPosition` for each widget.

### Recommendation

Switch to `VERTICAL_LIST` for the Fields tab — it's simpler and matches Twenty's native field display pattern.

---

## 10. Command Menu Integration

### Reference

```ts
export default defineCommandMenuItem({
  universalIdentifier: GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
  label: 'Generate document',
  shortLabel: 'Generate',
  availabilityType: 'RECORD_SELECTION',
  objectStandardIdentifier: PERSON_STANDARD_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: GENERATE_DOCUMENT_FORM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
```

**Key**: Available when a Person record is selected. Opens a side panel with the form.

### Our Approach

We use a command menu item too, but with a modal instead of side panel.

---

## 11. Summary of Implementable Features

### High Priority
1. **:color[text] syntax** — Add as Handlebars helper for colored text in templates
2. **Structured CSS layer** — Create `DOCUMENT_PAPER_CSS` equivalent for public pages
3. **Side panel for generation** — Switch from modal to side panel
4. **VERTICAL_LIST layout** — Use for Fields tab

### Medium Priority
1. **Formatting toolbar** — Add Bold/Italic/Link/Code buttons that insert Handlebars syntax
2. **Split-pane editor** — textarea + live Handlebars preview
3. **Missing token reporting** — Show which placeholders had no value
4. **Print-friendly CSS** — `@media print` rules

### Low Priority
1. **pdf-lib for PDF generation** — Lighter than Puppeteer
2. **AI agent for document generation** — Reference has a document assistant
3. **Theme token integration** — Use `var(--t-*)` CSS variables

---

## 12. Twenty Front Component Sandbox — Critical Constraints

> **Discovered: 2026-07-04 during TinyMCE integration attempt**

### What the Sandbox IS

Twenty front components run inside a **Web Worker using Remote DOM**:

```
Browser Main Thread
  ├── Twenty UI (React)
  └── [Remote DOM bridge]
        ↕ message-passing
Worker Thread
  └── YOUR front component (React + SDK)
        → DOM elements are proxied to the main thread
        → They appear natively in the page (not in an iframe)
```

### What WORKS in a Worker

| Feature | Works? | Notes |
|---------|--------|-------|
| `useState`, `useEffect`, hooks | ✅ | Standard React |
| JSX / React rendering | ✅ | Elements proxied to real DOM |
| `dangerouslySetInnerHTML` | ✅ | Proven by "Preview" tab |
| `<textarea>`, `<div>`, `<button>` | ✅ | Standard HTML via Remote DOM |
| `CoreApiClient` GraphQL queries | ✅ | All front components use this |
| `useSelectedRecordIds()` | ✅ | Twenty SDK hook |
| `fetch()` / HTTP calls | ✅ | Workers have full fetch access |
| `navigator.clipboard.writeText()` | ✅ | Used in variable picker |

### What DOES NOT WORK in a Worker

| Feature | Works? | Why it fails |
|---------|--------|-------------|
| Dynamic `<script>` injection | ❌ | Workers can't load external JS via DOM |
| TinyMCE `tinymceScriptSrc` | ❌ | Uses `<script>` injection internally |
| `document.execCommand()` | ❌ | Not proxied by Remote DOM |
| `<iframe>` with `src=` URL | ❌ | Cross-origin restrictions in Workers |
| `<iframe>` with `srcDoc=` | ✅ | Only `srcDoc` (inline HTML) works |
| `window.open()` | ❌ | No window in a Worker |
| Any library that calls `document.createElement('script')` | ❌ | Same as script injection |

### The TinyMCE Anti-Pattern (DO NOT DO THIS)

```tsx
// ❌ BROKEN — tinymceScriptSrc injects a <script> at runtime
// The Worker cannot load external scripts → TinyMCE never initializes
// → Component returns nothing → Twenty shows "No Data"
import { Editor } from '@tinymce/tinymce-react';
<Editor tinymceScriptSrc="/tinymce/tinymce.min.js" ... />

// ❌ ALSO BROKEN — dynamic import() of TinyMCE still fails
// because TinyMCE itself calls document.createElement('script') internally
const loadTinyMce = async () => {
  const mod = await import('tinymce');  // loads but fails to init
  await import('tinymce/themes/silver');
  ...
};
```

### The Correct Pattern for Rich Editing

```tsx
// ✅ WORKS — dangerouslySetInnerHTML for display
<div dangerouslySetInnerHTML={{ __html: htmlSource }} />

// ✅ WORKS — <textarea> for raw source editing
<textarea value={htmlDraft} onChange={(e) => setHtmlDraft(e.target.value)} />

// ✅ WORKS — <iframe srcDoc> for sandboxed preview
<iframe srcDoc={previewHtml} sandbox="" style={{ width: '100%', flex: 1 }} />

// ✅ WORKS — Full API round-trip
const result = await client.query({ documentTemplate: { ... } });
await client.mutation({ updateDocumentTemplate: { ... } });
```

### When "No Data" Appears

"No Data" is Twenty's **widget placeholder** — it appears when the front component renders **nothing at all** (null/undefined). This is different from an error state. Common causes:

1. **Front component fails to initialize** (most common) — usually means the component threw during mount or returned nothing. Check browser console.
2. **Component not exported from `index.ts`** — Twenty discovers components via static analysis of `index.ts`. If a front component is not exported there, it's silently skipped.
3. **Build error** — If any exported file has a TypeScript/import error, the whole bundle can fail silently.
4. **Wrong `universalIdentifier`** — Mismatch between the UUID in `defineFrontComponent()` and the UUID in `definePageLayoutTab()`.

---

## 13. The `index.ts` Export Rule — Critical for Entity Discovery

> **Discovered: 2026-07-04**

### Rule

Every entity (front component, page layout tab, object, field, etc.) **MUST be exported from `src/index.ts`**. The Twenty CLI uses static analysis on this file to discover what to register.

If you create a new file but forget to export it from `index.ts`:
- The entity is **silently skipped** — no error, no warning
- The tab/widget shows "No Data" because there's nothing registered
- The front component never loads

### Example — What Broke It

```ts
// ❌ New files created but NOT exported in index.ts
// → Twenty ignores them completely → "No Data"
// src/front-components/tinymce-beta-editor.front-component.tsx (not in index.ts)
// src/page-layout-tabs/document-template-beta-editor.page-layout-tab.ts (not in index.ts)
```

### Example — How to Fix It

```ts
// ✅ Add to src/index.ts
export { default as documentTemplateBetaEditorTab } from './page-layout-tabs/document-template-beta-editor.page-layout-tab';
export { default as tinymceBetaEditorFrontComponent } from './front-components/tinymce-beta-editor.front-component';
```

### Corollary: Corrupted Files Break Everything

If a file exported from `index.ts` has a **syntax error or duplicate declarations**, the entire bundle may fail, causing ALL front components to show "No Data" — not just the broken one. Always verify there are no duplicate `export default` or duplicate `import` statements.

---

## 14. App Install/Uninstall Workflow — Version Management

> **Discovered: 2026-07-04**

### Rules

1. **You cannot install a version that's already installed.** The CLI rejects: `6eaaf6ac@0.2.14 is already installed`.
2. **You must uninstall before reinstalling** — there's no "upgrade in place".
3. **`yarn twenty app:uninstall .` prompts for confirmation** — pass `echo y |` in front or use the interactive input to confirm.
4. **Version in `package.json` must change** between installs (or uninstall+reinstall).

### Correct Workflow

```bash
# 1. Make your changes
# 2. Bump version in package.json
# 3. Uninstall current version
echo y | yarn twenty app:uninstall .
# 4. Commit & push
git add -A
git commit -m "your message"
git push
# 5. Install new version
yarn twenty app:install .
```

### WSL Path Note

When running from Windows PowerShell via WSL, always use single quotes around paths with spaces:

```bash
# ✅ Correct
wsl -e bash -c "cd '/mnt/c/Users/vm_user/Downloads/Documents & Templates/documents-templates' && yarn twenty app:install ."

# ❌ Wrong — the & in the path breaks the shell command
wsl -e bash -c "cd /mnt/c/.../Documents & Templates/..."
```

---

## 15. Git Recovery — Restoring a Working State

> **Discovered: 2026-07-04**

When the app is broken due to bad commits (e.g., TinyMCE rewrites), the fastest recovery is:

### 1. Find the last working commit

```bash
git log --oneline -- src/front-components/template-editor.front-component.tsx
# Example output:
# 318d812 Native Fields tab, variable picker, starter templates & editor improvements (#3)
# c15c864 Add native Fields tab to DocumentTemplate; slim the Editor widget
```

### 2. Restore specific files from that commit

```bash
# Restore just the broken file(s)
git checkout 318d812 -- src/front-components/template-editor.front-component.tsx
git checkout 318d812 -- src/index.ts
git checkout 318d812 -- src/constants/model-identifiers.ts
```

### 3. Delete any new broken files that were added since

```bash
# In WSL/bash
rm src/front-components/tinymce-beta-editor.front-component.tsx
rm src/page-layout-tabs/document-template-beta-editor.page-layout-tab.ts

# In PowerShell
Remove-Item -Force "src\front-components\tinymce-beta-editor.front-component.tsx"
```

### 4. Commit the rollback

```bash
# Use semicolons in PowerShell, NOT && (&& is not a valid separator in PS5)
git add src/front-components/template-editor.front-component.tsx src/index.ts package.json
git commit -m "fix: roll back to working state from commit 318d812"
git push
```

> **PowerShell gotcha**: `&&` (AND operator) is NOT valid in PowerShell 5.x (Windows default).
> Use `;` to chain commands, or use `wsl -e bash -c "cmd1 && cmd2"` for bash-style chaining.

---

## 16. Preview Tab — How It Actually Works

> **The working implementation from commit `318d812`**

The "Preview" tab (`template-editor.front-component.tsx`) works like this:

1. `useSelectedRecordIds()` returns the currently open record's ID
2. Fetches the template via `CoreApiClient` GraphQL query
3. Calls `renderHandlebarsTemplate({ htmlSource, context: previewData })` — server-side Handlebars rendering
4. Renders the result inside a sandboxed `<iframe srcDoc={previewHtml}>` with `sandbox=""` attribute
5. Also shows a variable picker sidebar for copying `{{variable}}` expressions

**Key**: The preview uses `<iframe srcDoc>` not `dangerouslySetInnerHTML` — this provides proper CSS isolation so the template's own styles don't bleed into Twenty's UI.

### Why the Preview Was Broken

After the TinyMCE commits (`d8d0160`, `2963bbe`, `177e361`), `template-editor.front-component.tsx` was entirely replaced with TinyMCE code. Since TinyMCE can't run in a Worker, the component rendered nothing → "No Data".

**Fix**: `git checkout 318d812 -- src/front-components/template-editor.front-component.tsx`
