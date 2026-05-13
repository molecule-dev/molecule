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
npm install @molecule/api-resource-wiki-page
```

## API

### Interfaces

#### `WikiPageBreadcrumb`

```typescript
interface WikiPageBreadcrumb {
  id: string
  slug: string
  title: string
}
```

#### `WikiPageRow`

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

```typescript
function countPagesInSpace(spaceId: string): Promise<number>
```

#### `createPage(data)`

```typescript
function createPage(data: { space_id: string; parent_id?: string | null; slug: string; title: string; body?: string; position?: number; is_published?: boolean; }): Promise<WikiPageRow>
```

#### `createWikiPageRouter()`

```typescript
function createWikiPageRouter(): Router
```

#### `deletePage(pageId)`

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

```typescript
function getPageById(pageId: string): Promise<WikiPageRow | null>
```

#### `getPageBySlug(spaceId, slug)`

```typescript
function getPageBySlug(spaceId: string, slug: string): Promise<WikiPageRow | null>
```

#### `listPagesInSpace(spaceId, opts?)`

```typescript
function listPagesInSpace(spaceId: string, opts?: { parent_id?: string | null; is_published?: boolean; }): Promise<WikiPageRow[]>
```

#### `slugify(input)`

```typescript
function slugify(input: string): string
```

#### `updatePage(pageId, patch)`

```typescript
function updatePage(pageId: string, patch: Partial<WikiPageRow>): Promise<WikiPageRow | null>
```

### Constants

#### `slugRegex`

```typescript
const slugRegex: RegExp
```

#### `wikiPageCreateSchema`

```typescript
const wikiPageCreateSchema: z.ZodObject<{ space_id: z.ZodString; parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; slug: z.ZodOptional<z.ZodString>; title: z.ZodString; body: z.ZodOptional<z.ZodString>; position: z.ZodOptional<z.ZodNumber>; is_published: z.ZodOptional<z.ZodBoolean>; }, "strip", z.ZodTypeAny, { space_id: string; title: string; parent_id?: string | null | undefined; slug?: string | undefined; body?: string | undefined; position?: number | undefined; is_published?: boolean | undefined; }, { space_id: string; title: string; parent_id?: string | null | undefined; slug?: string | undefined; body?: string | undefined; position?: number | undefined; is_published?: boolean | undefined; }>
```

#### `wikiPageQuerySchema`

```typescript
const wikiPageQuerySchema: z.ZodObject<{ space_id: z.ZodOptional<z.ZodString>; parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; is_published: z.ZodOptional<z.ZodBoolean>; q: z.ZodOptional<z.ZodString>; }, "strip", z.ZodTypeAny, { space_id?: string | undefined; parent_id?: string | null | undefined; is_published?: boolean | undefined; q?: string | undefined; }, { space_id?: string | undefined; parent_id?: string | null | undefined; is_published?: boolean | undefined; q?: string | undefined; }>
```

#### `wikiPageUpdateSchema`

```typescript
const wikiPageUpdateSchema: z.ZodObject<{ parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; slug: z.ZodOptional<z.ZodString>; title: z.ZodOptional<z.ZodString>; body: z.ZodOptional<z.ZodString>; position: z.ZodOptional<z.ZodNumber>; is_published: z.ZodOptional<z.ZodBoolean>; }, "strip", z.ZodTypeAny, { parent_id?: string | null | undefined; slug?: string | undefined; title?: string | undefined; body?: string | undefined; position?: number | undefined; is_published?: boolean | undefined; }, { parent_id?: string | null | undefined; slug?: string | undefined; title?: string | undefined; body?: string | undefined; position?: number | undefined; is_published?: boolean | undefined; }>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

Run `src/__setup__/wiki_pages.sql` once (creates both `wiki_spaces`
and `wiki_pages` tables). If a search provider is bonded via
`@molecule/api-search`, page creates and updates index the content
automatically.
