// @vitest-environment jsdom
/**
 * Unit tests for the Angular `PricingTable` — a port of
 * `@molecule/app-pricing-table-react/src/__tests__/pricing-table.test.tsx`:
 * the same behavioral assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) and asserted on the markup the component produces.
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
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* member was applied without a real bond — the same mock
// the React tests use.
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

// The same UI markers the React tests mock `@molecule/app-ui-react` with: a
// `data-button` button and a `data-card` div carrying the style it received.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      template: `<ng-content></ng-content>`,
      host: { 'data-button': '' },
    })(class MockButton {}),
    Card: Component({
      selector: 'div[mol-card]',
      standalone: true,
      inputs: ['style'],
      template: `<ng-content></ng-content>`,
      host: { 'data-card': '', '[style]': 'styleText()' },
    })(
      class MockCard {
        /** Inline style object (React camelCase). */
        style?: Record<string, string>
        /**
         * Serializes the inline style the way React writes it.
         * @returns The style attribute text, or null when there is none.
         */
        styleText(): string | null {
          if (!this.style) return null
          return Object.entries(this.style)
            .map(
              ([key, value]) => `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value}`,
            )
            .join('; ')
        }
      },
    ),
  }
})

const { PricingTable } = await import('../pricing-table.component.js')
import type { PricingFeature, PricingPlan } from '../types.js'

/** A mounted spec host: its DOM and teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [PricingTable],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div
      mol-pricing-table
      [plans]="p['plans']"
      [features]="p['features']"
      [className]="p['className']"
    ></div>`,
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

const mounted: Mounted[] = []

/**
 * Renders a {@link PricingTable} and returns the markup it produced.
 *
 * @param props - The table props.
 * @returns The rendered markup.
 */
async function render(props: Record<string, unknown>): Promise<string> {
  const m = await mount(props)
  mounted.push(m)
  return m.host.innerHTML
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const plans: PricingPlan[] = [
  { id: 'free', name: 'Free', price: '$0', interval: '/mo' },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    interval: '/mo',
    recommended: true,
    cta: { label: 'Upgrade', onClick: () => {} },
  },
]
const features: PricingFeature[] = [
  { label: 'Projects', values: { free: '3', pro: 'Unlimited' } },
  { label: 'API access', values: { free: false, pro: true }, groupHeading: 'Developer' },
]

describe('PricingTable', () => {
  it('renders each plan name and price', async () => {
    const markup = await render({ plans, features })
    expect(markup).toContain('Free')
    expect(markup).toContain('$0')
    expect(markup).toContain('Pro')
    expect(markup).toContain('$12')
  })

  it('renders the plan CTA button', async () => {
    const markup = await render({ plans, features })
    expect(markup).toContain('Upgrade')
    expect(markup).toContain('data-button=""')
  })

  it('highlights the recommended plan via an outline style', async () => {
    const markup = await render({ plans, features })
    expect(markup).toContain('outline: 2px solid currentColor')
  })

  it('renders each feature row label and per-plan values', async () => {
    const markup = await render({ plans, features })
    expect(markup).toContain('Projects')
    expect(markup).toContain('Unlimited')
    expect(markup).toContain('API access')
  })

  it('renders ✓ / — for boolean feature values', async () => {
    const markup = await render({ plans, features })
    expect(markup).toContain('✓')
    expect(markup).toContain('—')
  })

  it('renders a group heading row when a feature has one', async () => {
    const markup = await render({ plans, features })
    expect(markup).toContain('Developer')
  })

  it('forwards className', async () => {
    const markup = await render({ plans, features, className: 'pt-cls' })
    expect(markup).toContain('pt-cls')
  })

  it('keys every feature row, so React logs no missing-key warning', async () => {
    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })
    try {
      await render({ plans, features })
    } finally {
      spy.mockRestore()
    }
    expect(errors.filter((e) => e.includes('unique "key"'))).toEqual([])
  })
})
