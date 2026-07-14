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
 * Run `src/__setup__/wiki_pages.sql` once (creates both `wiki_spaces`
 * and `wiki_pages` tables). If a search provider is bonded via
 * `@molecule/api-search`, page creates and updates index the content
 * automatically.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
