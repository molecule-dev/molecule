// @vitest-environment jsdom
/**
 * The axis tick and row badge duration labels go through `t()` — a port of
 * `@molecule/app-trace-waterfall-react`'s `duration-labels.test.tsx`: the same
 * assertion, mounted through Angular's real renderer (jsdom).
 *
 * The labels used to render `formatDurationLabel`'s English directly, so a
 * switch to the pseudo-locale left `0µs` / `2.5ms` unbracketed. This test
 * bonds a `t` that marks every call, so a label that bypassed `t` would show
 * up as plain English.
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

// Each translation comes back marked with its key and its `{{value}}`, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      `«${key}:${values ? String(values.value ?? '') : ''}»`,
  }),
  useLocale: () => () => 'en',
}))

import type { Span } from '../types.js'

const { TraceWaterfall } = await import('../trace-waterfall.component.js')

/** A mounted host: its element and a teardown. */
interface Mounted {
  /** The host element the component template produced. */
  readonly host: HTMLElement
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
 * Renders the waterfall the way an app would: through a JIT host template.
 *
 * @param spans - The spans input.
 * @returns The mounted host.
 */
async function render(spans: Span[]): Promise<Mounted> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TraceWaterfall as Type<unknown>],
    template: `<mol-trace-waterfall [spans]="p['spans']"></mol-trace-waterfall>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { spans }
    },
  )
  return mountHost(Host)
}

afterEach(async () => {
  for (const entry of mounted.splice(0)) await entry.destroy()
  document.body.innerHTML = ''
})

const spans: Span[] = [
  { id: 'a', name: 'GET /api', service: 'edge', startTime: 0, duration: 100, status: 'ok' },
]

describe('TraceWaterfall duration labels', () => {
  it('renders axis ticks and row durations through t with their keys', async () => {
    const { host } = await render(spans)
    const ticks = host.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')
    // The trace runs 0..100 ms, so the five ticks are 0µs, 25ms, 50ms, 75ms, 100ms.
    expect(ticks[0]?.textContent).toBe('«traceWaterfall.duration.us:0»')
    expect(ticks[1]?.textContent).toBe('«traceWaterfall.duration.ms:25»')
    expect(ticks[4]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
    const badges = host.querySelectorAll('[data-mol-id="trace-waterfall-duration"]')
    expect(badges[0]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
  })
})
