/**
 * Wiki / docs page header — the Angular counterpart of
 * `@molecule/app-wiki-page-header-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports `<WikiPageHeader>` — breadcrumb + title + meta row (version,
 * updated time/by, tags) + Edit/History action buttons.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { WikiPageHeader } from '@molecule/app-wiki-page-header-angular'
 *
 * @Component({
 *   selector: 'app-wiki-page',
 *   standalone: true,
 *   imports: [WikiPageHeader],
 *   template: `
 *     <header
 *       mol-wiki-page-header
 *       title="Getting Started"
 *       version="v3"
 *       updatedAt="2 days ago"
 *       updatedBy="Alice"
 *       [onEdit]="handleEdit"
 *       [onHistory]="handleHistory"
 *     >
 *       <span slot="breadcrumb">Docs / Guides</span>
 *       <span slot="tags">guide</span>
 *       <span slot="tags">setup</span>
 *     </header>
 *   `,
 * })
 * export class WikiPage {
 *   handleEdit = (): void => console.log('edit')
 *   handleHistory = (): void => console.log('history')
 * }
 * ```
 *
 * @remarks
 * The Edit / History buttons render only when the `onEdit` / `onHistory`
 * function inputs are set. Their labels and the 'Updated' meta prefix go
 * through `t('wiki.edit')` / `t('wiki.history')` / `t('wiki.updatedAt')`
 * with English fallbacks — translations live in
 * `@molecule/app-locales-wiki-page-header`, which exists on disk but is not
 * yet registered in mlcl's registry; register it or add the keys to app
 * translations. Node props are projected content: `title`, `breadcrumb`,
 * `version`, `updatedAt`, `updatedBy`, `tags` and `extraActions` are
 * selected by `[slot=<name>]`; plain strings may also be passed as inputs.
 * Props (documented on the exported `WikiPageHeaderProps` interface): title,
 * breadcrumb, version, updatedAt, updatedBy, tags, onEdit, onHistory,
 * extraActions, className.
 *
 * @module
 */

export * from './types.js'
export * from './wiki-page-header.component.js'
