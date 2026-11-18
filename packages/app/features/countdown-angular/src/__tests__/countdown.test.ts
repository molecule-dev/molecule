// @vitest-environment jsdom
/**
 * Unit tests of `Countdown` and `useCountdown` — the port of
 * `@molecule/app-countdown-react`'s own suite. The React suite renders the
 * component with a mocked ClassMap and asserts the markup; this port mounts
 * the same tree through Angular's real renderer (the `createApplication` + JIT
 * host approach the conformance kit's Angular adapter uses) and asserts the
 * same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, the same
// mock the React tests use.
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

const { Countdown } = await import('../countdown.component.js')
const { useCountdown } = await import('../useCountdown.js')

/** A mounted host: its element and a teardown. */
interface Mounted {
  /** The host element the component template produced. */
  readonly host: HTMLElement
  /** Its rendered markup. */
  readonly markup: string
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts a host component through Angular's real renderer and ticks it once.
 *
 * @param host - The host component type.
 * @returns The mounted host.
 */
async function mountHost(host: Type<unknown>): Promise<Mounted> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(host, { environmentInjector: appRef.injector })
  const element = ref.location.nativeElement as HTMLElement
  document.body.appendChild(element)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry: Mounted = {
    host: element,
    markup: element.innerHTML,
    destroy: async () => {
      ref.destroy()
      element.remove()
      await appRef.destroy()
    },
  }
  mounted.push(entry)
  return entry
}

/**
 * Renders `Countdown` the way an app would: through a JIT host template, with
 * an `<ng-template>` per node-valued prop the case supplies.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @param templates - Markup for the `expired` / `render` templates, when used.
 * @returns The mounted host.
 */
async function render(
  props: Record<string, unknown> = {},
  templates: { expired?: string; render?: string } = {},
): Promise<Mounted> {
  const ended = templates.expired
  const custom = templates.render
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [Countdown as Type<unknown>],
    template: `
      ${ended === undefined ? '' : `<ng-template #endedTpl>${ended}</ng-template>`}
      ${custom === undefined ? '' : `<ng-template #customTpl let-state>${custom}</ng-template>`}
      <mol-countdown
        [target]="p['target']"
        [format]="p['format']"
        [className]="p['className']"
        ${ended === undefined ? '' : '[expired]="endedTpl"'}
        ${custom === undefined ? '' : '[render]="customTpl"'}
      ></mol-countdown>
    `,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  return mountHost(Host)
}

/**
 * Calls `useCountdown` in a component's injection context and reads its state.
 *
 * @param target - The target epoch milliseconds.
 * @returns The countdown state as plain data.
 */
async function probe(target: number): Promise<Record<string, unknown>> {
  const Host = Component({
    selector: 'mol-probe-host',
    standalone: true,
    template: `<span data-state>{{ state }}</span>`,
  })(
    class ProbeHost {
      /** The countdown fields as JSON, read once at construction. */
      readonly state = (() => {
        const s = useCountdown(target)
        return JSON.stringify({
          days: s.days(),
          hours: s.hours(),
          minutes: s.minutes(),
          seconds: s.seconds(),
          msRemaining: s.msRemaining(),
          expired: s.expired(),
        })
      })()
    },
  )
  const entry = await mountHost(Host)
  return JSON.parse(entry.host.querySelector('[data-state]')?.textContent ?? '{}') as Record<
    string,
    unknown
  >
}

// 1d 2h 3m 4s in ms — used as the target with the clock pinned to epoch 0.
const ONE_D_TWO_H_THREE_M_FOUR_S = 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('decomposes the remaining time into days / hours / minutes / seconds', async () => {
    const s = await probe(ONE_D_TWO_H_THREE_M_FOUR_S)
    expect(s).toMatchObject({ days: 1, hours: 2, minutes: 3, seconds: 4, expired: false })
  })

  it('flags expired and clamps units to 0 when the target is in the past', async () => {
    const s = await probe(-5_000)
    expect(s.expired).toBe(true)
    expect(s).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    expect(s.msRemaining).toBeLessThan(0)
  })
})

describe('Countdown', () => {
  it('renders the compact format by default, skipping leading zero units', async () => {
    const onlySeconds = (await render({ target: 30_000 })).markup
    expect(onlySeconds).toContain('30s')
    expect(onlySeconds).not.toContain('d ')
    const full = (await render({ target: ONE_D_TWO_H_THREE_M_FOUR_S })).markup
    expect(full).toContain('1d 2h 3m 4s')
  })

  it('renders the long format with pluralised unit words', async () => {
    const markup = (await render({ target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'long' })).markup
    expect(markup).toContain('1 day 2 hours 3 minutes 4 seconds')
  })

  it('renders the colon format zero-padded to two digits', async () => {
    const markup = (await render({ target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'colon' })).markup
    expect(markup).toContain('01:02:03:04')
  })

  it('renders the `expired` node once the target has passed', async () => {
    const markup = (await render({ target: -1_000 }, { expired: '<span data-expired>Done</span>' }))
      .markup
    expect(markup).toContain('data-expired=""')
    expect(markup).toContain('Done')
  })

  it('uses the `render` prop for full control over markup', async () => {
    const markup = (
      await render({ target: ONE_D_TWO_H_THREE_M_FOUR_S }, { render: '<b data-render>1</b>' })
    ).markup
    expect(markup).toContain('data-render=""')
    expect(markup).toContain('>1<')
  })

  it('forwards className onto the wrapper span', async () => {
    const markup = (await render({ target: 30_000, className: 'cd-cls' })).markup
    expect(markup).toContain('cd-cls')
  })
})
