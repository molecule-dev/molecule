// @vitest-environment jsdom
/**
 * `ShareLinkManager`'s `refreshSignal` — a port of
 * `@molecule/app-ide-react/src/__tests__/ShareLinkManager.refresh-signal.test.tsx`
 * with the same test name and the same behavioral assertions, mounted through
 * Angular's own `createApplication` with the theme and http providers.
 *
 * The host bumps `refreshSignal` when another member of the project created or
 * revoked the public link, and the open panel must reload the list in place (no
 * remount) so it reflects that change.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideHttp, provideI18n, provideTheme } from '@molecule/app-angular'
import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ShareLinkManager } from '../components/share-link-manager.component.js'

const OLD_LINK: ShareLinkResult = { id: 'l1', slug: 'old-slug', role: 'viewer' }
const NEW_LINK: ShareLinkResult = { id: 'l2', slug: 'new-slug', role: 'viewer' }

/** What the next `GET /projects/:id/shares` answers with. */
let serverLinks: ShareLinkResult[] = []
/** Every shares URL the manager requested. */
const requestedUrls: string[] = []

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/**
 * A full {@link HttpResponse} for a stub to resolve with.
 *
 * @param data - The response body.
 * @returns The response.
 */
function responseOf(data: unknown): HttpResponse<never> {
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/** Serves the current {@link serverLinks} for the shares list. */
const get = vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<never>>>()

/**
 * A stub {@link HttpClient}.
 *
 * @returns The client.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input.
 */
const ShareLinkManagerHost = Component({
  selector: 'mol-share-link-manager-host',
  standalone: true,
  imports: [ShareLinkManager],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-share-link-manager [projectId]="p['projectId']" [refreshSignal]="p['refreshSignal']"></div>`,
})(
  class ShareLinkManagerHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted manager, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ShareLinkManagerHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setProvider(createSimpleI18nProvider('en'))
  serverLinks = [OLD_LINK]
  requestedUrls.length = 0
  get.mockReset().mockImplementation(async (url: string) => {
    requestedUrls.push(url)
    return responseOf({ data: serverLinks })
  })
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Mounts the manager with a refresh signal.
 *
 * @param refreshSignal - The host's signal.
 * @returns The mount.
 */
async function renderManager(refreshSignal: number): Promise<Mounted> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideI18n(createSimpleI18nProvider('en')),
      provideTheme(createFakeThemeProvider('dark', sink)),
      provideHttp(buildHttpClient()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ShareLinkManagerHost>> = createComponent(
    ShareLinkManagerHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { projectId: 'p1', refreshSignal }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return current
}

/**
 * Bumps the host's signal, as React's `rerender` does.
 *
 * @param mounted - The mount.
 * @param refreshSignal - The new signal.
 * @returns Resolves once the view rendered it.
 */
async function bumpSignal(mounted: Mounted, refreshSignal: number): Promise<void> {
  mounted.ref.instance.p = { projectId: 'p1', refreshSignal }
  mounted.ref.changeDetectorRef.markForCheck()
  mounted.appRef.tick()
}

describe('ShareLinkManager refreshSignal', () => {
  it('reloads the link list in place when the host bumps the signal', async () => {
    const mounted = await renderManager(0)
    const { container } = mounted
    for (let i = 0; i < 20; i++) {
      if (container.querySelector('[data-mol-id="share-link-url"]')) break
      await flush()
    }
    const field = container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement
    expect(field).not.toBeNull()
    expect(field.value).toMatch(/\/share\/old-slug$/)
    expect(requestedUrls).toHaveLength(1)

    // Another member revoked the old link and created a new one; the host's
    // broadcast bumps the signal.
    serverLinks = [NEW_LINK]
    await bumpSignal(mounted, 1)

    for (let i = 0; i < 20; i++) {
      const value = (container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement)
        .value
      if (/\/share\/new-slug$/.test(value)) break
      await flush()
    }
    expect(
      (container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement).value,
    ).toMatch(/\/share\/new-slug$/)
    expect(requestedUrls).toHaveLength(2)
    expect(requestedUrls[1]).toContain('/projects/p1/shares')
  })
})
