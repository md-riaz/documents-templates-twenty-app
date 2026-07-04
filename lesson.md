# Lessons Learned: Twenty CRM App Development

Hard-won corrections from building a real Twenty CRM app (Documents & Templates).
Written for future AI assistants working on this codebase or similar Twenty SDK apps.

---

## 1. Front Components Run in a Remote-DOM Worker, Not a Normal Browser Tab

**What I assumed:** Front components render in a standard browser DOM where `<script>` elements execute normally, and CDN loading via `document.createElement('script')` would work.

**Reality:** Twenty front components run inside a **remote-DOM worker** environment. The SDK's `jsx-runtime-remote-wrapper` esbuild plugin intercepts all JSX at build time and remaps standard HTML tags to custom elements via `globalThis.__HTML_TAG_TO_CUSTOM_ELEMENT_TAG__`. The host application (Twenty's core frontend) interprets these custom elements and mirrors them into the real DOM.

Key consequences:
- **`<script>` elements appended to the DOM are inert** -- they never execute. CDN-based library loading silently fails (no `onload`, no `onerror`).
- **`<style>` elements are intercepted** by the JSX wrapper and injected into `document.head` via `injectStyleViaHead()`. They never render as DOM nodes.
- **Event handlers** (`onClick`, `onInput`, etc.) are stripped from props and applied imperatively via a `ref` callback, because the custom element bridge can't process React synthetic events natively.
- **Inline `style` attributes pass through unchanged** -- they are NOT intercepted.

**How to load libraries:** Bundle them at build time via `import` (or dynamic `import()` for deferred evaluation). Never rely on runtime script injection.

**SDK source:** `node_modules/twenty-sdk/dist/get-front-component-build-plugins-BuE2QdIr.mjs`, lines 3-57 (JSX wrapper), lines 58-64 (transform plugin).

---

## 2. Dynamic `import()` Is Required for Libraries That Touch `window` at Top Level

**What I assumed:** Static `import tinymce from 'tinymce'` would work since esbuild bundles everything.

**Reality:** The Twenty CLI's `dev:build` runs a **manifest generation step in Node.js** that evaluates the module graph. Static imports execute at the top level, and libraries like TinyMCE that reference `window` immediately cause `ReferenceError: window is not defined` during this Node.js step.

**Fix:** Use dynamic `import()` wrapped in an async loader function. With esbuild's `bundle: true` + `splitting: false`, the code is inlined but evaluation is deferred to runtime:

```typescript
let tinymceInstance: any = null;
const loadTinyMce = async (): Promise<any> => {
  if (tinymceInstance) return tinymceInstance;
  const mod = await import('tinymce');
  await import('tinymce/models/dom');
  // ... other sub-modules
  tinymceInstance = mod.default ?? mod;
  return tinymceInstance;
};
```

**SDK build config:** `bundle: true`, `splitting: false`, `format: "esm"`, `jsx: "automatic"`.

---

## 3. TinyMCE Must Target a Native DOM Element, Not a React-Rendered One

**What I assumed:** TinyMCE could initialize on a React-rendered `<textarea>`.

**Reality:** The JSX wrapper remaps `<textarea>` to a custom element (e.g., `tw-textarea`). TinyMCE can't attach to custom elements -- it needs a real `<textarea>`. The fix is to use `document.createElement('textarea')` and manually append it to the container:

```typescript
const textarea = document.createElement('textarea');
container.appendChild(textarea);
// TinyMCE targets this native element
tmce.init({ target: textarea, ... });
```

---

## 4. Container Height Is Controlled by Twenty's Host, Not the SDK

**What I assumed:** The SDK provides height configuration for front component containers, or that `PageLayoutTabLayoutMode.CANVAS` implies specific sizing behavior defined in the SDK.

**Reality:** The SDK is a **thin declarative adapter**. It ships `layoutMode` as a configuration value in the manifest -- the actual layout/sizing interpretation happens entirely in **Twenty's host application** (a separate codebase). The SDK contains:
- Zero CSS for layout modes
- Zero height synchronization between front component and host
- Zero documentation on container dimensions

The three layout modes (`GRID`, `VERTICAL_LIST`, `CANVAS`) are hints to the host:
- `GRID` -- host renders widgets in a CSS grid; widgets specify `gridPosition: { row, column, rowSpan, columnSpan }`
- `VERTICAL_LIST` -- host stacks widgets vertically (used for native Fields tabs)
- `CANVAS` -- host gives the single widget the full tab area (free-form)

**For full-height front components in CANVAS mode**, use viewport-based CSS as a fallback since you can't rely on the container having an explicit height:

```tsx
style={{
  height: '100%',                              // fills container if it has explicit height
  minHeight: 'max(480px, calc(100dvh - 200px))', // viewport fallback otherwise
}}
```

**SDK source:** `node_modules/twenty-sdk/dist/define/index.d.ts`, lines 765-769 (enum), line 1031 (usage in manifest type).

---

## 5. The `__renderFrontComponent(__container)` Contract

**What I assumed:** There might be props, context, or sizing information passed to the front component.

**Reality:** The build plugin transforms `defineFrontComponent({ component: X })` into:

```javascript
export default function __renderFrontComponent(__container) {
  __createRoot(__container).render(__frontComponentJsx(X, {}));
}
```

