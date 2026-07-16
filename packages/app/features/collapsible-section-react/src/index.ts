/**
 * React collapsible-section and show-more.
 *
 * Exports:
 * - `<CollapsibleSection>` — expandable section with clickable heading.
 * - `<ShowMore>` — "Show N more" / "Show less" toggle for long lists.
 *
 * @example
 * ```tsx
 * import { CollapsibleSection, ShowMore } from '@molecule/app-collapsible-section-react'
 *
 * <CollapsibleSection title="Key concepts" defaultExpanded={true}>
 *   <p>Content revealed when expanded.</p>
 * </CollapsibleSection>
 *
 * <ShowMore initialCount={3}>
 *   {items.map((item) => <div key={item.id}>{item.label}</div>)}
 * </ShowMore>
 * ```
 *
 * @remarks
 * `<CollapsibleSection>` is uncontrolled by default (`defaultExpanded`);
 * passing `expanded` makes it fully controlled — then you must update it from
 * `onExpandedChange`. The header renders as a single `<button>`, so anything
 * passed to `actions` must NOT contain buttons/links (nested interactive
 * elements are invalid HTML) — put row actions outside the section instead.
 * `<ShowMore>`'s labels use the i18n keys `showMore.more` / `showMore.less`
 * with English `defaultValue`s; no companion locale bond ships these keys —
 * add them to your app's locale resources (or pass custom `moreKey`/`lessKey`).
 *
 * @module
 */

export * from './CollapsibleSection.js'
