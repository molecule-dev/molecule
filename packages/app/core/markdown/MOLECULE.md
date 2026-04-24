# @molecule/app-markdown

Markdown rendering core interface for molecule.dev.

Provides a standardized API for rendering markdown content into HTML,
with support for GFM, syntax highlighting, and table of contents extraction.
Bond a provider (e.g. `@molecule/app-markdown-react-markdown`) to supply
the concrete implementation.

## Quick Start

```typescript
import { requireProvider } from '@molecule/app-markdown'

const md = requireProvider()
const result = md.render('# Hello World', { gfm: true })
console.log(result.html)
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-markdown
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

  /** Whether to enable syntax highlighting for code blocks. Defaults to `false`. */
  syntaxHighlight?: boolean

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
