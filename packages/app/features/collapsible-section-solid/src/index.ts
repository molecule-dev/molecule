/**
 * Solid collapsible-section and show-more.
 *
 * Exports:
 * - `<CollapsibleSection>` — expandable section with a clickable heading.
 * - `<ShowMore>` — "Show N more" / "Show less" toggle for long lists.
 *
 * It is the Solid counterpart of `@molecule/app-collapsible-section-react`:
 * the same props (React names), the same ClassMap tokens, the same i18n keys,
 * and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { render } from 'solid-js/web'
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { CollapsibleSection, ShowMore } from '@molecule/app-collapsible-section-solid'
 *
 * render(
 *   () => (
 *     <MoleculeProvider config={{ i18n: i18nProvider }}>
 *       <CollapsibleSection title="Key concepts" defaultExpanded={true}>
 *         <p>Content revealed when expanded.</p>
 *       </CollapsibleSection>
 *
 *       <ShowMore initialCount={3}>
 *         {items.map((item) => <div>{item.label}</div>)}
 *       </ShowMore>
 *     </MoleculeProvider>
 *   ),
 *   document.getElementById('root')!,
 * )
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
 * add them to your app's locale resources (or pass custom
 * `moreKey`/`lessKey`).
 *
 * @module
 */

export * from './CollapsibleSection.jsx'
export * from './types.js'
