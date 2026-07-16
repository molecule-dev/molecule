/**
 * Wiki / docs page header.
 *
 * Exports `<WikiPageHeader>` — breadcrumb + title + meta row (version,
 * updated time/by, tags) + Edit/History action buttons.
 *
 * @example
 * ```tsx
 * import { WikiPageHeader } from '@molecule/app-wiki-page-header-react'
 *
 * <WikiPageHeader
 *   title="Getting Started"
 *   breadcrumb={<span>Docs / Guides</span>}
 *   version="v3"
 *   updatedAt="2 days ago"
 *   updatedBy="Alice"
 *   tags={<><span>guide</span><span>setup</span></>}
 *   onEdit={() => console.log('edit')}
 *   onHistory={() => console.log('history')}
 * />
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
 * extraActions) is a pre-formatted ReactNode slot. Props (documented on
 * the exported `WikiPageHeaderProps` interface): title, breadcrumb,
 * version, updatedAt, updatedBy, tags, onEdit, onHistory, extraActions,
 * className.
 *
 * @module
 */

export * from './WikiPageHeader.js'
