// @vitest-environment jsdom

/**
 * ScriptsCard — the `/scripts` browser — rendered for real: a port of
 * `@molecule/app-ide-react/src/__tests__/ScriptsCard.test.tsx` with the same
 * test names and the same assertions, mounted through Angular's own
 * `createApplication` under an http provider (the card fetches its own
 * listing and runs).
 *
 * ScriptsCard must let a parameterized script collect its typed options before
 * running (SYN1-params): a plain script runs on the first Run click; a script
 * that declares params opens an inline option form on Run instead, keeps Run
 * disabled until every required option has a value, and only then POSTs the
 * run with `{ params }`.
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
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { provideHttp } from '@molecule/app-angular'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ScriptsCard } from '../parts/scripts-card.component.js'

const PARAM_SCRIPT: ScriptInfo = {
  name: 'setup-ci',
  description: 'Add a CI/CD workflow.',
  createdAt: '',
  builtin: true,
  params: [
    {
      name: 'platform',
      type: 'enum',
      description: 'Which CI',
      required: true,
      options: ['github', 'gitlab'],
    },
  ],
}

const PLAIN_SCRIPT: ScriptInfo = {
  name: 'run-tests',
  description: 'Run tests',
  createdAt: '2026-06-01T00:00:00Z',
}

/**
 * A full {@link HttpResponse} for a stub to resolve with.
 *
 * @param data - The response body.
 * @returns The response.
 */
function responseOf(data: unknown): HttpResponse<never> {
  // The payload stands in for the server's reply; the client contract is
  // caller-generic, which no concrete payload can prove, so the stub types it
  // never and the interface widens it to the caller's T.
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/** The observable POST — the only write the card makes. */
const post = vi.fn<
  (url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>
>(async () => responseOf({ stdout: 'ok', stderr: '', exitCode: 0 }))

/**
 * An http client that lists the two scripts and records run POSTs.
 *
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: async (): Promise<HttpResponse<never>> =>
      responseOf({ scripts: [PARAM_SCRIPT, PLAIN_SCRIPT] }),
    post,
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
  template: `<div mol-scripts-card [projectId]="p['projectId']" [initialQuery]="p['initialQuery']" [isLight]="p['isLight']" [agentName]="p['agentName']" [embedded]="p['embedded']"></div>`,
})(
  class ScriptsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted card, with the recorded calls and its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ScriptsCardHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  post.mockClear()
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

/**
 * Waits for a `data-mol-id` element to exist (querySelector alone never
 * retries), the way React's `findByMolId` helper does.
 *
 * @param container - The render container.
 * @param id - The `data-mol-id` to wait for.
 * @returns The element.
 */
async function findByMolId(container: HTMLElement, id: string): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const el = container.querySelector(`[data-mol-id="${id}"]`)
    expect(el, `expected [data-mol-id="${id}"] to render`).not.toBeNull()
    return el as HTMLElement
  })
}

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
 * Render the card the way ChatPanel does, under the http provider it needs.
 *
 * @returns The container and the recorded run POSTs.
 */
async function renderCard(): Promise<{ container: HTMLElement; post: Mock }> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideHttp(buildHttpClient())],
  })
  const ref: ComponentRef<InstanceType<typeof ScriptsCardHost>> = createComponent(ScriptsCardHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    projectId: 'p1',
    initialQuery: '',
    isLight: true,
    agentName: undefined,
    embedded: undefined,
  }
  ref.changeDetectorRef.detectChanges()
  current = { appRef, ref, container }
  await flush()
  return { container, post }
}

describe('ScriptsCard parameterized run', () => {
  it('runs a plain script immediately on Run', async () => {
    const { container, post: postMock } = await renderCard()
    const runBtn = (await findByMolId(container, 'script-run-run-tests')) as HTMLButtonElement
    runBtn.click()
    await flush()
    await vi.waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    // Ran the right endpoint with no params body.
    expect(postMock.mock.calls[0]?.[0]).toContain('/scripts/run-tests/run')
    expect(postMock.mock.calls[0]?.[1]).toBeUndefined()
  })

  it('opens an option form for a param script and runs with the chosen values', async () => {
    const { container, post: postMock } = await renderCard()
    const runBtn = (await findByMolId(container, 'script-run-setup-ci')) as HTMLButtonElement

    // First click opens the form — it does NOT run yet.
    runBtn.click()
    await flush()
    const form = await findByMolId(container, 'script-options-setup-ci')
    expect(postMock).not.toHaveBeenCalled()

    // Required enum starts empty → the form's Run is disabled.
    const formRun = Array.from(form.querySelectorAll('button')).find(
      (button) => button.textContent === 'Run',
    ) as HTMLButtonElement
    expect(formRun.disabled).toBe(true)

    // Choose a value, then Run posts with the params.
    const select = form.querySelector(
      '[data-mol-id="script-option-setup-ci-platform"]',
    ) as HTMLSelectElement
    select.value = 'github'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await flush()
    expect(formRun.disabled).toBe(false)

    formRun.click()
    await flush()
    await vi.waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    expect(postMock.mock.calls[0]?.[0]).toContain('/scripts/setup-ci/run')
    expect(postMock.mock.calls[0]?.[1]).toEqual({ params: { platform: 'github' } })
  })
})
