// @vitest-environment jsdom
/**
 * Unit tests for the Angular `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary.test.tsx`:
 * the same behavioral assertions, rendered through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) and asserted on the markup the component produces.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React tests use.
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
import type * as AppLogger from '@molecule/app-logger'
import { error as logError } from '@molecule/app-logger'

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

// No translations registered: the fallback renders its English default value.
setProvider(createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: {} }]))

const { RootErrorBoundary } = await import('../root-error-boundary.component.js')

/** A child that fails to render, so the boundary shows its recovery alert. */
const Broken = Component({
  selector: 'mol-broken',
  standalone: true,
  template: `<span>never rendered</span>`,
})(
  class BrokenComponent {
    constructor() {
      throw new Error('render failed')
    }
  },
)

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param extra - Further standalone classes the host template uses (`mol-broken`).
 * @returns The mounted host.
 */
/** Spec hosts mounted so far: each gets its own host attribute (NG0912 id collision). */
let specHostCount = 0

async function mount(
  template: string,
  component: Type<unknown>,
  extra: Type<unknown>[] = [],
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component, ...extra],
    changeDetection: ChangeDetectionStrategy.Default,
    host: { 'data-parity-host': String(++specHostCount) },
    template,
  })(class SpecHost {})
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
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
afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  vi.restoreAllMocks()
})

describe('RootErrorBoundary', () => {
  it('renders its children when no error is thrown', async () => {
    const m = await mount(
      `<mol-root-error-boundary><main data-app>app content</main></mol-root-error-boundary>`,
      RootErrorBoundary as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-app')
    expect(m.host.innerHTML).toContain('app content')
  })

  it('derives the error state from a thrown error', async () => {
    // Angular reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const m = await mount(
      `<mol-root-error-boundary [content]="contentTpl"><ng-template #contentTpl><mol-broken /></ng-template></mol-root-error-boundary>`,
      RootErrorBoundary as Type<unknown>,
      [Broken],
    )
    expect(m.host.innerHTML).not.toContain('never rendered')
    expect(m.host.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('reports the caught render error through the logger once', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(logError).mockClear()
    await mount(
      `<mol-root-error-boundary [content]="contentTpl"><ng-template #contentTpl><mol-broken /></ng-template></mol-root-error-boundary>`,
      RootErrorBoundary as Type<unknown>,
      [Broken],
    )
    expect(vi.mocked(logError)).toHaveBeenCalledTimes(1)
    const [reported] = vi.mocked(logError).mock.calls[0]!
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).message).toBe('render failed')
  })

  it('renders the localized recovery alert once in the errored state', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const m = await mount(
      `<mol-root-error-boundary [content]="contentTpl"><ng-template #contentTpl><mol-broken /></ng-template></mol-root-error-boundary>`,
      RootErrorBoundary as Type<unknown>,
      [Broken],
    )
    const alert = m.host.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).toBe('An unexpected error occurred.')
    expect(alert?.className).toBe('flex sp')
    expect(alert?.querySelector('p')?.className).toBe('textSize fontWeight')
  })
})
