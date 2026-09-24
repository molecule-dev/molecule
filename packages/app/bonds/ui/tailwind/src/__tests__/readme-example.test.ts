// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the REAL Tailwind ClassMap bonded into
 * the REAL `@molecule/app-ui` core, resolved by a DOM component in happy-dom.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'

import { getClassMap, setClassMap } from '@molecule/app-ui'

import { classMap } from '../index.js'

interface Order {
  id: string
  customer: string
  total: string
}

/**
 * The example's component, verbatim.
 *
 * @param order - The order to render.
 * @returns The card element.
 */
function renderOrderCard(order: Order): HTMLElement {
  const cm = getClassMap()
  const card = document.createElement('article')
  card.className = cm.card({ variant: 'elevated' })
  const header = document.createElement('div')
  header.className = cm.flex({ direction: 'row', justify: 'between', align: 'center' })
  const title = document.createElement('h3')
  title.className = cm.cardTitle
  title.textContent = order.customer
  const total = document.createElement('span')
  total.className = cm.badge({ variant: 'success' })
  total.textContent = order.total
  header.append(title, total)
  card.append(header)
  return card
}

describe('README @example', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('bonds the Tailwind ClassMap and a component renders with its semantic classes', () => {
    setClassMap(classMap)

    document.body.append(renderOrderCard({ id: 'o_1', customer: 'Ada Lovelace', total: '$42.00' }))

    const card = document.querySelector('article')
    expect(card?.className.split(' ')).toEqual(
      expect.arrayContaining(['rounded-lg', 'bg-surface', 'shadow-lg']),
    )
    const header = card?.firstElementChild
    const headerClasses = header?.className.split(' ') ?? []
    expect(headerClasses).toEqual(
      expect.arrayContaining(['flex', 'flex-row', 'justify-between', 'items-center']),
    )
    expect(document.querySelector('h3')?.textContent).toBe('Ada Lovelace')
    expect(document.querySelector('h3')?.className).toContain('font-semibold')
    const badge = document.querySelector('span')
    expect(badge?.textContent).toBe('$42.00')
    expect(badge?.className).toContain('rounded-full')
  })
})
