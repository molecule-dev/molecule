/**
 * Angular collapsible-section and show-more — the counterpart of
 * `@molecule/app-collapsible-section-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports:
 * - `<CollapsibleSection>` — expandable section with a clickable heading.
 * - `<ShowMore>` — "Show N more" / "Show less" toggle for long lists.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { CollapsibleSection, ShowMore } from '@molecule/app-collapsible-section-angular'
 *
 * @Component({
 *   selector: 'app-faq',
 *   standalone: true,
 *   imports: [CollapsibleSection, ShowMore],
 *   template: `
 *     <section mol-collapsible-section [title]="'Key concepts'" [defaultExpanded]="true">
 *       <p>Content revealed when expanded.</p>
 *     </section>
 *
 *     <div mol-show-more [initialCount]="3">
 *       @for (item of items; track item.id) {
 *         <div>{{ item.label }}</div>
 *       }
 *     </div>
 *   `,
 * })
 * export class Faq {
 *   readonly items = [
 *     { id: 'a1', label: 'What is Molecule?' },
 *     { id: 'a2', label: 'How do bonds work?' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * Node props are projected content: `[slot=title]`, `[slot=badge]` and
 * `[slot=actions]` fill the heading, and the element's other content is the
 * body (or, for `<ShowMore>`, the list items). The same values also work as
 * template refs on the `title` / `badge` / `actions` inputs.
 * `<CollapsibleSection>` is uncontrolled by default (`defaultExpanded`); pass
 * `expanded` to control it — then update it from `onExpandedChange`. The header
 * renders as a single `<button>`, so `[slot=actions]` content must NOT contain
 * buttons/links (nested interactive elements are invalid HTML).
 * `<ShowMore>`'s labels use the i18n keys `showMore.more` / `showMore.less`
 * with English `defaultValue`s; no companion locale bond ships these keys —
 * add them to your app's locale resources (or pass custom
 * `moreKey`/`lessKey`). A projected list has no `length`, so `<ShowMore>`
 * measures the projected nodes to decide which ones to hide — project the
 * items themselves, not a wrapper around them.
 *
 * @module
 */

export * from './collapsible-section.component.js'
export * from './show-more.component.js'
export * from './types.js'
