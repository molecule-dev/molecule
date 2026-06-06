/**
 * Wiki / docs page header.
 *
 * Exports `<WikiPageHeader>`.
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
 *   onEdit={() => navigate('/edit')}
 *   onHistory={() => navigate('/history')}
 * />
 * ```
 *
 * @module
 */

export * from './WikiPageHeader.js'
