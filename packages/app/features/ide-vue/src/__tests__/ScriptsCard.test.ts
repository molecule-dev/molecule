// @vitest-environment jsdom

/**
 * ScriptsCard — the `/scripts` browser — rendered for real: a port of
 * `@molecule/app-ide-react/src/__tests__/ScriptsCard.test.tsx` with the same
 * test names and the same assertions, mounted through Vue's own `createApp`
 * under an http provider (the card fetches its own listing and runs).
 *
 * ScriptsCard must let a parameterized script collect its typed options before
 * running (SYN1-params): a plain script runs on the first Run click; a script
 * that declares params opens an inline option form on Run instead, keeps Run
 * disabled until every required option has a value, and only then POSTs the
 * run with `{ params }`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { HttpKey } from '@molecule/app-vue'

import { ScriptsCard } from '../parts/ScriptsCard.js'

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

const post = vi.fn<
  (url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>
>(async () => responseOf({ stdout: 'ok', stderr: '', exitCode: 0 }))

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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  post.mockClear()
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders {@link ScriptsCard} inside the http provider it needs (i18n is
 * process-global), the way the React reference wraps its card in an
 * HttpProvider.
 *
 * @returns The render host and the recorded run POSTs.
 */
function renderCard(): { container: HTMLElement; post: Mock } {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(ScriptsCard, { projectId: 'p1', initialQuery: '', isLight: true }),
    }),
  )
  app.provide(HttpKey, buildHttpClient())
  app.mount(host)
  mounted.app = app
  return { container: host, post }
}

/**
 * Waits for a `data-mol-id` element to exist (querySelector alone never
 * retries), the way React's `findByMolId` helper does.
 *
 * @param container - The render host.
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

/** Lets Vue flush the re-render a DOM event queued. */
async function flush(): Promise<void> {
  await nextTick()
}

describe('ScriptsCard parameterized run', () => {
  it('runs a plain script immediately on Run', async () => {
    const { container, post: postMock } = renderCard()
    const runBtn = (await findByMolId(container, 'script-run-run-tests')) as HTMLButtonElement
    runBtn.click()
    await flush()
    await vi.waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    // Ran the right endpoint with no params body.
    expect(postMock.mock.calls[0]?.[0]).toContain('/scripts/run-tests/run')
    expect(postMock.mock.calls[0]?.[1]).toBeUndefined()
  })

  it('opens an option form for a param script and runs with the chosen values', async () => {
    const { container, post: postMock } = renderCard()
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
