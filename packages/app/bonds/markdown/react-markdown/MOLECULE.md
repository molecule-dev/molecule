# @molecule/app-markdown-react-markdown

Markdown provider for `@molecule/app-markdown` — a small built-in
regex-based renderer producing a sanitized HTML string. Despite the name,
this bond does NOT use the react-markdown library (no dependency) and is
framework-agnostic.

## Quick Start

```typescript
import { provider } from '@molecule/app-markdown-react-markdown'
import { setProvider } from '@molecule/app-markdown'

setProvider(provider)   // once, at app startup (bonds.ts)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-markdown-react-markdown @molecule/app-markdown
```

## API

### Interfaces

#### `ReactMarkdownConfig`

Provider-specific configuration options.

```typescript
interface ReactMarkdownConfig {
  /** Whether to sanitize HTML by default. Defaults to `true`. */
  sanitize?: boolean

  /** Whether to enable GFM by default. Defaults to `true`. */
  gfm?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a react-markdown-compatible provider instance.

```typescript
function createProvider(config?: ReactMarkdownConfig): MarkdownProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured MarkdownProvider.

### Constants

#### `provider`

Default react-markdown provider instance.

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

### Runtime Dependencies

- `@molecule/app-markdown`

- **`gfm` and `syntaxHighlight` are currently INERT** — no tables,
  strikethrough, or task lists render, and fenced code only gets a
  `language-*` class (bring your own highlighter CSS). Supported: headings
  (with slug ids), fenced + inline code, blockquotes, bold/italic, images,
  links, horizontal rules, flat `<li>` items, `breaks`, `linkTarget`. If the
  app needs real GFM, that's a provider gap — not a usage bug.
- `sanitize` defaults to `true` and is the XSS gate (full-source escaping +
  an http/https/mailto scheme allow-list). Keep it on for user- or
  model-generated content; see `@molecule/app-markdown`'s remarks.
- **Wire with `setProvider()` from `@molecule/app-markdown`** — the core
  keeps a module-local singleton; a generic `bond('markdown', …)` silently
  no-ops and `requireProvider()` throws.

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
  an `<img>`. With `syntaxHighlight` on, code tokens are colorized, not one
  flat monochrome block.
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
