// @vitest-environment jsdom
/**
 * Unit tests of `DetailPageLayout` — the port of
 * `@molecule/app-detail-page-layout-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { DetailPageLayout } = await import('../detail-page-layout.component.js')

/** Hosts mounted so far: each gets its own id, so JIT component ids do not collide (NG0912). */
let hostCount = 0

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @param content - The host template's children (the projected slots).
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
  content = '',
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    // Angular derives a component id from the definition, so two cases with
    // the same template collide (NG0912); a unique host attribute avoids it.
    host: { 'data-parity-host': String(++hostCount) },
    template: `<div mol-detail-page-layout [sidebarPosition]="p['sidebarPosition']" [sidebarWidth]="p['sidebarWidth']" [className]="p['className']" [dataMolId]="p['dataMolId']">${content}</div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const MAIN = '<div slot="main"><div data-main></div></div>'
const SIDEBAR = '<div slot="sidebar"><div data-sidebar></div></div>'

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}, content = MAIN): Promise<Mounted> => {
  const m = await mount(DetailPageLayout as Type<unknown>, props, content)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('DetailPageLayout', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of sidebar', async () => {
    const m = await render(
      { sidebarPosition: 'right', xs: [1, 3] },
      `${MAIN}@for (x of p['xs']; track x) {<b slot="sidebar">{{ x }}</b>}`,
    )
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('aside b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    await m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    await m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('renders the main content', async () => {
    const m = await render()
    expect(m.host.innerHTML).toContain('data-main')
  })

  it('renders the breadcrumb and topBar slots when present', async () => {
    const m = await render(
      {},
      `<nav slot="breadcrumb" data-crumb></nav><div slot="topBar" data-topbar></div>${MAIN}`,
    )
    expect(m.host.innerHTML).toContain('data-crumb')
    expect(m.host.innerHTML).toContain('data-topbar')
  })

  it('renders the sidebar after the main column by default (right)', async () => {
    const m = await render({}, `${MAIN}${SIDEBAR}`)
    const aside = m.host.querySelector('aside')
    expect(aside).not.toBeNull()
    const mainEl = m.host.querySelector('main')
    expect(
      mainEl && aside && mainEl.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders the sidebar before the main column when sidebarPosition is left', async () => {
    const m = await render({ sidebarPosition: 'left' }, `${MAIN}${SIDEBAR}`)
    const aside = m.host.querySelector('aside')
    const mainEl = m.host.querySelector('main')
    expect(
      aside && mainEl && aside.compareDocumentPosition(mainEl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders no <aside> when no sidebar is supplied', async () => {
    const m = await render()
    expect(m.host.querySelector('aside')).toBeNull()
  })

  it('applies the sidebarWidth as a flex-basis on the aside', async () => {
    const m = await render({ sidebarWidth: 'lg' }, `${MAIN}${SIDEBAR}`)
    // lg → 96 * 4 = 384px
    const aside = m.host.querySelector('aside')
    expect(aside).not.toBeNull()
    expect(aside?.getAttribute('style')).toContain('flex-basis: 384px')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render({ dataMolId: 'dpl-x', className: 'dpl-cls' })
    const root = m.host.querySelector('[mol-detail-page-layout]')
    expect(root?.getAttribute('data-mol-id')).toBe('dpl-x')
    expect(root?.getAttribute('class')).toContain('dpl-cls')
  })

  it('shows and removes the sidebar wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { sidebarPosition: 'right', on: false },
      `${MAIN}@if (p['on']) {<div slot="sidebar" data-sidebar></div>}`,
    )
    // React renders neither aside while no sidebar is supplied.
    expect(m.host.querySelectorAll('aside')).toHaveLength(0)
    await m.setProps({ on: true })
    const asides = m.host.querySelectorAll('aside')
    expect(asides).toHaveLength(1)
    expect(asides[0].querySelector('[data-sidebar]')).not.toBeNull()
    await m.setProps({ on: false })
    expect(m.host.querySelectorAll('aside')).toHaveLength(0)
  })
})
