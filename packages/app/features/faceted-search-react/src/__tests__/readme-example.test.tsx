// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FacetedSearchBar, FilterPill, SegmentedControl } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered listings page.
 */
function ListingsPage(): React.JSX.Element {
  const [listingType, setListingType] = useState<'buy' | 'rent'>('buy')
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const contentTop = 64 + 64 // top nav + the filter bar, which is position: fixed and reserves no space
  return (
    <>
      <FacetedSearchBar topOffsetPx={64}>
        <SegmentedControl
          value={listingType}
          onChange={setListingType}
          options={[
            { value: 'buy', label: 'Buy' },
            { value: 'rent', label: 'Rent' },
          ]}
        />
        <FilterPill
          label={maxPrice ? `Under $${maxPrice}` : 'Price'}
          active={maxPrice !== null}
          dataMolId="filter-price"
        >
          <label>
            Max price
            <select
              value={maxPrice ?? ''}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Any</option>
              <option value="500000">$500000</option>
              <option value="1000000">$1000000</option>
            </select>
          </label>
        </FilterPill>
      </FacetedSearchBar>
      <main style={{ paddingTop: contentTop }}>
        <p>
          Showing {listingType} listings{maxPrice ? ` under $${maxPrice}` : ''}
        </p>
      </main>
    </>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('switches listing type and applies a price filter from the pill panel', () => {
    const view = render(<ListingsPage />)
    const bar = view.container.querySelector<HTMLElement>('[data-mol-id="filter-bar"]')
    expect(bar?.style.top).toBe('64px')
    const summary = (): string => view.getByRole('main').textContent ?? ''
    expect(summary()).toBe('Showing buy listings')

    fireEvent.click(view.getByRole('tab', { name: 'Rent' }))
    expect(view.getByRole('tab', { name: 'Rent' }).getAttribute('aria-selected')).toBe('true')
    expect(summary()).toBe('Showing rent listings')

    const pill = view.container.querySelector('[data-mol-id="filter-price"]')
    expect(pill?.getAttribute('data-state')).toBe('inactive')
    expect(view.queryByLabelText('Max price')).toBeNull()
    fireEvent.click(pill as Element)
    fireEvent.change(view.getByLabelText('Max price'), { target: { value: '500000' } })
    expect(summary()).toBe('Showing rent listings under $500000')
    expect(pill?.textContent).toContain('Under $500000')
    expect(pill?.getAttribute('data-state')).toBe('active')

    fireEvent.mouseDown(document.body)
    expect(view.queryByLabelText('Max price')).toBeNull()
  })
})
