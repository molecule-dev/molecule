/**
 * React card-grid and bento-grid layouts.
 *
 * Exports:
 * - `<CardGrid>` — responsive grid with configurable column count.
 * - `<BentoGrid>` — col/row-span or named-areas layout for mixed-size cards.
 *
 * @example
 * ```tsx
 * import { CardGrid, BentoGrid } from '@molecule/app-card-grid-react'
 *
 * <CardGrid columns={3} gap="md">
 *   <ProductCard product={products[0]} />
 *   <ProductCard product={products[1]} />
 *   <ProductCard product={products[2]} />
 * </CardGrid>
 *
 * <BentoGrid
 *   items={[
 *     { id: 'hero', content: <HeroCard />, colSpan: 8, rowSpan: 2 },
 *     { id: 'stats', content: <StatsCard />, colSpan: 4 },
 *   ]}
 * />
 * ```
 *
 * @remarks
 * `<CardGrid>` collapses to one column on narrow viewports and grows to
 * `columns` (1–6) at the md+ breakpoint via the ClassMap grid. In
 * `<BentoGrid>`, span mode uses a `columns`-wide grid (default 12) with
 * per-item `colSpan`/`rowSpan`; passing `areas` switches to named
 * `grid-template-areas` — then every item must set a matching `area`
 * token or it falls out of the template.
 *
 * @module
 */

export * from './BentoGrid.js'
export * from './CardGrid.js'
