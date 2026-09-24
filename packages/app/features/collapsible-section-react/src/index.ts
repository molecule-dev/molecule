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
 * export function LessonSidebar() {
 *   const concepts = [
 *     { id: 'props', label: 'Props' },
 *     { id: 'state', label: 'State' },
 *     { id: 'effects', label: 'Effects' },
 *     { id: 'context', label: 'Context' },
 *     { id: 'refs', label: 'Refs' },
 *   ]
 *   return (
 *     <CollapsibleSection title="Key concepts" badge={<span>{concepts.length}</span>} defaultExpanded>
 *       <ShowMore initialCount={3}>
 *         {concepts.map((c) => (
 *           <div key={c.id}>{c.label}</div>
 *         ))}
 *       </ShowMore>
 *     </CollapsibleSection>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `<CollapsibleSection>` starts COLLAPSED (`defaultExpanded` defaults to `false`) and
 *   unmounts its body while collapsed. Passing `expanded` makes it fully controlled — then you
 *   must update it from `onExpandedChange`, or clicks do nothing.
 * - The header renders as a single `<button>` inside an `<h3>` (change with `level`), so
 *   anything passed to `actions` must NOT contain buttons/links (nested interactive elements are
 *   invalid HTML) — put row actions outside the section instead.
 * - `<ShowMore>`'s `children` must be an ARRAY (e.g. from `.map`) — it slices it; items get no
 *   wrapper, so give each a `key`. The toggle only renders when there are more than
 *   `initialCount` (default 3) items.
 * - `<ShowMore>` calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`; both components call `getClassMap()`, which throws
 *   unless `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 * - `<ShowMore>`'s labels use the i18n keys `showMore.more` (receives `{{remaining}}`) /
 *   `showMore.less` with English `defaultValue`s; no companion locale bond ships these keys —
 *   add them to your app's locale resources (or pass custom `moreKey`/`lessKey`).
 *
 * @module
 */

export * from './CollapsibleSection.js'
