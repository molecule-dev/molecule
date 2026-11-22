// @vitest-environment jsdom
/**
 * ReportModal — mounted standalone, with no ChatPanel in the tree: a port of
 * `@molecule/app-ide-react/src/__tests__/report-share-standalone.test.tsx`'s
 * ReportModal suite with the same test names and the same behavioral
 * assertions, mounted as a real Solid root under `MoleculeProvider` with the
 * theme and http services (the only providers the modal needs).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FullRequestConfig, HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

// Deliberately the package BARREL, not the component paths — a host has no
// other way in, so this import IS half the contract under test.
import type { ReportModalProps } from '../components/ReportModal.jsx'
import { formatReportConfirmation, ReportModal } from '../index.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The observable POST — the only capability the modal needs from its host. */
const post =
  vi.fn<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>>()

/**
 * An {@link HttpClient} whose `post` is observable — the only capability the
 * modal needs from its host.
 *
 * @returns A stub HTTP client.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
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
 * A full {@link HttpResponse} for the stub POST to resolve with.
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
    config: { method: 'POST', url: '' } as FullRequestConfig,
  }
}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  post.mockReset()
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/** Lets Solid's queued effects settle before the assertions. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Mount the modal standalone, the way a host does — the ONLY providers it
 * needs are theme and http, deliberately no workspace/editor/chat service.
 *
 * @param props - The modal's props.
 * @returns The container.
 */
function renderModal(props: Omit<ReportModalProps, 'projectId'>): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider()} http={buildHttpClient()}>
        <ReportModal projectId="p1" {...props} />
      </MoleculeProvider>
    ),
    container,
  )
  return container
}

/** Types like a user: the value, then a bubbling `input` event. */
async function type(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
): Promise<void> {
  if (!el) throw new Error('missing element to type into')
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await settle()
}

describe('ReportModal works standalone, with no ChatPanel in the tree', () => {
  it('is reachable from the package barrel and POSTs the report to the platform API', async () => {
    expect(typeof ReportModal).toBe('function')
    post.mockResolvedValue(responseOf({ ok: true, id: 'r1', url: 'https://issues.example/1' }))
    const onSubmitted = vi.fn()

    const container = renderModal({ conversationId: 'c1', onClose: () => {}, onSubmitted })

    expect(molId(container, 'report-modal')).not.toBeNull()

    await type(molId(container, 'report-title') as HTMLInputElement, 'Preview stays blank')
    await type(
      molId(container, 'report-description') as HTMLTextAreaElement,
      'It never comes back after hibernating.',
    )
    ;(molId(container, 'report-submit') as HTMLButtonElement).click()
    await settle()
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    // The platform report route, carrying the conversation for context.
    expect(post.mock.calls[0]?.[0]).toBe('/projects/p1/report?conversationId=c1')
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      title: 'Preview stays blank',
      description: 'It never comes back after hibernating.',
    })
    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1))
  })

  it('hands the outcome to the host rather than showing its own success state', async () => {
    post.mockResolvedValue(responseOf({ ok: true, id: 'r1', url: 'https://issues.example/1' }))
    const onSubmitted = vi.fn()
    const container = renderModal({ onClose: () => {}, onSubmitted })
    await type(molId(container, 'report-title') as HTMLInputElement, 't')
    await type(molId(container, 'report-description') as HTMLTextAreaElement, 'd')
    ;(molId(container, 'report-submit') as HTMLButtonElement).click()
    await settle()

    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1))
    // Nothing in the modal itself reports success — a host that mounts it MUST
    // surface the confirmation, which is why the formatter is exported too.
    expect(container.textContent).not.toContain('Thanks')
    expect(formatReportConfirmation(onSubmitted.mock.calls[0]?.[0]).defaultValue).toContain(
      'Thanks',
    )
  })
})
