// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TickerRow } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered watchlist.
 */
function Watchlist(): React.JSX.Element {
  const quotes = [
    {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 67420.5,
      changePct: 2.34,
      marketCap: 1.33e12,
    },
    {
      id: 'eth',
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3512.1,
      changePct: -1.08,
      marketCap: 4.2e11,
    },
  ]
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  const compact = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <section>
      {quotes.map((q) => (
        <TickerRow
          key={q.id}
          symbol={q.symbol}
          name={q.name}
          price={usd.format(q.price)}
          changePct={q.changePct}
          meta={compact.format(q.marketCap)}
          onClick={() => setSelectedId(q.id)}
        />
      ))}
      {selectedId && <p>Selected: {selectedId}</p>}
    </section>
  )
}

let root: Root | undefined
let container: HTMLElement

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
  })

  it('renders formatted prices, signed change arrows and reports clicks', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<Watchlist />))

    const text = container.textContent ?? ''
    expect(text).toContain('BTCBitcoin')
    expect(text).toContain('$67,420.50')
    expect(text).toContain('▲ 2.34%')
    expect(text).toContain('$1.3T')
    expect(text).toContain('$3,512.10')
    expect(text).toContain('▼ -1.08%')
    expect(text).toContain('$420B')

    const rows = container.querySelectorAll<HTMLElement>('section > div')
    expect(rows).toHaveLength(2)
    act(() => rows[1]?.click())
    expect(container.querySelector('p')?.textContent).toBe('Selected: eth')
  })
})
