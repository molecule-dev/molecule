/**
 * Wiki / docs page header — the Vue counterpart of
 * `@molecule/app-wiki-page-header-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports `<WikiPageHeader>` — breadcrumb + title + meta row (version,
 * updated time/by, tags) + Edit/History action buttons.
 *
 * @example
 * ```ts
 * import { h } from 'vue'
 * import { WikiPageHeader } from '@molecule/app-wiki-page-header-vue'
 *
 * h(WikiPageHeader, {
 *   title: 'Getting Started',
 *   breadcrumb: () => [h('span', 'Docs / Guides')],
 *   version: 'v3',
 *   updatedAt: '2 days ago',
 *   updatedBy: 'Alice',
 *   tags: () => [h('span', 'guide'), h('span', 'setup')],
 *   onEdit: () => console.log('edit'),
 *   onHistory: () => console.log('history'),
 * })
 * ```
 *
 * @remarks
 * The Edit / History buttons render only when `onEdit` / `onHistory` are
 * provided. Their labels and the 'Updated' meta prefix go through
 * `t('wiki.edit')` / `t('wiki.history')` / `t('wiki.updatedAt')` with
 * English fallbacks — translations live in
 * `@molecule/app-locales-wiki-page-header`, which exists on disk but is not
 * yet registered in mlcl's registry; register it or add the keys to app
 * translations. Everything else (breadcrumb, version, updatedAt/By, tags,
 * extraActions) is a pre-formatted node slot — pass it as a prop or as the
 * same-named Vue slot (the prop wins when both are given). Props (documented
 * on the exported `WikiPageHeaderProps` interface): title, breadcrumb,
 * version, updatedAt, updatedBy, tags, onEdit, onHistory, extraActions,
 * className.
 *
 * @module
 */

export * from './types.js'
export * from './WikiPageHeader.js'
