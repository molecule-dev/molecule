# @molecule/app-markdown-react-markdown

Markdown provider for `@molecule/app-markdown`, backed by the real
`react-markdown` 10 library plus `remark-gfm`.

The core contract returns an HTML STRING (`render(): { html: string; toc? }`),
but react-markdown renders React elements — so this bond renders that element
tree to a static string with `renderToStaticMarkup` (`react-dom/server`).
You still get real CommonMark parsing and full GitHub Flavored Markdown
(tables, strikethrough, task lists, autolinks, footnotes) via `remark-gfm`.

## Quick Start

```typescript
import { provider } from '@molecule/app-markdown-react-markdown'
import { requireProvider, setProvider } from '@molecule/app-markdown'

setProvider(provider) // once, at app startup (bonds.ts)

const { html } = requireProvider().render('| a | b |\n| - | - |\n| 1 | 2 |')
// html === '<table>…</table>'  (a real GFM table)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-markdown-react-markdown @molecule/app-markdown react react-dom react-markdown remark-gfm
npm install -D @types/react @types/react-dom
```

## API

### Interfaces

#### `ReactMarkdownConfig`

Provider-specific configuration for {@link createProvider}. These are the
defaults baked into a provider instance; per-call {@link MarkdownOptions}
(from `@molecule/app-markdown`) override the ones they share (`sanitize`,
`gfm`, `components`).

```typescript
interface ReactMarkdownConfig {
  /**
   * Whether to sanitize link/image URLs by default (the XSS URL gate). When
   * `true` (default) react-markdown's `defaultUrlTransform` strips dangerous
   * schemes (`javascript:`, `data:`, `vbscript:`, …); when `false` all schemes
   * pass through for trusted, app-authored content. Raw HTML in the source is
   * ALWAYS escaped to inert text regardless of this flag (react-markdown never
   * executes it), so `sanitize: false` only relaxes URL filtering — it does not
   * enable raw-HTML passthrough. Defaults to `true`.
   */
  sanitize?: boolean

  /**
   * Whether to enable GitHub Flavored Markdown (the `remark-gfm` plugin —
   * tables, strikethrough, task lists, autolinks, footnotes) by default.
   * Defaults to `true`.
   */
  gfm?: boolean

  /**
   * Extra remark plugins to run, appended after `remark-gfm` and the (optional)
   * hard-break transform. Use for additional markdown-AST extensions.
   */
  remarkPlugins?: MarkdownPluginList

  /**
   * Rehype plugins to run on the HTML AST (after `remark-rehype`), appended
   * after the built-in heading-id plugin. This is where a real syntax
   * highlighter (e.g. `rehype-highlight`) is wired in.
   */
  rehypePlugins?: MarkdownPluginList

  /**
   * Restrict the output to only these HTML tag names. Mutually exclusive with
   * {@link ReactMarkdownConfig.disallowedElements} — if both are set,
   * `allowedElements` wins.
   */
  allowedElements?: readonly string[]

  /** Drop these HTML tag names from the output (e.g. `['img']`). */
  disallowedElements?: readonly string[]

  /**
   * Custom component overrides keyed by tag name (react-markdown's
   * `Components`). Merged with any per-call `options.components`, which win.
   */
  components?: Components
}
```

### Types

#### `MarkdownPluginList`

A list of remark or rehype plugins — react-markdown's `PluggableList`
(a plugin function, a `[plugin, options]` tuple, or a preset). Re-derived
from react-markdown's own `Options` so no extra dependency on `unified` is
needed.

```typescript
type MarkdownPluginList = NonNullable<Options['remarkPlugins']>
```

### Functions

#### `createProvider(config)`

Creates a react-markdown provider instance.

```typescript
function createProvider(config?: ReactMarkdownConfig): MarkdownProvider
```

- `config` — Optional provider configuration (defaults for every render).

**Returns:** A configured {@link MarkdownProvider}.

