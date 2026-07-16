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

Session-auth prerequisite: every route reads the caller via
`requireUser(res)` (`res.locals.session.userId`, 401 fail-closed) — mount
`createWikiPageRouter()` behind your global auth middleware. There is no
`routes`/`requestHandlerMap` export; this package ships the Express router
factory shown above.

Access is space-scoped through `getAccessibleSpace`: a caller may act on a
page when they OWN its `wiki_spaces` row or the space is `is_public`. Note
that a public space is writable by ANY authenticated user — keep spaces
private for owner-only editing, or wrap the router with your own role gate.
This package ships no space CRUD: create/seed the `wiki_spaces` row yourself
before creating pages. `DELETE /:id` is recursive (children first). If a
search provider is bonded via `@molecule/api-search`, creates and updates
index content automatically.

Tables: `src/__setup__/wiki_pages.sql` creates `wiki_spaces` and
`wiki_pages`. An mlcl-scaffolded API replays `__setup__/*.sql` automatically
on migrate; anywhere else run it once — nothing at runtime creates them.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual wiki/docs screens/flows, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip. Reality check on versioning: this resource stores ONE current body per
page (`updatePage` is an in-place `updateById`) — there is NO built-in
revision history, revert, or diff, and no per-page author column (only
`created_at`/`updated_at`). So verify edits persist, and confirm the app does
NOT present a "version history / restore / last edited by" UI it cannot back
(that needs the app's own versions table — this resource will not supply it):
- [ ] Creating a page persists title + slug + body and renders: submit them
  in the editor → it returns (201) and reopening the page shows the title and
  body. An omitted slug is derived from the title (slugify); the (space, slug)
  pair is unique, so a duplicate slug in the same space is rejected rather
  than silently overwriting the existing page.
- [ ] Editing the body persists in place and re-renders: change the body →
  save → reopen/reload shows the new text. Because nothing records the prior
  version, the old text is GONE — a "restore previous revision" control that
  does nothing (or 404s) is the bug, not an acceptable no-op.
- [ ] Hierarchy renders and stays consistent: a page created with a
  `parent_id` nests under its parent in the tree, and its breadcrumbs
  (GET /:id/breadcrumbs) list the full root → page trail in order; deleting a
  parent recursively removes its children (they vanish), never orphaning them.
- [ ] Draft vs published is honored: an unpublished page (is_published=false)
  is excluded when the list is filtered to published pages and appears once
  published — the reader-facing view never shows a draft it filtered out.
- [ ] Authorization — reads are space-scoped, writes are owner-only: a private
  space's pages are NOT readable by a non-owner (GET /:id → 404, existence not
  leaked); a public space's pages are readable by any signed-in user, yet a
  NON-owner's create/edit/delete is still refused (404) and nothing changes —
  a read-only viewer cannot mutate. Logged out, every route is refused (401).
