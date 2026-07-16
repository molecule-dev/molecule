/**
 * `@molecule/api-resource-wiki-page` — wiki/docs page CRUD with slug,
 * nested parents (breadcrumbs), space-scoped permissions, and optional
 * search-bond indexing.
 *
 * Extracted from the wiki flagship.
 *
 * @example
 * ```ts
 * import { createWikiPageRouter } from '@molecule/api-resource-wiki-page'
 * app.use('/pages', createWikiPageRouter())
 * ```
 *
 * @example
 * ```ts
 * import { createPage, getBreadcrumbs } from '@molecule/api-resource-wiki-page'
 * const page = await createPage({
 *   space_id: spaceId,
 *   slug: 'getting-started',
 *   title: 'Getting started',
 *   body: '# Welcome',
 * })
 * const crumbs = await getBreadcrumbs(page.id)
 * ```
 *
 * @remarks
 * Session-auth prerequisite: every route reads the caller via
 * `requireUser(res)` (`res.locals.session.userId`, 401 fail-closed) — mount
 * `createWikiPageRouter()` behind your global auth middleware. There is no
 * `routes`/`requestHandlerMap` export; this package ships the Express router
 * factory shown above.
 *
 * Access is space-scoped through `getAccessibleSpace`: a caller may act on a
 * page when they OWN its `wiki_spaces` row or the space is `is_public`. Note
 * that a public space is writable by ANY authenticated user — keep spaces
 * private for owner-only editing, or wrap the router with your own role gate.
 * This package ships no space CRUD: create/seed the `wiki_spaces` row yourself
 * before creating pages. `DELETE /:id` is recursive (children first). If a
 * search provider is bonded via `@molecule/api-search`, creates and updates
 * index content automatically.
 *
 * Tables: `src/__setup__/wiki_pages.sql` creates `wiki_spaces` and
 * `wiki_pages`. An mlcl-scaffolded API replays `__setup__/*.sql` automatically
 * on migrate; anywhere else run it once — nothing at runtime creates them.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
