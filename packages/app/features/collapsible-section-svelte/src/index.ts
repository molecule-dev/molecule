/**
 * Svelte collapsible-section and show-more.
 *
 * Exports:
 * - `<CollapsibleSection>` — expandable section with a clickable heading.
 * - `<ShowMore>` — "Show N more" / "Show less" toggle for long lists.
 *
 * It is the Svelte counterpart of `@molecule/app-collapsible-section-react`:
 * the same props (React names), the same ClassMap tokens, the same i18n keys,
 * and the same DOM for the same input. Node props are snippets (or plain
 * strings).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { CollapsibleSection, ShowMore } from '@molecule/app-collapsible-section-svelte'
 * </script>
 *
 * <CollapsibleSection title="Key concepts" defaultExpanded={true}>
 *   <p>Content revealed when expanded.</p>
 * </CollapsibleSection>
 *
 * <ShowMore items={items} initialCount={3}>
 *   {#snippet children(item)}<div>{item.label}</div>{/snippet}
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
 * A snippet has no length, so `<ShowMore>` takes the list as data (`items`)
 * and renders each entry through its `children` snippet; the initial slice is
 * `items.slice(0, initialCount)`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