### Constants

#### `provider`

Default react-markdown provider instance (GFM + URL sanitization on).

```typescript
const provider: MarkdownProvider
```

## Core Interface
Implements `@molecule/app-markdown` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-markdown'
import { provider } from '@molecule/app-markdown-react-markdown'

export function setupMarkdownReactMarkdown(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-markdown` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-markdown`
- `react`
- `react-dom`
- `react-markdown`
- `remark-gfm`

- **GFM is real and on by default.** Tables, `~~strikethrough~~`,
  `- [x]` task lists, bare-URL autolinks, and footnotes all render. Set
  `gfm: false` (per call or in {@link ReactMarkdownConfig}) to fall back to
  plain CommonMark — a pipe table then renders as literal text.
- **Raw HTML is never executed.** react-markdown does not include
  `rehype-raw`, so any raw HTML in the source (`<script>`, `<b>`, an
  `onerror` attribute) is escaped to inert text — the bond is XSS-safe for
  raw HTML unconditionally. The `sanitize` flag therefore governs only URL
  filtering: on (default) strips dangerous `href`/`src` schemes
  (`javascript:`, `data:`, …) via `defaultUrlTransform`; off lets all schemes
  through for trusted, app-authored content. `sanitize: false` does NOT
  enable raw-HTML passthrough. Keep sanitize on for user- or model-generated
  markdown.
- **Honored options:** `gfm`, `sanitize`, `breaks` (soft breaks → `<br>`),
  `linkTarget` (`_blank` also adds `rel="noopener noreferrer"`), and
  `components` (custom tag overrides). Headings get slug `id`s so `result.toc`
  anchors resolve. For syntax highlighting, fenced code always carries a
  `language-*` class (highlighter-ready); to actually colorize, pass a rehype
  highlighter (e.g. `rehype-highlight`) via `config.rehypePlugins`.
- **{@link ReactMarkdownConfig}** additionally exposes `remarkPlugins`,
  `rehypePlugins`, `allowedElements`, and `disallowedElements` for
  provider-level customization at {@link createProvider} time.
- **Wire it** with `setProvider()` from `@molecule/app-markdown` or
  `bond('markdown', provider)` from `@molecule/app-bond` — both route through
  the shared registry; `requireProvider()` throws until one has run.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Common markdown renders as real HTML wherever the app shows it (chat
  reply, comment, note, README preview): `#`..`######` become `<h1>`..`<h6>`,
  `**bold**` a `<strong>`, `*italic*` an `<em>`, `-`/`1.` lists become
  `<ul>`/`<ol>` of `<li>`, `[text](url)` an `<a>` anchor, and a fenced code
  block a `<pre><code>` — not the raw `*`/backticks shown as literal text.
- [ ] GFM extras render when enabled (`gfm`, default on): a pipe table
  `| a | b |` becomes a real `<table>` with header + rows, and `![alt](src)`
  an `<img>`.
- [ ] The output tracks the source: editing the markdown updates the preview
  live — change a heading's text and its `<h#>` updates; add a list item and
  a new `<li>` appears. No stale or one-shot render.
- [ ] SECURITY (XSS) — user- or model-supplied markdown is sanitized
  (`sanitize`, default on, the XSS gate): markdown containing a raw
  `<script>alert(1)</script>`, an `<img src=x onerror=alert(1)>`, or a
  `[click](javascript:alert(1))` link must NOT execute and must NOT produce
  active markup — the script is stripped, the `onerror` is gone, and the
  link's `href` is neutralized. Verify in the browser: no alert fires, and
  DevTools shows no `<script>`, `onerror`, or `javascript:` in the rendered
  DOM. Never render untrusted content with `sanitize: false`.
- [ ] Malformed markdown degrades gracefully — an unclosed `**`, a broken
  `[link](`, or a half-open code fence renders as readable text and never
  throws, blanks the view, or breaks the surrounding page.
