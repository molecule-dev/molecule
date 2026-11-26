import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FilterPillProps } from '../FilterPill.js'

// Class tokens echo their own name, so the components render without a bonded
// ClassMap; the glyphs' aria-hidden attribute is what these tests assert.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : (..._args: unknown[]) => String(prop),
      },
    ),
}))

const { FilterPill } = await import('../FilterPill.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
})

/**
 * Mounts the pill into the document.
 * @param props - Props over the pill.
 * @returns The host element.
 */
async function mount(props: FilterPillProps): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(FilterPill, props))
  })
  return host
}

/** The glyph span whose text is the icon-font ligature named. */
const glyphSpan = (host: HTMLElement, ligature: string): Element | null =>
  [...host.querySelectorAll('span')].find((span) => span.textContent === ligature) ?? null

describe('FilterPill glyph spans', () => {
  it('hides the chevron glyph from assistive tech', async () => {
    const host = await mount({ label: 'Price' })
    const chevron = glyphSpan(host, 'expand_more')
    expect(chevron).not.toBeNull()
    expect(chevron?.getAttribute('aria-hidden')).toBe('true')
  })

  it('hides the leading icon glyph from assistive tech', async () => {
    const host = await mount({ label: 'Filters', leadingIcon: 'tune' })
    const icon = glyphSpan(host, 'tune')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })
})
