// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the REAL glass ClassMap bonded into the
 * REAL `@molecule/app-ui` core, resolved by a DOM component in happy-dom.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'

import { getClassMap, setClassMap } from '@molecule/app-ui'

import { classMap } from '../index.js'

/**
 * The example's component, verbatim.
 *
 * @param label - The stat label.
 * @param value - The formatted stat value.
 * @returns The card element.
 */
function renderStatCard(label: string, value: string): HTMLElement {
  const cm = getClassMap()
  const card = document.createElement('section')
  card.className = cm.card()
  const body = document.createElement('div')
  body.className = cm.cardContent
  const heading = document.createElement('h3')
  heading.className = cm.cardTitle
  heading.textContent = label
  const amount = document.createElement('p')
  amount.className = cm.textSize('2xl')
  amount.textContent = value
  body.append(heading, amount)
  card.append(body)
  return card
}

describe('README @example', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('bonds the glass ClassMap and surfaces render with base + backdrop classes', () => {
    setClassMap(classMap)

    document.body.append(renderStatCard('Revenue', '$12,400'))

    const cardClasses = document.querySelector('section')?.className.split(' ') ?? []
    expect(cardClasses).toEqual(
      expect.arrayContaining([
        'rounded-lg',
        'bg-surface',
        'backdrop-blur-xl',
        'backdrop-saturate-150',
      ]),
    )
    expect(document.querySelector('h3')?.textContent).toBe('Revenue')
    expect(document.querySelector('h3')?.className).toContain('font-semibold')
    const amount = document.querySelector('p')
    expect(amount?.textContent).toBe('$12,400')
    expect(amount?.className).toContain('text-2xl')
  })
})
