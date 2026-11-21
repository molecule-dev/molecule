// @vitest-environment jsdom
/**
 * Unit tests of `NpsDistribution` — the port of
 * `@molecule/app-nps-distribution-react`'s own suite: the same test names and
 * the same behavioral assertions, mounted through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) with a mocked ClassMap.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can mount without a real bond.
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { NpsDistribution } = await import('../nps-distribution.component.js')

/** The host template: the props bound onto the attribute-selector host. */
const TEMPLATE = `<div mol-nps-distribution [scores]="p['scores']" [showScore]="p['showScore']" [detractorMax]="p['detractorMax']" [passiveMax]="p['passiveMax']" [className]="p['className']" [dataMolId]="p['dataMolId']"></div>`

/** A mounted spec host: its DOM, a props setter, a flush and a teardown. */
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
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
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

const mounted: Mounted[] = []

/**
 * Mounts an {@link NpsDistribution} and remembers it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(NpsDistribution as Type<unknown>, props)
  mounted.push(m)
  return m
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<NpsDistribution>', () => {
  it('renders 11 rows — one per score 0..10 — regardless of input', async () => {
    const m = await render({ scores: [10, 9, 0] })
    const rows = m.host.querySelectorAll('[data-nps-score]')
    expect(rows).toHaveLength(11)
    const scores = Array.from(rows).map((el) => el.getAttribute('data-nps-score'))
    expect(scores).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('tags each row with the correct tier (detractor / passive / promoter)', async () => {
    const m = await render({ scores: [] })
    const tierByScore: Record<string, string> = {}
    for (const row of m.host.querySelectorAll<HTMLElement>('[data-nps-score]')) {
      const score = row.dataset.npsScore ?? ''
      tierByScore[score] = row.dataset.npsTier ?? ''
    }
    expect(tierByScore['0']).toBe('detractor')
    expect(tierByScore['6']).toBe('detractor')
    expect(tierByScore['7']).toBe('passive')
    expect(tierByScore['8']).toBe('passive')
    expect(tierByScore['9']).toBe('promoter')
    expect(tierByScore['10']).toBe('promoter')
  })

  it('displays the per-score count next to each bar', async () => {
    const m = await render({ scores: [10, 10, 10, 9, 9, 7] })
    const row10 = m.host.querySelector('[data-nps-score="10"]')
    expect(row10?.textContent).toContain('3')
    const row9 = m.host.querySelector('[data-nps-score="9"]')
    expect(row9?.textContent).toContain('2')
    const row7 = m.host.querySelector('[data-nps-score="7"]')
    expect(row7?.textContent).toContain('1')
    const row0 = m.host.querySelector('[data-nps-score="0"]')
    expect(row0?.textContent).toContain('0')
  })

  it('renders the computed NPS score line by default', async () => {
    const m = await render({ scores: [10, 10, 9, 7, 0] })
    const score = m.host.querySelector('[data-nps-score-value]')
    expect(score?.textContent).toBe('40')
  })

  it('hides the NPS score line when showScore=false', async () => {
    const m = await render({ scores: [10, 9], showScore: false })
    expect(m.host.querySelector('[data-nps-score-value]')).toBeNull()
  })

  it('honors custom detractorMax / passiveMax cutoffs', async () => {
    const m = await render({ scores: [], detractorMax: 5, passiveMax: 7 })
    const row6 = m.host.querySelector('[data-nps-score="6"]')
    expect(row6?.getAttribute('data-nps-tier')).toBe('passive')
    const row8 = m.host.querySelector('[data-nps-score="8"]')
    expect(row8?.getAttribute('data-nps-tier')).toBe('promoter')
  })

  it('exposes a localized aria-label and figure role on the wrapper', async () => {
    const m = await render({ scores: [9, 10, 0] })
    const fig = m.host.querySelector('[role="figure"]')
    expect(fig).not.toBeNull()
    expect(fig?.getAttribute('aria-label')).toContain('3')
  })

  it('forwards dataMolId to the wrapper', async () => {
    const m = await render({ scores: [], dataMolId: 'nps-test' })
    const wrapper = m.host.firstElementChild as HTMLElement | null
    expect(wrapper?.getAttribute('data-mol-id')).toBe('nps-test')
  })

  it('renders a zero-count score 0 even when no detractors are present', async () => {
    const m = await render({ scores: [10, 10] })
    const row0 = m.host.querySelector('[data-nps-score="0"]')
    expect(row0).not.toBeNull()
    expect(row0?.textContent).toContain('0')
  })
})
