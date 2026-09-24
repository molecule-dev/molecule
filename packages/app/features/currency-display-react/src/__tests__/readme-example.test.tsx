/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CurrencyDisplay, formatCurrencyCompact } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered product price.
 */
function ProductPrice(): React.JSX.Element {
  const product = {
    priceCents: 2999,
    listPriceCents: 4999,
    currency: 'USD',
    revenueCents: 1234500,
  }
  return (
    <div>
      <CurrencyDisplay
        amount={product.priceCents / 100}
        originalAmount={product.listPriceCents / 100}
        currency={product.currency}
        locale="en-US"
        size="lg"
      />
      <small>{formatCurrencyCompact(product.revenueCents / 100, product.currency, 'en-US')}</small>
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the price, the struck-through original, a savings chip and a compact total', () => {
    const html = renderToStaticMarkup(<ProductPrice />)
    expect(html).toContain('>$29.99</span>')
    expect(html).toMatch(/text-decoration:line-through[^>]*>\$49.99<\/span>/)
    expect(html).toContain('>−40%</span>')
    expect(html).toContain('<small>$12.3K</small>')
  })
})
