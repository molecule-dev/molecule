// @vitest-environment jsdom
/**
 * The default limit rows' own text goes through i18n — a port of
 * `@molecule/app-billing-react/src/__tests__/limits-i18n.test.tsx`: the same
 * test names and assertions, mounted through Angular's real renderer with a
 * `t` that marks every key. A default that bypassed t() would show up as
 * plain English.
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

// The limits the tier carries; each test sets its own before mounting.
const state = vi.hoisted(() => ({ limits: {} as Record<string, unknown> }))

// A ClassMap mock echoing each accessed member back as its token. The
// members the component calls return the token from a function; every other
// member IS the token string, because Angular's `[class]` bindings reject a
// function where the real ClassMap carries a plain class token.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const called = ['cn', 'maxW', 'sp', 'flex', 'card', 'button', 'stack', 'textSize', 'fontWeight']
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        const token = String(prop)
        if (token === 'cn') {
          return (...cls: unknown[]) =>
            cls.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        if (called.includes(token)) return (..._args: unknown[]) => token
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

// A `t` that marks every key, so a default that bypassed t() renders as
// plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  useAuth: () => ({ isAuthenticated: () => true }),
}))

// The icon marker, so the row keeps its check glyph without the icon set.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Icon: Component({
      selector: 'svg[mol-icon-root]',
      standalone: true,
      inputs: ['name', 'size', 'className', 'ariaHidden'],
      template: '',
    })(class MockIcon {}),
  }
})

// The tiers endpoint's answer, so the page renders its default limit rows.
vi.mock('../hooks.js', () => ({
  usePricingTiers: () => ({
    data: () => ({
      data: [
        {
          key: 'pro',
          name: 'Pro',
          prices: [{ period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' }],
          limits: state.limits,
        },
      ],
    }),
    loading: () => false,
    error: () => null,
  }),
  useStartCheckout: () => ({ start: async () => null, loading: () => false, error: () => null }),
}))

const { PricingPage } = await import('../pricing-page.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The apps mounted during one test, destroyed in `afterEach`. */
const mounted: Mounted[] = []

/**
 * Mounts the pricing page through a JIT host template, written exactly the
 * way an Angular app would write it.
 *
 * @returns The mounted host.
 */
async function mountPage(): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [PricingPage as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<section mol-pricing-page></section>`,
  })(
    class SpecHost {
      /** No inputs: every prop is optional and the hooks are mocked. */
      p: Record<string, unknown> = {}
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
  const entry: Mounted = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('PricingPage default limits text', () => {
  it('renders the default limit labels through i18n', async () => {
    state.limits = { maxProjects: 100, canExport: true }
    const m = await mountPage()
    const text = m.host.querySelector('[data-mol-id="pricing-tier-pro"]')?.textContent ?? ''
    expect(text).toContain('«billing.pricing.limit.maxProjects»')
    expect(text).toContain('«billing.pricing.limit.canExport»')
    // The humanized English fallback must not leak: only the key renders.
    expect(text).not.toContain('Max projects')
    expect(text).not.toContain('Can export')
  })

  it('renders the unlimited sentinel through i18n', async () => {
    state.limits = { maxSeats: 1_000_000, maxProjects: 500 }
    const m = await mountPage()
    const text = m.host.querySelector('[data-mol-id="pricing-tier-pro"]')?.textContent ?? ''
    expect(text).toContain('«billing.pricing.unlimited»')
    // A number below the sentinel stays a number.
    expect(text).toContain('500')
    expect(text).not.toContain('Unlimited')
  })
})
