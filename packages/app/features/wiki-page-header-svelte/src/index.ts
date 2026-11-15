/**
 * Wiki / docs page header — the Svelte counterpart of
 * `@molecule/app-wiki-page-header-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports `<WikiPageHeader>` — breadcrumb + title + meta row (version,
 * updated time/by, tags) + Edit/History action buttons.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { WikiPageHeader } from '@molecule/app-wiki-page-header-svelte'
 * </script>
 *
 * <WikiPageHeader
 *   title="Getting Started"
 *   version="v3"
 *   updatedAt="2 days ago"
 *   updatedBy="Alice"
 *   onEdit={() => console.log('edit')}
 *   onHistory={() => console.log('history')}
 * >
 *   {#snippet breadcrumb()}
 *     <span>Docs / Guides</span>
 *   {/snippet}
 *   {#snippet tags()}
 *     <span>guide</span>
 *     <span>setup</span>
 *   {/snippet}
 * </WikiPageHeader>
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
 * extraActions) is a snippet slot — pass it as a snippet prop, or as a plain
 * string. Props (documented on the exported `WikiPageHeaderProps`
 * interface): title, breadcrumb, version, updatedAt, updatedBy, tags,
 * onEdit, onHistory, extraActions, className.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