The component receives **empty props** `{}`. All context comes from SDK hooks:
- `useSelectedRecordIds()` -- current record
- `useUserId()` -- current user
- `useColorScheme()` -- light/dark theme
- `useFrontComponentExecutionContext()` -- side panel vs widget

Communication with the host uses `globalThis.frontComponentHostCommunicationApi` (navigation, snackbar, clipboard, etc.) -- but **no dimension/sizing API exists**.

---

## 6. TinyMCE Skin CSS Works via Resource Registration, Not URL Fetch

**What I assumed:** TinyMCE skins require a URL to fetch CSS files at runtime, and `skin_url` must be configured.

**Reality:** TinyMCE's skin `.js` files (e.g., `tinymce/skins/ui/oxide/skin.js`) call `tinymce.Resource.add('ui/oxide/skin.css', '<inlined CSS>')` to register CSS directly with TinyMCE's internal resource manager. When bundled via `import`, the CSS is inlined in the JS bundle -- no URL fetch needed.

**Configuration:** Set `skin: false` and `content_css: false` to prevent TinyMCE from attempting URL-based skin loading:

```typescript
skin: false as unknown as string,
content_css: false as unknown as string,
```

---

## 7. The "Other App" Pattern Is Not Applicable to SDK-Based Apps

**What I assumed:** The `twenty-advanced-tasks-app` repo's full-screen layout approach could be directly adopted.

**Reality:** That app uses a completely custom `AppManifest` type from `./lib/twenty-app-schema` -- it is **NOT** built on the standard Twenty SDK (`twenty-sdk/define`). Its layout system (`{ type: 'record-detail', component: 'X', slots: {...} }`) bears no relation to `definePageLayout` / `definePageLayoutTab`. Its CSS patterns (`min-height: 680px` on `.at-body`) work because its component IS the entire record detail page, not a widget inside one.

Our app uses the official SDK pattern where front components are widgets inside page layout tabs. Different architecture = different height strategy.

---

## 8. Force-Pushing Over Merged PR Branches

**What I assumed:** A merged PR branch could be force-pushed normally.

**Reality:** When a PR is merged via GitHub's squash-merge or merge commit, the remote branch tip may not be an ancestor of the new local branch (even if the local branch is based on `main` which includes the merge). This happens because:
1. GitHub's merge commit's parents may reference a different commit than the branch tip (if commits were added after merge)
2. `git merge-base --is-ancestor` returns false

**Workaround:** If force push is unavailable, merge the remote branch into local first (`git merge origin/branch-name`), resolve conflicts by keeping local ("ours"), then regular push. The history is messy but the code state is correct.

---

## 9. Twenty SDK Documentation Is Minimal

**What I assumed:** The SDK would have comprehensive documentation for front component development, layout modes, and styling.

**Reality:** The SDK's README covers only CLI setup and build commands. The `.d.ts` types have zero JSDoc comments on layout mode enums. The online docs at `docs.twenty.com/developers/extend/apps/` cover the concept and hooks but omit:
- Container sizing behavior per layout mode
- How the host renders CANVAS vs GRID vs VERTICAL_LIST
- Styling best practices for full-height components
- What dimensions the `__container` element receives

When the SDK docs are silent, **read the SDK source** (`dist/*.mjs` and `dist/*.d.ts`). The build plugins, type definitions, and minified runtime code are the real documentation.

---

## 10. `<style>` Elements Are Swallowed -- Use Inline Styles or `injectStyleViaHead`

**What I assumed:** CSS could be applied via `<style>` elements rendered in JSX like normal React.

**Reality:** The JSX wrapper intercepts `<style>` elements, extracts their CSS text, calls `injectStyleViaHead(cssText)` to append a `<style>` tag to `document.head`, and returns `null` (the `<style>` element never renders in the component tree). This works for global CSS but means:
- `<style>` elements in JSX produce side effects, not DOM nodes
- CSS is deduplicated by hash (same CSS text = same `<style>` tag, not re-injected)
- The `data-jsx-style` attribute identifies SDK-injected styles

For component-scoped styling, **inline `style` attributes** are the most reliable approach since they pass through the wrapper unchanged.

---

## Summary Table

| Topic | Wrong Assumption | Reality | Source |
|-------|-----------------|---------|--------|
| Script loading | CDN `<script>` works | Remote-DOM blocks `<script>` execution | SDK build plugins |
| Static imports | Bundled = safe | Node.js manifest step crashes on `window` | Build process |
| TinyMCE target | React elements work | Must use `document.createElement` | JSX wrapper remaps tags |
| Container height | SDK controls it | Host controls it; SDK is declarative only | SDK types + runtime |
| CANVAS mode | Defined in SDK | SDK ships the value; host interprets it | `define/index.d.ts` |
| Component props | Might receive props | Always `{}` empty; use hooks for context | Build plugin output |
| Skin CSS | Needs URL fetch | Bundled `.js` uses `Resource.add` | TinyMCE source |
| Other app's pattern | Directly applicable | Different framework entirely | Custom `AppManifest` |
| SDK documentation | Comprehensive | Minimal; read source instead | SDK README + d.ts |
| `<style>` in JSX | Renders normally | Intercepted, injected to `<head>`, returns null | JSX wrapper |
