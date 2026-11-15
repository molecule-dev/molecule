/**
 * Svelte card-grid and bento-grid layouts.
 *
 * Exports:
 * - `CardGrid` — responsive grid with configurable column count.
 * - `BentoGrid` — col/row-span or named-areas layout for mixed-size cards.
 *
 * This is the Svelte counterpart of `@molecule/app-card-grid-react`: the same
 * exports, the same props (React names), and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { BentoGrid, CardGrid } from '@molecule/app-card-grid-svelte'
 *
 *   const items = [
 *     { id: 'hero', content: hero, colSpan: 8, rowSpan: 2 },
 *     { id: 'stats', content: stats, colSpan: 4 },
 *   ]
 * </script>
 *
 * <CardGrid columns={3} gap="md">
 *   <ProductCard product={products[0]} />
 *   <ProductCard product={products[1]} />
 *   <ProductCard product={products[2]} />
 * </CardGrid>
 *
 * <BentoGrid {items} />
 * ```
 *
 * @remarks
 * `CardGrid` collapses to one column on narrow viewports and grows to
 * `columns` (1–6) at the md+ breakpoint via the ClassMap grid. In
 * `BentoGrid`, span mode uses a `columns`-wide grid (default 12) with
 * per-item `colSpan`/`rowSpan`; passing `areas` switches to named
 * `grid-template-areas` — then every item must set a matching `area`
 * token or it falls out of the template. Node values are snippets: a
 * `BentoItem.content` (and `CardGrid`'s children) is a `Snippet` or text.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
