// @vitest-environment jsdom
/**
 * Unit tests of `TickerRow` — the port of
 * `@molecule/app-ticker-row-react/src/__tests__/ticker-row.test.tsx`. The
 * React suite renders the component with mocked UI dependencies and asserts
 * the markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings. Inline
 * colors are set through the CSSOM, so jsdom serializes them as `rgb(...)`
 * (the same values React's runtime mount produces).
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

const { TickerRow } = await import('../ticker-row.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The input bindings every template carries. */
const BINDINGS =
  `[symbol]="p['symbol']" [name]="p['name']" [icon]="p['icon']" [price]="p['price']"` +
  ` [changePct]="p['changePct']" [changeDisplay]="p['changeDisplay']"` +
  ` [sparkline]="p['sparkline']" [meta]="p['meta']" [className]="p['className']"` +
  ` [onClick]="p['onClick']"`

const mounted: Mounted[] = []

/** Renders the row with the given props (and any projected slot markup). */
const render = async (props: Record<string, unknown> = {}, content = ''): Promise<Mounted> => {
  const m = await mount(
    `<div mol-ticker-row ${BINDINGS}>${content}</div>`,
    TickerRow as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('TickerRow', () => {
  it('renders the symbol, name, and price', async () => {
    const m = await render({ symbol: 'BTC', name: 'Bitcoin', price: '$67,000' })
    expect(m.host.innerHTML).toContain('BTC')
    expect(m.host.innerHTML).toContain('Bitcoin')
    expect(m.host.innerHTML).toContain('$67,000')
  })

  it('renders an up arrow + green for a positive change', async () => {
    const m = await render({ symbol: 'X', price: '$1', changePct: 3.21 })
    expect(m.host.innerHTML).toContain('▲')
    expect(m.host.innerHTML).toContain('3.21%')
    expect(m.host.innerHTML).toContain('rgb(34, 197, 94)')
  })

  it('renders a down arrow + red for a negative change', async () => {
    const m = await render({ symbol: 'X', price: '$1', changePct: -1.5 })
    expect(m.host.innerHTML).toContain('▼')
    expect(m.host.innerHTML).toContain('rgb(239, 68, 68)')
  })

  it('uses changeDisplay over the formatted percentage when supplied', async () => {
    const m = await render({ symbol: 'X', price: '$1', changePct: 2, changeDisplay: '+$0.50' })
    expect(m.host.innerHTML).toContain('+$0.50')
  })

  it('renders the icon, sparkline, and meta slots', async () => {
    const m = await render(
      { symbol: 'X', price: '$1' },
      `<span slot="icon" data-icon></span><svg slot="sparkline" data-spark></svg><span slot="meta" data-meta></span>`,
    )
    expect(m.host.innerHTML).toContain('data-icon=""')
    expect(m.host.innerHTML).toContain('data-spark=""')
    expect(m.host.innerHTML).toContain('data-meta=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', async () => {
    const clickable = await render({ symbol: 'X', price: '$1', onClick: () => {} })
    expect(clickable.host.innerHTML).toContain('cursorPointer')
    const plain = await render({ symbol: 'X', price: '$1', className: 'tr-cls' })
    expect(plain.host.innerHTML).not.toContain('cursorPointer')
    expect(plain.host.innerHTML).toContain('tr-cls')
  })
})
