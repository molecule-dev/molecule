// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name, so the component renders without a bonded
// ClassMap; the glyphs' aria-hidden attribute is what these tests assert.
vi.mock('@molecule/app-ui', () => ({
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

import { type App, createApp } from 'vue'

import { FilterPill } from '../FilterPill.js'

/** Mounted apps, unmounted after each test. */
const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of document.body.querySelectorAll('[data-test-host]')) host.remove()
})

/**
 * Mounts the pill into the document.
 * @param props - Props over the pill.
 * @returns The host element.
 */
function mount(props: Record<string, unknown>): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute('data-test-host', '')
  document.body.appendChild(host)
  const app = createApp(FilterPill as never, props)
  app.mount(host)
  apps.push(app)
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
