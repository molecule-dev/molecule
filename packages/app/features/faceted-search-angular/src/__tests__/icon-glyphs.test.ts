// @vitest-environment jsdom
import '@angular/compiler'
import {
  type ApplicationRef,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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

import { FilterPill } from '../filter-pill.component.js'

/** The application and the pill instance a test renders, disposed after it. */
let app: ApplicationRef | null = null
let pill: ComponentRef<FilterPill> | null = null

afterEach(() => {
  pill?.destroy()
  pill = null
  app?.destroy()
  app = null
  for (const host of document.body.querySelectorAll('[data-test-host]')) host.remove()
})

/**
 * Mounts the pill into the document. The host IS React's root `<div>`: the
 * component's attribute selector names it, the way a real template uses it.
 * @param inputs - Inputs over the pill.
 * @returns The host element.
 */
async function mount(inputs: Record<string, unknown>): Promise<HTMLElement> {
  app = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const host = document.createElement('div')
  host.setAttribute('data-test-host', '')
  host.setAttribute('mol-faceted-search-filter-pill', '')
  document.body.appendChild(host)
  pill = createComponent(FilterPill, { environmentInjector: app.injector, hostElement: host })
  for (const [name, value] of Object.entries(inputs)) pill.setInput(name, value)
  app.attachView(pill.hostView)
  app.tick()
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
