// @vitest-environment jsdom
/**
 * `ScriptsCard`'s project switch — a port of
 * `@molecule/app-ide-react/src/__tests__/ScriptsCard.project-switch.test.tsx`
 * with the same test name and the same behavioral assertions, mounted through
 * Angular's own `createApplication` under an http provider.
 *
 * `ScriptsCard` is mounted with one `projectId` and can be re-pointed at another
 * without a remount (the IDE reuses the card). The card resets to its loading
 * state in the render that carries the new project id, so the previous
 * project's scripts are never painted under the new one — this test pins that
 * reset and the reload that follows it.
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
import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ScriptsCard } from '../parts/scripts-card.component.js'

/** One script per project, so a stale list is unmistakable. */
const SCRIPTS_BY_PROJECT: Record<string, ScriptInfo[]> = {
  p1: [{ name: 'p1-only', description: 'Belongs to p1', createdAt: '' }],
  p2: [{ name: 'p2-only', description: 'Belongs to p2', createdAt: '' }],
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

/** Serves each project its own single-script list. */
const get = vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<never>>>()

/**
 * A stub {@link HttpClient} whose `get` serves the per-project script lists.
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
 * The JIT host the way the conformance kit mounts the card: its template binds
 * every input.
 */
const ScriptsCardHost = Component({
  selector: 'mol-scripts-card-host',
  standalone: true,
  imports: [ScriptsCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-scripts-card [projectId]="p['projectId']" [initialQuery]="p['initialQuery']" [isLight]="p['isLight']"></div>`,
})(
  class ScriptsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted card, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ScriptsCardHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  get.mockReset().mockImplementation(async (url: string) => {
    const match = /\/projects\/([^/]+)\/scripts$/.exec(url)
    if (!match) throw new Error(`unexpected GET ${url}`)
    return responseOf({ scripts: SCRIPTS_BY_PROJECT[match[1]] ?? [] })
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
 * Mounts the card for one project.
 *
 * @param projectId - The project the card lists scripts for.
 * @returns The mount.
 */
async function renderCard(projectId: string): Promise<Mounted> {
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
  const ref: ComponentRef<InstanceType<typeof ScriptsCardHost>> = createComponent(ScriptsCardHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { projectId, initialQuery: '', isLight: true }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return current
}

/**
 * Re-points the card at another project, as React's `rerender` does.
 *
 * @param mounted - The mount.
 * @param projectId - The new project id.
 * @returns Resolves once the view rendered it.
 */
async function setProject(mounted: Mounted, projectId: string): Promise<void> {
  mounted.ref.instance.p = { projectId, initialQuery: '', isLight: true }
  mounted.ref.changeDetectorRef.markForCheck()
  mounted.appRef.tick()
}

describe('ScriptsCard project switch', () => {
  it('drops the previous project’s rows and reloads when the project id changes', async () => {
    const mounted = await renderCard('p1')
    const { container } = mounted
    for (let i = 0; i < 20; i++) {
      if (container.querySelector('[data-mol-id="script-row-p1-only"]')) break
      await flush()
    }
    expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).not.toBeNull()

    await setProject(mounted, 'p2')

    // The render that carries the new project id already shows the loading
    // state: p1's row is gone, not painted one frame under p2.
    expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
    expect(container.textContent).toContain('Loading scripts')

    for (let i = 0; i < 20; i++) {
      if (container.querySelector('[data-mol-id="script-row-p2-only"]')) break
      await flush()
    }
    expect(container.querySelector('[data-mol-id="script-row-p2-only"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
  })
})
