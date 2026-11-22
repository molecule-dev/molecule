// @vitest-environment jsdom
/**
 * Unit tests of `PlanUpdated` — the port of
 * `@molecule/app-plan-updated-page-react`'s own behaviour suite. The React
 * suite renders the component with mocked UI dependencies and asserts the
 * markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  computed,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseAuth, mockUseVerifyPaymentReturn } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseVerifyPaymentReturn: vi.fn(),
}))

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The binding hooks the React tests mock, in Angular's shape (signals for the
// value fields), plus the router `Link` directive's observable part: the href.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const { Directive } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useAuth: mockUseAuth,
    useTranslation: () => ({
      t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? key,
    }),
    useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
    Link: Directive({
      selector: 'a[molLink]',
      standalone: true,
      inputs: ['molLink', 'replace', 'state'],
      host: { '[attr.href]': 'molLink' },
    })(
      class MockLink {
        /** The destination. */
        molLink = ''
        /** Replace the current entry. */
        replace?: boolean
        /** State for the new entry. */
        state?: unknown
      },
    ),
  }
})

// The UI markers the React tests mock: one attribute-selector component per
// element the page uses, so the host element IS React's element.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size', 'loading', 'loadingText', 'fullWidth', 'className'],
      template: `<ng-content></ng-content>`,
    })(class MockButton {}),
    Flex: Component({
      selector: 'div[mol-flex]',
      standalone: true,
      inputs: ['direction', 'justify', 'align', 'wrap', 'gap', 'className'],
      template: `<ng-content></ng-content>`,
    })(class MockFlex {}),
    Icon: Component({
      selector: 'svg[mol-icon-root]',
      standalone: true,
      inputs: ['name', 'size', 'className', 'ariaHidden: aria-hidden'],
      host: { 'data-icon': '' },
      template: '',
    })(class MockIcon {}),
    Spinner: Component({
      selector: 'div[mol-spinner]',
      standalone: true,
      inputs: ['size', 'color', 'label', 'className'],
      host: { 'data-spinner': '' },
      template: '',
    })(class MockSpinner {}),
  }
})

const { PlanUpdated } = await import('../plan-updated.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The host template: the component element with every prop bound. */
const TEMPLATE = `<mol-plan-updated [messageKey]="p['messageKey']" [messageDefault]="p['messageDefault']" [thankYouKey]="p['thankYouKey']" [thankYouDefault]="p['thankYouDefault']" [actionKey]="p['actionKey']" [actionDefault]="p['actionDefault']" [actionHref]="p['actionHref']" [provider]="p['provider']" [verify]="p['verify']"></mol-plan-updated>`

/**
 * Mounts the component through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props the template binds.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [PlanUpdated as Type<unknown>],
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

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('PlanUpdated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ state: computed(() => ({ initialized: true })) })
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: signal('idle'),
      isReturn: computed(() => false),
      provider: computed(() => null),
      transactionId: computed(() => null),
      error: signal(null),
      retry: vi.fn(),
    })
  })

  it('renders the confirmation on a normal visit', async () => {
    const m = await mount()
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-mol-id="plan-updated-page"')
    expect(m.host.innerHTML).toContain('Thank you!')
  })

  // Until the purchase is confirmed server-side the plan is NOT granted, so a
  // thank-you at this point would be a lie.
  it('shows the spinner while the purchase is being confirmed', async () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: signal('verifying'),
      isReturn: computed(() => true),
      provider: computed(() => 'stripe'),
      transactionId: computed(() => 'cs_live_1'),
      error: signal(null),
      retry: vi.fn(),
    })
    const m = await mount()
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-spinner')
    expect(m.host.innerHTML).not.toContain('Thank you!')
  })

  it('offers a retry when confirmation fails', async () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: signal('failed'),
      isReturn: computed(() => true),
      provider: computed(() => 'stripe'),
      transactionId: computed(() => 'cs_live_1'),
      error: signal(new Error('502')),
      retry: vi.fn(),
    })
    const m = await mount()
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-mol-id="plan-updated-retry"')
    expect(m.host.innerHTML).not.toContain('Thank you!')
  })

  it('skips verification when the app opts out', async () => {
    const m = await mount({ verify: false })
    mounted.push(m)
    expect(mockUseVerifyPaymentReturn).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })
})
