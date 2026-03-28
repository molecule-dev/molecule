# @molecule/api-sitemap-xml

XML sitemap, RSS, and Atom feed provider for molecule.dev.

Implements the `SitemapProvider` interface using zero-dependency XML string
generation. Produces valid XML sitemaps (with image and alternate language
support), sitemap indexes, RSS 2.0 feeds, and Atom feeds.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-sitemap-xml
```

## Usage

```typescript
import { setProvider, addUrl, generate } from '@molecule/api-sitemap'
import { provider } from '@molecule/api-sitemap-xml'

setProvider(provider)

addUrl({ loc: 'https://example.com/', changefreq: 'daily', priority: 1.0 })
const xml = await generate()
```

## API

### Interfaces

#### `XmlSitemapConfig`

Configuration options for the XML sitemap provider.

```typescript
interface XmlSitemapConfig {
  /** Whether to pretty-print the XML output with indentation. Defaults to `false`. */
  pretty?: boolean

  /** XML stylesheet URL to include in sitemap output (for browser rendering). */
  xslUrl?: string
}
```

### Functions

#### `createProvider(config)`

Creates an XML sitemap provider.

```typescript
function createProvider(config?: XmlSitemapConfig): SitemapProvider
```

- `config` — Provider configuration.

**Returns:** A `SitemapProvider` backed by XML generation.

#### `escapeXml(str)`

Escapes special XML characters in a string.

```typescript
function escapeXml(str: string): string
```

- `str` — The string to escape.

**Returns:** The XML-safe string.

#### `joinLines(lines, indent, level)`

Joins non-empty lines, optionally with indentation.

```typescript
function joinLines(lines: string[], indent: string, level: number): string
```

- `lines` — Array of XML line strings (empty strings are filtered out).
- `indent` — Indentation string per level.
- `level` — Current indentation level.

**Returns:** Joined string.

#### `toISODate(date)`

Formats a Date or ISO string to an ISO 8601 date string (W3C format).

```typescript
function toISODate(date: string | Date): string
```

- `date` — A Date object or ISO 8601 string.

**Returns:** An ISO 8601 date string.

#### `toRFC822(date)`

Formats a Date or ISO string to RFC 822 date string (for RSS).

```typescript
function toRFC822(date: string | Date): string
```

- `date` — A Date object or ISO 8601 string.

**Returns:** An RFC 822 date string.

#### `xmlElement(tag, content, attributes)`

Wraps content in an XML element. If content is `undefined` or empty, returns empty string.

```typescript
function xmlElement(tag: string, content?: string, attributes?: Record<string, string>): string
```

- `tag` — The element tag name.
- `content` — The element text content.
- `attributes` — Optional element attributes.

**Returns:** The XML element string, or empty string if no content.

#### `xmlSelfClosing(tag, attributes)`

Creates a self-closing XML element with attributes.

```typescript
function xmlSelfClosing(tag: string, attributes: Record<string, string>): string
```

- `tag` — The element tag name.
- `attributes` — Element attributes.

**Returns:** The self-closing XML element string.

### Constants

#### `provider`

The provider implementation with default configuration.

```typescript
const provider: SitemapProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-sitemap` ^1.0.0
