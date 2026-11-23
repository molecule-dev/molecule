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
  // Partial: everything else, the context functions included, is the real module (this file
  // tests the lookup).
  const real = await vi.importActual<Record<string, unknown>>('@molecule/app-ui-angular')
  return {
    ...real,
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
const { LogOutDeleteSection } = await import('../log-out-delete-section.component.js')

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
  component: Type<unknown> | Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: `mol-settings-spec-host-${hosts++}`,
    standalone: true,
    imports: [component].flat(),
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

const { SettingsContainer } = await import('../settings-container.component.js')

describe('LogOutDeleteSection in a SettingsContainer', () => {
  it('closes the panel through the container it renders in, with its own host out of the page', async () => {
    const close = vi.fn()
    const m = await mount(
      '<div mol-settings-container [onClose]="p[\'close\']"><mol-log-out-delete-section></mol-log-out-delete-section></div>',
      [SettingsContainer as Type<unknown>, LogOutDeleteSection as Type<unknown>],
      { close },
    )
    expect(m.host.querySelector('mol-log-out-delete-section')).toBeNull()
    ;(m.host.querySelector('[data-mol-id="user-menu-logout"]') as HTMLElement).click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(close).toHaveBeenCalledTimes(1)
  })
})
