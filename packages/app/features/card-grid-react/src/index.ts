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
 * @module
 */

export * from './BentoGrid.js'
export * from './CardGrid.js'
