// @vitest-environment jsdom
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

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
  app = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
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
  it('keeps a consumer list in order when an item is inserted in the middle of panel', async () => {
    const Host = Component({
      selector: 'mol-pill-spec-host',
      standalone: true,
      imports: [FilterPill],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<div mol-faceted-search-filter-pill label="Price">@for (x of xs; track x) {<b>{{ x }}</b>}</div>`,
    })(
      class PillSpecHost {
        xs = [1, 3]
      },
    )
    app = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref = createComponent(Host as Type<{ xs: number[] }>, {
      environmentInjector: app.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    host.setAttribute('data-test-host', '')
    document.body.appendChild(host)
    app.attachView(ref.hostView)
    app.tick()
    ;(host.querySelector('button') as HTMLButtonElement).click()
    app.tick()
    const texts = (): string[] =>
      Array.from(host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    ref.instance.xs = [1, 2, 3]
    ref.changeDetectorRef.markForCheck()
    app.tick()
    expect(texts()).toEqual(['1', '2', '3'])
    ref.instance.xs = [1, 3]
    ref.changeDetectorRef.markForCheck()
    app.tick()
    expect(texts()).toEqual(['1', '3'])
  })

  it('hides the chevron glyph from assistive tech', async () => {
    const host = await mount({ label: 'Price' })
    const chevron = glyphSpan(host, 'expand_more')
    expect(chevron).not.toBeNull()
    expect(chevron?.getAttribute('aria-hidden')).toBe('true')
  })

  it('shows and removes the panel wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const Host = Component({
      selector: 'mol-pill-panel-spec-host',
      standalone: true,
      imports: [FilterPill],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<div mol-faceted-search-filter-pill label="Price">@if (on) {<span data-panel>Filters</span>}</div>`,
    })(
      class PillPanelSpecHost {
        on = false
      },
    )
    app = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref = createComponent(Host as Type<{ on: boolean }>, {
      environmentInjector: app.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    host.setAttribute('data-test-host', '')
    document.body.appendChild(host)
    app.attachView(ref.hostView)
    app.tick()
    // React renders the panel only while it is open.
    ;(host.querySelector('button') as HTMLButtonElement).click()
    app.tick()
    /** The pill's markup without Angular's comments and classes. */
    const shape = (): string => {
      const pill = host.querySelector('[mol-faceted-search-filter-pill]')
      if (!pill) throw new Error('no pill rendered')
      return pill.innerHTML.replace(/<!--.*?-->/g, '').replace(/ class="[^"]*"/g, '')
    }
    const trigger = shape()
    expect(host.querySelector('[data-panel]')).toBeNull()
    ref.instance.on = true
    ref.changeDetectorRef.markForCheck()
    app.tick()
    expect(shape()).toBe(
      trigger.replace('</button>', '</button><div><span data-panel="">Filters</span></div>'),
    )
    expect(host.querySelector('[data-panel]')?.parentElement?.tagName).toBe('DIV')
    ref.instance.on = false
    ref.changeDetectorRef.markForCheck()
    app.tick()
    expect(shape()).toBe(trigger)
    expect(host.querySelector('[data-panel]')).toBeNull()
  })

  it('hides the leading icon glyph from assistive tech', async () => {
    const host = await mount({ label: 'Filters', leadingIcon: 'tune' })
    const icon = glyphSpan(host, 'tune')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })
})
