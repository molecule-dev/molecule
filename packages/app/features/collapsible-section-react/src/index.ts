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
 * @module
 */

export * from './CollapsibleSection.js'
