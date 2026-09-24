/**
 * React card-grid and bento-grid layouts.
 *
 * Exports:
 * - `<CardGrid>` — responsive grid with configurable column count.
 * - `<BentoGrid>` — col/row-span or named-areas layout for mixed-size cards.
 *
 * @example
 * ```tsx
 * import { BentoGrid, CardGrid } from '@molecule/app-card-grid-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * setClassMap(classMap) // once, at startup
 *
 * const products = [
 *   { id: 'mug', name: 'Enamel Mug', price: '$18' },
 *   { id: 'tote', name: 'Canvas Tote', price: '$24' },
 *   { id: 'cap', name: 'Wool Cap', price: '$32' },
 * ]
 *
 * export function ShopHome() {
 *   return (
 *     <main>
 *       <BentoGrid
 *         items={[
 *           { id: 'hero', content: <h2>Spring collection</h2>, colSpan: 8, rowSpan: 2 },
 *           { id: 'sale', content: <p>20% off accessories</p>, colSpan: 4 },
 *           { id: 'news', content: <p>New arrivals weekly</p>, colSpan: 4 },
 *         ]}
 *       />
 *       <CardGrid columns={3} gap="md">
 *         {products.map((p) => (
 *           <article key={p.id}>
 *             <h3>{p.name}</h3>
 *             <p>{p.price}</p>
 *           </article>
 *         ))}
 *       </CardGrid>
 *     </main>
 *   )
 * }
 * ```
 *
 * @remarks
 * Both are layout-only: they render your children/`content` as given — no
 * card chrome, no data fetching, no empty state. Both call `getClassMap()`,
 * which throws until `setClassMap(...)` from `@molecule/app-ui` ran.
 *
 * `<CardGrid>` passes `columns` (1–6, default 3) to the ClassMap's
 * `grid({ cols })`, whose responsive ramp decides the breakpoints — with
 * `@molecule/app-ui-tailwind`, `columns={3}` is 1 column on phones, 2 at
 * `sm`, 3 at `lg`. `<BentoGrid>` is NOT responsive: span mode is an inline
 * `columns`-wide grid (default 12) at every width, with per-item `colSpan`
 * (default 4) / `rowSpan` (default 1); passing `areas` switches to named
 * `grid-template-areas` — then every item must set a matching `area`
 * token or it falls out of the template.
 *
 * @module
 */

export * from './BentoGrid.js'
export * from './CardGrid.js'
