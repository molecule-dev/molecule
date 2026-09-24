/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, with the real Tailwind ClassMap.
 *
 * @module
 */
import type { JSX } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BentoGrid, CardGrid } from '../index.js'

setClassMap(classMap)

const products = [
  { id: 'mug', name: 'Enamel Mug', price: '$18' },
  { id: 'tote', name: 'Canvas Tote', price: '$24' },
  { id: 'cap', name: 'Wool Cap', price: '$32' },
]

/**
 * The README example, verbatim.
 *
 * @returns The shop home layout.
 */
function ShopHome(): JSX.Element {
  return (
    <main>
      <BentoGrid
        items={[
          { id: 'hero', content: <h2>Spring collection</h2>, colSpan: 8, rowSpan: 2 },
          { id: 'sale', content: <p>20% off accessories</p>, colSpan: 4 },
          { id: 'news', content: <p>New arrivals weekly</p>, colSpan: 4 },
        ]}
      />
      <CardGrid columns={3} gap="md">
        {products.map((p) => (
          <article key={p.id}>
            <h3>{p.name}</h3>
            <p>{p.price}</p>
          </article>
        ))}
      </CardGrid>
    </main>
  )
}

describe('README @example', () => {
  it('renders the bento spans and a responsive 3-column product grid', () => {
    const html = renderToStaticMarkup(<ShopHome />)
    expect(html).toContain('grid-template-columns:repeat(12, minmax(0, 1fr))')
    expect(html).toContain('grid-column:span 8;grid-row:span 2')
    expect(html.match(/grid-column:span 4;grid-row:span 1/g)).toHaveLength(2)
    expect(html).toContain('<h2>Spring collection</h2>')

    expect(html.match(/<article>/g)).toHaveLength(3)
    expect(html).toContain('<h3>Canvas Tote</h3><p>$24</p>')
    // The column count flows through the ClassMap's (responsive) grid resolver.
    expect(html).toContain(`class="${classMap.cn(classMap.grid({ cols: 3, gap: 'md' }))}"`)
  })
})
