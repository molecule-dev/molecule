// @vitest-environment jsdom
/**
 * DOM-placement tests for the settings-panel sections whose React root is a
 * fragment (a `<section>` plus modals, or nothing for an OAuth-only user):
 * those nodes render in the host's place and the host itself never reaches the
 * page.
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

// The ClassMap token proxy the package's other unit tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const callable = new Set(['sp', 'stack', 'textSize', 'fontWeight', 'maxW', 'flex'])
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
        if (callable.has(token)) return (..._args: unknown[]) => token
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The UI components the sections compose, as passthrough elements.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, EventEmitter } = await import('@angular/core')
  const stub = (selector: string, inputs: string[], outputs: string[] = []): unknown =>
    Component({
      selector,
      standalone: true,
      inputs,
      ...(outputs.length ? { outputs } : {}),
      template: '<ng-content></ng-content>',
    })(
      class Stub {
        /** Close request, for the Modal stub. */
        readonly close = new EventEmitter<unknown>()
      },
    )
  return {
    Alert: stub('div[mol-alert]', ['status', 'className']),
    Button: stub('button[mol-button]', [
      'variant',
      'size',
      'color',
      'className',
      'fullWidth',
      'loading',
    ]),
    ConfirmButton: stub('button[mol-confirm-button]', [
      'variant',
      'size',
      'onConfirm',
      'className',
    ]),
    Flex: stub('div[mol-flex]', ['align', 'justify', 'gap', 'className']),
    Input: stub('div[mol-input]', ['id', 'type', 'value', 'required', 'autocomplete']),
    Modal: stub('mol-modal', ['open', 'title', 'size', 'closeLabel', 'showCloseButton'], ['close']),
    Spinner: stub('div[mol-spinner]', []),
  }
})

// The settings-panel context a section resolves from an ancestor.
vi.mock('../context.js', () => ({
  useSettingsPanelContext: () => ({ onClose: () => undefined }),
}))

// The current user the auth hook reports (mutable, so a test can toggle OAuth-only).
const h = await vi.hoisted(async () => {
  const { signal } = await import('@angular/core')
  return {
    user: signal({ id: 'u', name: 'U', email: 'u@example.test' } as Record<string, unknown>),
  }
})

// The binding hooks, with the seams the sections read overridden.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({
    // The real useAuth().user is a signal; a plain getter never re-checks an OnPush view.
    user: h.user,
    state: () => ({ initialized: true }),
    logout: async () => undefined,
    changePassword: async () => undefined,
  }),
  useChangePassword: () => ({
    get status(): string {
      return 'idle'
    },
    get error(): null {
      return null
    },
    changePassword: async () => undefined,
    reset: () => undefined,
  }),
  useHttpClient: () => ({
    get: () => new Promise(() => undefined),
    post: async () => ({}),
    delete: async () => ({}),
  }),
  useRouter: () => ({
    location: () => ({ pathname: '/', search: '' }),
    navigate: () => undefined,
  }),
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

const { provideDomPlacement } = await import('@molecule/app-angular')
const { AuthSection } = await import('../auth-section.component.js')
const { LogOutDeleteSection } = await import('../log-out-delete-section.component.js')
const { TiersUpgradeSection } = await import('../tiers-upgrade-section.component.js')

/** What a mount hands back to the test. */
interface Mounted {
  /** The spec host holding the component. */
  host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  set(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/** Hosts awaiting teardown. */
const mounted: Mounted[] = []

/** A counter giving every spec host a distinct selector (Angular warns on duplicates). */
let hosts = 0

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
  document.body.innerHTML = ''
  h.user.set({ id: 'u', name: 'U', email: 'u@example.test' })
})

/**
 * Mounts one component between two sibling elements through a JIT host.
 *
 * @param template - The host template (it reads props as `p['key']`).
 * @param component - The component class under test.
 * @param props - The props the template starts with.
 * @returns The mounted host and the props setter.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: `mol-settings-spec-host-${hosts++}`,
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
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
  const m: Mounted = {
    host,
    set: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m)
  return m
}

describe('AuthSection', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-auth-section></mol-auth-section><i>b</i>`,
      AuthSection as Type<unknown>,
    )
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    // React's fragment (the <section> plus two portalled modals) renders in place; no host.
    expect(tags()[0]).toBe('i')
    expect(tags()).toContain('section')
    expect(m.host.querySelector('mol-auth-section')).toBeNull()
    // OAuth-only user: React renders nothing, so the section itself is gone (the
    // stub modals here keep their hosts; the real Modal self-portals away).
    h.user.set({ id: 'u', oauthServer: 'google' })
    m.set({})
    expect(m.host.querySelector('section')).toBeNull()
    expect(tags()).toEqual(['i', 'i'])
    h.user.set({ id: 'u' })
    m.set({})
    expect(tags()).toContain('section')
    expect(m.host.querySelector('mol-auth-section')).toBeNull()
  })
})

describe('LogOutDeleteSection', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-log-out-delete-section></mol-log-out-delete-section><i>b</i>`,
      LogOutDeleteSection as Type<unknown>,
    )
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    expect(tags()[0]).toBe('i')
    expect(tags()).toContain('section')
    expect(m.host.querySelector('mol-log-out-delete-section')).toBeNull()
  })
})

describe('TiersUpgradeSection', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-tiers-upgrade-section></mol-tiers-upgrade-section><i>b</i>`,
      TiersUpgradeSection as Type<unknown>,
    )
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    expect(tags()[0]).toBe('i')
    expect(tags()).toContain('section')
    expect(m.host.querySelector('mol-tiers-upgrade-section')).toBeNull()
  })
})
