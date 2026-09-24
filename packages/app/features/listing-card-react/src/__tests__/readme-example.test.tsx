// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  ListingCard,
  ListingCardActions,
  ListingCardBody,
  ListingCardMedia,
  ListingGrid,
} from '../index.js'

const listings = [
  {
    id: 'l1',
    name: 'Seaside Cottage',
    location: 'Brighton, UK',
    price: 180,
    imageUrl: '/img/cottage.jpg',
  },
  { id: 'l2', name: 'City Loft', location: 'Berlin, DE', price: 140, imageUrl: '/img/loft.jpg' },
]

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.onOpen - Called with the listing id when a card is clicked.
 * @returns The rendered listings grid.
 */
function ListingsPage({ onOpen }: { onOpen: (id: string) => void }): React.JSX.Element {
  const [saved, setSaved] = useState<string[]>([])
  return (
    <ListingGrid columns={3}>
      {listings.map((item) => (
        <ListingCard key={item.id} dataMolId={`listing-${item.id}`} onClick={() => onOpen(item.id)}>
          <ListingCardMedia src={item.imageUrl} alt={item.name} aspect="4/3" />
          <ListingCardBody
            title={item.name}
            subtitle={item.location}
            price={`$${item.price}/night`}
          />
          <ListingCardActions>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation() // otherwise the card's onClick fires too
                setSaved((ids) => [...ids, item.id])
              }}
            >
              {saved.includes(item.id) ? 'Saved' : 'Save'}
            </button>
          </ListingCardActions>
        </ListingCard>
      ))}
    </ListingGrid>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders each listing, opens on card click, and saves without opening', () => {
    const onOpen = vi.fn()
    const view = render(<ListingsPage onOpen={onOpen} />)
    expect(view.getByRole('heading', { name: 'Seaside Cottage' })).toBeTruthy()
    expect(view.getByText('$140/night')).toBeTruthy()
    expect(view.getByAltText('City Loft').getAttribute('src')).toBe('/img/loft.jpg')

    const saveButtons = view.getAllByRole('button', { name: 'Save' })
    expect(saveButtons).toHaveLength(2)
    const firstSave = saveButtons[0]
    if (!firstSave) throw new Error('missing save button')
    fireEvent.click(firstSave)
    expect(onOpen).not.toHaveBeenCalled()
    expect(view.getByRole('button', { name: 'Saved' })).toBeTruthy()

    fireEvent.click(view.getByText('Berlin, DE'))
    expect(onOpen).toHaveBeenCalledWith('l2')
    expect(view.container.querySelector('[data-mol-id="listing-l2"]')).toBeTruthy()
  })
})
