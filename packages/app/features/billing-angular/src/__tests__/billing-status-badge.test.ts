// @vitest-environment jsdom
/**
 * Unit tests of `BillingStatusBadge`'s rendered DOM — the port of
 * `@molecule/app-billing-react`'s `BillingStatusBadge`. React's root varies
 * with the load state (`<span>` while loading, `<div>` once loaded, nothing
 * without a status), so the port renders that root in front of the host's
 * place and the host itself leaves the page; this suite mounts it between two
 * fixed siblings and asserts the consumer's children are exactly React's.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

import type { BillingStatus } from '../types.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Properties are the ClassMap's class tokens (a string, as a real bond
    // returns them); methods return a token string too.
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(target, prop) {
        if (prop in target) return target[prop as string]
        if (prop === 'cn') {
          return (...classes: unknown[]) =>
            classes
              .flat()
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        return String(prop)
      },
    }
    const base = {
      /** React's `cm.button({ variant, size })` token. */
      button: (): string => 'button-token',
    }
    return new Proxy(base, handler)
  },
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}))

/**
 * The mocked billing hooks: their signals, created inside the mock factory (so
 * no imported binding is used there), and a setter the test drives.
 */
vi.mock('../hooks.js', async () => {
  const { signal } = await import('@angular/core')
  const status = {
    loading: signal(true),
    data: signal<BillingStatus | null>(null),
    error: signal<Error | null>(null),
  }
  return {
    useBillingStatus: () => status,
    useCancelSubscription: () => ({
      data: signal(null),
      loading: signal(false),
      error: signal(null),
      cancel: async () => ({ canceled: true }),
    }),
    /** Test-only: the status signals and a writer for them. */
    __status: {
      ...status,
      /**
       * Writes several mocked-hook values at once.
       *
       * @param next - The values to write.
       */
      set(next: { loading?: boolean; data?: BillingStatus | null; error?: Error | null }): void {
        if (next.loading !== undefined) status.loading.set(next.loading)
        if (next.data !== undefined) status.data.set(next.data)
        if (next.error !== undefined) status.error.set(next.error)
      },
    },
  }
})

const { BillingStatusBadge } = await import('../billing-status-badge.component.js')
/** The mocked hooks, typed for the test-only status writer. */
const hooks = (await import('../hooks.js')) as unknown as {
  __status: {
    /**
     * Writes several mocked-hook values at once.
     *
     * @param next - The values to write.
     */
    set(next: { loading?: boolean; data?: BillingStatus | null; error?: Error | null }): void
  }
}

/** A mounted spec host: its DOM, a change-detection flush, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Flushes change detection. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the badge between two fixed siblings, the way a consumer page would.
 *
 * @returns The mounted host.
 */
async function renderInList(): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-billing-list-host',
    standalone: true,
    imports: [BillingStatusBadge],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<i>a</i><mol-billing-status-badge /><i>b</i>`,
  })(class BillingListHost {})
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    flush: () => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  }
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  hooks.__status.set({ loading: true, data: null, error: null })
})

describe('<BillingStatusBadge>', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await renderInList()
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    // Loading: React's `<span>`.
    expect(children()).toEqual(['i', 'span', 'i'])
    // Loaded: React's `<div>`.
    hooks.__status.set({
      loading: false,
      data: { planKey: 'free', category: 'free', name: 'Free', limits: {}, isFree: true },
    })
    m.flush()
    expect(children()).toEqual(['i', 'div', 'i'])
    // No status (error): React renders nothing at all.
    hooks.__status.set({ data: null, error: new Error('nope') })
    m.flush()
    expect(children()).toEqual(['i', 'i'])
  })
})
