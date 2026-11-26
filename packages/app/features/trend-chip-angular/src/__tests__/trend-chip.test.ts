// @vitest-environment jsdom
/**
 * Unit tests of `TrendChip` — the port of
 * `@molecule/app-trend-chip-react`'s own suite. The React suite renders the
 * component with a mocked ClassMap and asserts the markup; this port mounts
 * the same tree through Angular's real renderer (the same `createApplication`
 * + JIT host approach the conformance kit's Angular adapter uses) and asserts
 * the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`textTone-success`) the chip picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { TrendChip } = await import('../trend-chip.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the TrendChip through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @param projected - Extra projected content (e.g. a `[slot=prefix]` element).
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}, projected = ''): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TrendChip as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<span mol-trend-chip [delta]="p['delta']" [direction]="p['direction']" [suffix]="p['suffix']" [prefix]="p['prefix']" [variant]="p['variant']" [ariaLabel]="p['ariaLabel']" [className]="p['className']">${projected}</span>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('TrendChip', () => {
  it('renders the success tone for a positive delta', async () => {
    const m = await render({ delta: 12 })
    const markup = m.host.innerHTML
    expect(markup).toContain('▲')
    expect(markup).toContain('12%')
    expect(markup).toContain('textTone-success')
    expect(markup).not.toContain('style=')
  })

  it('renders the error tone for a negative delta', async () => {
    const m = await render({ delta: -8 })
    const markup = m.host.innerHTML
    expect(markup).toContain('▼')
    expect(markup).toContain('8%')
    expect(markup).toContain('textTone-error')
  })

  it('renders the secondary tone for a zero delta', async () => {
    const m = await render({ delta: 0 })
    const markup = m.host.innerHTML
    expect(markup).toContain('–')
    expect(markup).toContain('textTone-secondary')
  })

  it('honours an explicit direction override', async () => {
    const m = await render({ delta: 5, direction: 'down' })
    const markup = m.host.innerHTML
    expect(markup).toContain('▼')
    expect(markup).toContain('textTone-error')
  })

  it('uses the default "%" suffix and a custom suffix', async () => {
    expect((await render({ delta: 3 })).host.innerHTML).toContain('3%')
    expect((await render({ delta: 3, suffix: 'pts' })).host.innerHTML).toContain('3pts')
  })

  it('renders the tonal pill fill for the pill variant', async () => {
    const m = await render({ delta: 4, variant: 'pill' })
    const markup = m.host.innerHTML
    expect(markup).toContain('bgTone-success')
    expect(markup).toContain('textOnTone')
    expect(markup).toContain('border-radius: 999px')
    expect(markup).not.toContain('background:')
    expect(markup).not.toContain('color:')
  })

  it('honours a custom ariaLabel and forwards className', async () => {
    const m = await render({ delta: 1, ariaLabel: 'Up one percent', className: 'tc-cls' })
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="Up one percent"')
    expect(markup).toContain('tc-cls')
  })

  it('renders a string prefix and feeds the default aria label', async () => {
    const m = await render({ delta: 2, prefix: '$' })
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="$▲ 2%"')
    expect(markup).toContain('$')
  })

  it('renders a projected node prefix', async () => {
    const m = await render({ delta: 4, ariaLabel: 'up' }, '<strong slot="prefix">+</strong>')
    expect(m.host.innerHTML).toContain('<strong slot="prefix">+</strong>')
  })
})
