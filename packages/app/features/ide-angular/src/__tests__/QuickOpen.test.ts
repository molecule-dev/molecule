// @vitest-environment jsdom
/**
 * `QuickOpen`'s project switch — a port of
 * `@molecule/app-ide-react/src/__tests__/QuickOpen.test.tsx` with the same test
 * name and the same behavioral assertions, mounted through Angular's own
 * `createApplication` under an http provider.
 *
 * `QuickOpen` fetches the project's file list and hands it to `QuickPicker`. It
 * can be re-pointed at another project without a remount, and the picker must
 * show its loading state — not the previous project's files — in the render that
 * carries the new project id. This test pins that reset and the reload.
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
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { QuickOpen } from '../components/quick-open.component.js'

/** One file per project, so a stale list is unmistakable. */
const FILES_BY_PROJECT: Record<string, string[]> = {
  p1: ['/workspace/p1.ts'],
  p2: ['/workspace/p2.ts'],
}

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

/** Serves each project its own single-file list. */
const get = vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<never>>>()

/**
 * A stub {@link HttpClient} whose `get` serves the per-project file lists.
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
const QuickOpenHost = Component({
  selector: 'mol-quick-open-host',
  standalone: true,
  imports: [QuickOpen],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-quick-open [projectId]="p['projectId']" [onFileOpen]="p['onFileOpen']" [onDismiss]="p['onDismiss']"></div>`,
})(
  class QuickOpenHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted picker, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof QuickOpenHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

const onFileOpen = vi.fn()
const onDismiss = vi.fn()

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onFileOpen.mockClear()
  onDismiss.mockClear()
  get.mockReset().mockImplementation(async (url: string) => {
    const match = /\/projects\/([^/]+)\/files-list$/.exec(url)
    if (!match) throw new Error(`unexpected GET ${url}`)
    return responseOf({ files: FILES_BY_PROJECT[match[1]] ?? [] })
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
 * Mounts the picker for one project.
 *
 * @param projectId - The project the picker lists files for.
 * @returns The mount.
 */
async function renderQuickOpen(projectId: string): Promise<Mounted> {
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
      provideTheme(createFakeThemeProvider('light', sink)),
      provideHttp(buildHttpClient()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof QuickOpenHost>> = createComponent(QuickOpenHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { projectId, onFileOpen, onDismiss }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return current
}

/**
 * Re-points the picker at another project, as React's `rerender` does.
 *
 * @param mounted - The mount.
 * @param projectId - The new project id.
 * @returns Resolves once the view rendered it.
 */
async function setProject(mounted: Mounted, projectId: string): Promise<void> {
  mounted.ref.instance.p = { projectId, onFileOpen, onDismiss }
  mounted.ref.changeDetectorRef.markForCheck()
  mounted.appRef.tick()
}

describe('QuickOpen project switch', () => {
  it('shows loading, not the previous project’s files, when the project id changes', async () => {
    const mounted = await renderQuickOpen('p1')
    const { container } = mounted
    // Wait for p1's row.
    for (let i = 0; i < 20; i++) {
      if (container.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]')) break
      await flush()
    }
    expect(
      container.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
    ).not.toBeNull()

    await setProject(mounted, 'p2')

    // The render carrying the new project id is already in the loading state.
    expect(container.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]')).toBeNull()
    expect(container.textContent).toContain('Loading')

    for (let i = 0; i < 20; i++) {
      if (container.querySelector('[data-mol-id="quick-picker-item-/workspace/p2.ts"]')) break
      await flush()
    }
    expect(
      container.querySelector('[data-mol-id="quick-picker-item-/workspace/p2.ts"]'),
    ).not.toBeNull()
    expect(container.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]')).toBeNull()
  })
})
