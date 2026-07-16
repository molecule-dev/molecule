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
 * Access is space-scoped through `getAccessibleSpace`: a caller may READ a page
 * when they OWN its `wiki_spaces` row or the space is `is_public`. WRITES
 * (create/update/delete) are OWNER-ONLY — the write handlers additionally
 * require `space.owner_id === userId`, so a non-owner's write is refused (404)
 * even in a public space. If you need collaborative editing across a space,
 * wrap the router with your own role gate.
 * This package ships no space CRUD: create/seed the `wiki_spaces` row yourself
 * before creating pages. `DELETE /:id` is recursive (children first). If a
 * search provider is bonded via `@molecule/api-search`, creates and updates
 * index content automatically.
 *
 * Tables: `src/__setup__/wiki_pages.sql` creates `wiki_spaces` and
 * `wiki_pages`. An mlcl-scaffolded API replays `__setup__/*.sql` automatically
 * on migrate; anywhere else run it once — nothing at runtime creates them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual wiki/docs screens/flows, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip. Reality check on versioning: this resource stores ONE current body per
 * page (`updatePage` is an in-place `updateById`) — there is NO built-in
 * revision history, revert, or diff, and no per-page author column (only
 * `created_at`/`updated_at`). So verify edits persist, and confirm the app does
 * NOT present a "version history / restore / last edited by" UI it cannot back
 * (that needs the app's own versions table — this resource will not supply it):
 * - [ ] Creating a page persists title + slug + body and renders: submit them
 *   in the editor → it returns (201) and reopening the page shows the title and
 *   body. An omitted slug is derived from the title (slugify); the (space, slug)
 *   pair is unique, so a duplicate slug in the same space is rejected rather
 *   than silently overwriting the existing page.
 * - [ ] Editing the body persists in place and re-renders: change the body →
 *   save → reopen/reload shows the new text. Because nothing records the prior
 *   version, the old text is GONE — a "restore previous revision" control that
 *   does nothing (or 404s) is the bug, not an acceptable no-op.
 * - [ ] Hierarchy renders and stays consistent: a page created with a
 *   `parent_id` nests under its parent in the tree, and its breadcrumbs
 *   (GET /:id/breadcrumbs) list the full root → page trail in order; deleting a
 *   parent recursively removes its children (they vanish), never orphaning them.
 * - [ ] Draft vs published is honored: an unpublished page (is_published=false)
 *   is excluded when the list is filtered to published pages and appears once
 *   published — the reader-facing view never shows a draft it filtered out.
 * - [ ] Authorization — reads are space-scoped, writes are owner-only: a private
 *   space's pages are NOT readable by a non-owner (GET /:id → 404, existence not
 *   leaked); a public space's pages are readable by any signed-in user, yet a
 *   NON-owner's create/edit/delete is still refused (404) and nothing changes —
 *   a read-only viewer cannot mutate. Logged out, every route is refused (401).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
