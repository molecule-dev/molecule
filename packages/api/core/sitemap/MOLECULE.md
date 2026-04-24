# @molecule/api-sitemap

Provider-agnostic sitemap, RSS, and Atom feed generation interface for molecule.dev.

Defines the `SitemapProvider` interface for generating XML sitemaps, sitemap
indexes, RSS 2.0 feeds, and Atom feeds. Bond packages provide concrete
implementations. Application code uses the convenience functions (`addUrl`,
`generate`, `generateIndex`, `rss`, `atom`) which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, addUrl, generate, rss } from '@molecule/api-sitemap'
import { provider as xml } from '@molecule/api-sitemap-xml'

setProvider(xml)

addUrl({ loc: 'https://example.com/', changefreq: 'daily', priority: 1.0 })
addUrl({ loc: 'https://example.com/about', changefreq: 'monthly' })
const sitemap = await generate()

const feed = await rss({
  title: 'My Blog',
  description: 'Latest posts',
  link: 'https://example.com',
  items: [{ title: 'Hello', description: 'First post', link: 'https://example.com/hello' }],
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-sitemap
```

## API

### Interfaces

#### `AtomAuthor`

An author in an Atom feed.

```typescript
interface AtomAuthor {
  /** Author name. */
  name: string

  /** Author email. */
  email?: string

  /** Author website URL. */
  uri?: string
}
```

#### `AtomEntry`

An entry in an Atom feed.

```typescript
interface AtomEntry {
  /** Entry title. */
  title: string

  /** Entry permalink URL. */
  link: string

  /** Entry unique identifier. Defaults to `link`. */
  id?: string

  /** Last update date (ISO 8601 string or Date). */
  updated?: string | Date

  /** Entry summary. */
  summary?: string

  /** Full entry content (HTML). */
  content?: string

  /** Entry author (overrides feed-level author). */
  author?: AtomAuthor

  /** Entry categories. */
  categories?: string[]
}
```

#### `AtomFeed`

An Atom feed definition.

```typescript
interface AtomFeed {
  /** Feed title. */
  title: string

  /** Feed subtitle/description. */
  subtitle?: string

  /** Feed link (the website URL). */
  link: string

  /** Feed unique identifier (usually the feed URL). */
  id: string

  /** Last update date (ISO 8601 string or Date). */
  updated?: string | Date

  /** Feed author. */
  author?: AtomAuthor

  /** Feed entries. */
  entries: AtomEntry[]
}
```

#### `RSSFeed`

An RSS feed definition.

```typescript
interface RSSFeed {
  /** Feed title. */
  title: string

  /** Feed description. */
  description: string

  /** Feed link (the website URL). */
  link: string

  /** BCP 47 language code (e.g., `'en-us'`). */
  language?: string

  /** Feed items. */
  items: RSSItem[]
}
```

#### `RSSItem`

An item in an RSS feed.

```typescript
interface RSSItem {
  /** Item title. */
  title: string

  /** Item description or content. */
  description: string

  /** Item permalink URL. */
  link: string

  /** Publication date (ISO 8601 string or Date). */
  pubDate?: string | Date

  /** Globally unique identifier. Defaults to `link`. */
  guid?: string

  /** Item author email or name. */
  author?: string

  /** Item categories. */
  categories?: string[]
}
```

#### `SitemapAlternate`

An alternate language version of a sitemap URL.

```typescript
interface SitemapAlternate {
  /** BCP 47 language-region code (e.g., `'en-US'`, `'fr'`). */
  hreflang: string

  /** The alternate URL. */
  href: string
}
```

#### `SitemapConfig`

Configuration options for sitemap providers.

```typescript
interface SitemapConfig {
  /** Base URL for the site (used to resolve relative URLs). */
  baseUrl?: string

  /** Whether to pretty-print the XML output. Defaults to `false`. */
  pretty?: boolean
}
```

#### `SitemapImage`

An image associated with a sitemap URL.

```typescript
interface SitemapImage {
  /** The image URL. */
  loc: string

  /** Image caption. */
  caption?: string

  /** Image title. */
  title?: string
}
```

#### `SitemapProvider`

Sitemap provider interface.

All sitemap providers must implement this interface. Bond packages
provide concrete implementations for generating XML sitemaps, RSS feeds,
and Atom feeds.

```typescript
interface SitemapProvider {
  /**
   * Adds a URL entry to the sitemap. URLs are accumulated until `generate()` is called.
   *
   * @param url - The URL entry to add.
   */
  addUrl(url: SitemapUrl): void

  /**
   * Generates an XML sitemap string from all added URLs.
   * Resets the internal URL list after generation.
   *
   * @returns The XML sitemap string.
   */
  generate(): Promise<string>

  /**
   * Generates a sitemap index XML string that references multiple sitemap URLs.
   *
   * @param sitemaps - An array of sitemap URLs to include in the index.
   * @returns The XML sitemap index string.
   */
  generateIndex(sitemaps: string[]): Promise<string>

  /**
   * Generates an RSS 2.0 feed XML string.
   *
   * @param feed - The RSS feed definition.
   * @returns The RSS XML string.
   */
  rss(feed: RSSFeed): Promise<string>

  /**
   * Generates an Atom feed XML string.
   *
   * @param feed - The Atom feed definition.
   * @returns The Atom XML string.
   */
  atom(feed: AtomFeed): Promise<string>
}
```

#### `SitemapUrl`

A URL entry in a sitemap.

```typescript
interface SitemapUrl {
  /** The page URL (absolute). */
  loc: string

  /** Last modification date (ISO 8601 string or Date). */
  lastmod?: string | Date

  /** How frequently the page is likely to change. */
  changefreq?: ChangeFrequency

  /** Priority of this URL relative to other URLs on the site. `0.0` to `1.0`. Defaults to `0.5`. */
  priority?: number

  /** Alternate language versions of this page. */
  alternates?: SitemapAlternate[]

  /** Image entries associated with this URL. */
  images?: SitemapImage[]
}
```

### Types

#### `ChangeFrequency`

Change frequency hint for search engines.

```typescript
type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'
```

### Functions

#### `addUrl(url)`

Adds a URL entry to the sitemap.

```typescript
function addUrl(url: SitemapUrl): void
```

- `url` — The URL entry to add.

#### `atom(feed)`

Generates an Atom feed XML string.

```typescript
function atom(feed: AtomFeed): Promise<string>
```

- `feed` — The Atom feed definition.

**Returns:** The Atom XML string.

#### `generate()`

Generates an XML sitemap string from all added URLs.

```typescript
function generate(): Promise<string>
```

**Returns:** The XML sitemap string.

#### `generateIndex(sitemaps)`

Generates a sitemap index XML string that references multiple sitemap URLs.

```typescript
function generateIndex(sitemaps: string[]): Promise<string>
```

- `sitemaps` — An array of sitemap URLs to include in the index.

**Returns:** The XML sitemap index string.

#### `getProvider()`

Retrieves the bonded sitemap provider, throwing if none is configured.

```typescript
function getProvider(): SitemapProvider
```

**Returns:** The bonded sitemap provider.

#### `hasProvider()`

Checks whether a sitemap provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a sitemap provider is bonded.

#### `rss(feed)`

Generates an RSS 2.0 feed XML string.

```typescript
function rss(feed: RSSFeed): Promise<string>
```

- `feed` — The RSS feed definition.

**Returns:** The RSS XML string.

#### `setProvider(provider)`

Registers a sitemap provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: SitemapProvider): void
```

- `provider` — The sitemap provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
