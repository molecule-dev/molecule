# @molecule/app-markdown

Markdown rendering core interface for molecule.dev.

Provides a standardized API for rendering markdown content into HTML,
with support for GFM and table of contents extraction.
Bond a provider (e.g. `@molecule/app-markdown-react-markdown`) to supply
the concrete implementation.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-markdown'
import { provider } from '@molecule/app-markdown-react-markdown'

setProvider(provider) // once, at startup (bonds.ts)

const result = requireProvider().render('# Hello World', { gfm: true })
console.log(result.html) // sanitized HTML string
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-markdown @molecule/app-bond
```

## API

### Interfaces

#### `MarkdownOptions`

Options for markdown rendering.

```typescript
interface MarkdownOptions {
  /** Whether to sanitize the rendered HTML to prevent XSS. Defaults to `true`. */
  sanitize?: boolean

  /** Whether to enable GitHub Flavored Markdown extensions. Defaults to `true`. */
  gfm?: boolean

  /** Whether to convert line breaks to `<br>` elements. Defaults to `false`. */
  breaks?: boolean

  /** Custom component overrides keyed by HTML element name. */
  components?: Record<string, unknown>

  /** Target attribute for rendered links. */
  linkTarget?: '_blank' | '_self'
}
```

#### `MarkdownProvider`

Markdown rendering provider interface.

All markdown providers must implement this interface to render
markdown strings into HTML output with optional features.

```typescript
interface MarkdownProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Renders a markdown string into HTML.
   *
   * @param markdown - The markdown source string to render.
   * @param options - Optional rendering configuration.
   * @returns The rendered HTML and optional table of contents.
   */
  render(markdown: string, options?: MarkdownOptions): RenderedMarkdown
}
```

#### `RenderedMarkdown`

Result of rendering markdown content.

```typescript
interface RenderedMarkdown {
  /** The rendered HTML string. */
  html: string

  /** Optional table of contents extracted from headings. */
  toc?: TocEntry[]
}
```

#### `TocEntry`

Table of contents entry extracted from markdown headings.

```typescript
interface TocEntry {
  /** Unique identifier for the heading (slug). */
  id: string

  /** Text content of the heading. */
  text: string

  /** Heading level (1-6). */
  level: number
}
```

### Functions

#### `getProvider()`

Retrieves the bonded markdown provider, or `null` if none is bonded.

```typescript
function getProvider(): MarkdownProvider | null
```

**Returns:** The active markdown provider, or `null`.

#### `hasProvider()`

Checks whether a markdown provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a markdown provider is available.

#### `requireProvider()`

Retrieves the bonded markdown provider, throwing if none is configured.

```typescript
function requireProvider(): MarkdownProvider
```

**Returns:** The active markdown provider.

#### `setProvider(provider)`

Registers a markdown provider as the active singleton.

```typescript
function setProvider(provider: MarkdownProvider): void
```

- `provider` — The markdown provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Markdown | `@molecule/app-markdown-react-markdown` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **Wire a bond at startup** — {@link requireProvider} throws until
  `setProvider(provider)` has been called.
- **`sanitize` defaults to `true` and is the XSS gate.** The result is an
  HTML STRING you inject via your framework's raw-HTML mechanism — that is
  only safe because it was sanitized. NEVER pass `sanitize: false` for
  user-supplied or model-generated markdown (chat replies, comments, notes);
  reserve it for fully trusted, app-authored content.
- Options are per-call (`gfm`, `breaks`, `linkTarget`); `result.toc` carries
  extracted headings when the provider supports it. Syntax highlighting is a
  provider concern — e.g. the react-markdown bond wires a rehype highlighter
  via its `rehypePlugins` config rather than a generic option.

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
