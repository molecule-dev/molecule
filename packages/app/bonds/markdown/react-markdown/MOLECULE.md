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
