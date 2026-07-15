# @molecule/api-resource-wiki-page

`@molecule/api-resource-wiki-page` — wiki/docs page CRUD with slug,
nested parents (breadcrumbs), space-scoped permissions, and optional
search-bond indexing.

Extracted from the wiki flagship.

## Quick Start

```ts
import { createWikiPageRouter } from '@molecule/api-resource-wiki-page'
app.use('/pages', createWikiPageRouter())
```

```ts
import { createPage, getBreadcrumbs } from '@molecule/api-resource-wiki-page'
const page = await createPage({
  space_id: spaceId,
  slug: 'getting-started',
  title: 'Getting started',
  body: '# Welcome',
})
const crumbs = await getBreadcrumbs(page.id)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-wiki-page @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation @molecule/api-search express zod
npm install -D @types/express
```

## API

### Interfaces

#### `WikiPageBreadcrumb`

Breadcrumb entry used when rendering a wiki page's ancestor trail.

```typescript
interface WikiPageBreadcrumb {
  id: string
  slug: string
  title: string
}
```

#### `WikiPageRow`

Database row shape for a wiki page record.

```typescript
interface WikiPageRow {
  id: string
  space_id: string
  parent_id: string | null
  slug: string
  title: string
  body: string
  position: number
  is_published: boolean
  created_at: string | Date
  updated_at: string | Date
}
```

#### `WikiSpaceRow`

Database row shape for a wiki space record.

```typescript
interface WikiSpaceRow {
  id: string
  owner_id: string
  is_public?: boolean
  visibility?: string
}
```

### Functions

#### `countPagesInSpace(spaceId)`

Count total pages belonging to a given space.

```typescript
function countPagesInSpace(spaceId: string): Promise<number>
```

#### `createPage(data)`

Create a new wiki page and trigger search indexing.

```typescript
function createPage(data: { space_id: string; parent_id?: string | null; slug: string; title: string; body?: string; position?: number; is_published?: boolean; }): Promise<WikiPageRow>
```

#### `createWikiPageRouter()`

Creates and returns the Express router with all wiki-page CRUD routes.

```typescript
function createWikiPageRouter(): Router
```

#### `deletePage(pageId)`

Recursively delete a wiki page and all its children.

```typescript
function deletePage(pageId: string): Promise<boolean>
```

#### `getAccessibleSpace(spaceId, userId)`

Resolve a space row + verify the user has access.

```typescript
function getAccessibleSpace(spaceId: string, userId: string): Promise<WikiSpaceRow | null>
```

#### `getBreadcrumbs(pageId, maxDepth?)`

Walk parent chain to build breadcrumbs (root → page).

```typescript
function getBreadcrumbs(pageId: string, maxDepth?: number): Promise<WikiPageBreadcrumb[]>
```

#### `getPageById(pageId)`

Fetch a single wiki page by its primary-key ID.

```typescript
function getPageById(pageId: string): Promise<WikiPageRow | null>
```

#### `getPageBySlug(spaceId, slug)`

Fetch a single wiki page by its space and URL slug.

```typescript
function getPageBySlug(spaceId: string, slug: string): Promise<WikiPageRow | null>
```

#### `listPagesInSpace(spaceId, opts?)`

List pages in a space, optionally filtered by parent and publish status.

```typescript
function listPagesInSpace(spaceId: string, opts?: { parent_id?: string | null; is_published?: boolean; }): Promise<WikiPageRow[]>
```

#### `slugify(input)`

Converts an arbitrary string into a URL-safe lowercase slug.

```typescript
function slugify(input: string): string
```

#### `updatePage(pageId, patch)`

Apply a partial patch to a wiki page and re-index it in search.

```typescript
function updatePage(pageId: string, patch: Partial<WikiPageRow>): Promise<WikiPageRow | null>
```

### Constants

#### `slugRegex`

Regex that matches a valid wiki-page slug: lowercase alphanumeric with interior hyphens.

```typescript
const slugRegex: RegExp
```

#### `wikiPageCreateSchema`

Zod schema for validating wiki-page creation payloads.

```typescript
const wikiPageCreateSchema: z.ZodObject<{ space_id: z.ZodString; parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; slug: z.ZodOptional<z.ZodString>; title: z.ZodString; body: z.ZodOptional<z.ZodString>; position: z.ZodOptional<z.ZodNumber>; is_published: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `wikiPageQuerySchema`

Zod schema for validating wiki-page list/query parameters.

```typescript
const wikiPageQuerySchema: z.ZodObject<{ space_id: z.ZodOptional<z.ZodString>; parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; is_published: z.ZodOptional<z.ZodCoercedBoolean<unknown>>; q: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `wikiPageUpdateSchema`

Zod schema for validating wiki-page update payloads.

```typescript
const wikiPageUpdateSchema: z.ZodObject<{ parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; slug: z.ZodOptional<z.ZodString>; title: z.ZodOptional<z.ZodString>; body: z.ZodOptional<z.ZodString>; position: z.ZodOptional<z.ZodNumber>; is_published: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `@molecule/api-search` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `@molecule/api-search`
- `express`
- `zod`

Run `src/__setup__/wiki_pages.sql` once (creates both `wiki_spaces`
and `wiki_pages` tables). If a search provider is bonded via
`@molecule/api-search`, page creates and updates index the content
automatically.
