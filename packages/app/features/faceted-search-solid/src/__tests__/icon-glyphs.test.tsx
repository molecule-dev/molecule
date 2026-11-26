// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name, so the component renders without a bonded
// ClassMap; the glyphs' aria-hidden attribute is what these tests assert.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          typeof prop === 'string' && prop === 'cn'
            ? (...args: unknown[]) => args.filter(Boolean).join(' ')
            : (..._args: unknown[]) => String(prop),
      },
    ),
}))

import { FilterPill } from '../FilterPill.jsx'
import type { FilterPillProps } from '../types.js'

/** Disposers of rendered roots, run after each test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const host of document.body.querySelectorAll('[data-test-host]')) host.remove()
})

/**
 * Renders the pill into the document.
 * @param props - Props over the pill.
 * @returns The host element.
 */
function mount(props: FilterPillProps): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute('data-test-host', '')
  document.body.appendChild(host)
  const dispose = render(
    // Solid re-uses its DOM: the props are static here, so a static snapshot of
    // the pill is all the assertion needs.
    () => <FilterPill {...props} />,
    host,
  )
  disposers.push(dispose)
  return host
}

/** The glyph span whose text is the icon-font ligature named. */
const glyphSpan = (host: HTMLElement, ligature: string): Element | null =>
  [...host.querySelectorAll('span')].find((span) => span.textContent === ligature) ?? null

describe('FilterPill glyph spans', () => {
  it('hides the chevron glyph from assistive tech', () => {
    const host = mount({ label: 'Price' })
    const chevron = glyphSpan(host, 'expand_more')
    expect(chevron).not.toBeNull()
    expect(chevron?.getAttribute('aria-hidden')).toBe('true')
  })

  it('hides the leading icon glyph from assistive tech', () => {
    const host = mount({ label: 'Filters', leadingIcon: 'tune' })
    const icon = glyphSpan(host, 'tune')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })
})
