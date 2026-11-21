/**
 * Angular card container for cross-linked / related item lists — the
 * counterpart of `@molecule/app-related-items-card-react`: the same props and
 * the same DOM for the same input.
 *
 * Exports `<RelatedItemsCard>` — a titled Card with header + list + empty
 * state + "View all" link, styled through the ClassMap bond. Use for
 * "Company → Deals", "Contact → Notes", "Ticket → Related Articles" panels.
 *
 * Node props are projected content: `icon` and `title` render inside the
 * header, `headerActions` inside the right-hand header row, and `emptyState`
 * in the list's place when `items` is empty. `renderItem` is a `TemplateRef`
 * whose context carries the item as `$implicit` (and `a0`) and the index as
 * `a1`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { RelatedItemsCard } from '@molecule/app-related-items-card-angular'
 *
 * interface Article {
 *   id: string
 *   title: string
 * }
 *
 * @Component({
 *   selector: 'app-related-articles',
 *   standalone: true,
 *   imports: [RelatedItemsCard],
 *   template: `
 *     <ng-template #row let-article>
 *       <span>{{ article.title }}</span>
 *     </ng-template>
 *     <div mol-related-items-card title="Related Articles" [items]="articles" [renderItem]="row"
 *          viewAllHref="/articles" [onItemClick]="open">
 *       <p slot="emptyState">No related articles yet.</p>
 *     </div>
 *   `,
 * })
 * export class RelatedArticles {
 *   articles: Article[] = []
 *
 *   open(article: Article): void {
 *     // navigate to the article…
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — call `setClassMap()` (e.g. with
 *   `@molecule/app-ui-tailwind`) at startup or rendering throws.
 * - The "View all" label is hardcoded English in the React reference (not
 *   routed through i18n) and is the same literal here; pass a translated link
 *   via `headerActions` in localized apps.
 * - `onItemClick` rows stay `<li>` list items: the card wraps each row's
 *   content in an inner `role="button"` control (focusable, Enter/Space
 *   activate it) so the click works from the keyboard too. A real
 *   `<button>`/`<a>` inside the item template still takes its own clicks and
 *   focus.
 * - `viewAllHref` renders a plain `<a href>` (full page load in SPA routers);
 *   use `headerActions` with your router's Link for client-side navigation.
 *
 * @module
 */

export * from './related-items-card.component.js'
export * from './types.js'
