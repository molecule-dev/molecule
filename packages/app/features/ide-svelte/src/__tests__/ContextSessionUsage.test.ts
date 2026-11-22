// @vitest-environment jsdom
/**
 * `ContextSessionUsage` rendered for real: the session-and-allowance rows'
 * every state — the empty and loading states, a failed refresh, the loaded
 * breakdown with window and reset time, streaming, unmetered, the clamped
 * and error-red remainder, a locale switch — and the `useContextSessionUsage`
 * hook's load/refresh/failure loop. (The React package carries no unit test
 * of its own for the component — its states are pinned by the conformance
 * kit's `ContextSessionUsage` cases — so these assert the same contract at
 * the component boundary here.) Mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ContextSessionUsageProps, SessionUsage } from '../hooks/useContextSessionUsage.js'
import HookHost from './ContextSessionUsageHookHost.svelte'
import Host from './ContextSessionUsageHost.svelte'

/** 2026-11-20 02:45 UTC: the reset moment the loaded case renders. */
const RESET_AT = Date.UTC(2026, 10, 20, 2, 45)

/** The loaded payload most cases share: 11.0K prompt, 1.2M output, 40% spent. */
const USAGE: SessionUsage = {
  inputTokens: 4_500,
  outputTokens: 1_200_000,
  cacheReadInputTokens: 6_000,
  cacheCreationInputTokens: 500,
  allowancePercent: 40,
  allowanceWindow: 'billing-period',
  allowanceResetAt: RESET_AT,
}

/** The mount alive right now, if any. */
let instance: ReturnType<typeof mount> | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (instance) {
    unmount(instance)
    instance = null
  }
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** The component root's two figures, in row order. */
function figures(root: HTMLElement): [HTMLElement, HTMLElement] {
  const strongs = root.querySelectorAll('strong')
  return [strongs[0] as HTMLElement, strongs[1] as HTMLElement]
}

/** Tears the current mount down. */
function unmountCurrent(): void {
  if (instance) {
    unmount(instance)
    instance = null
  }
  document.body.innerHTML = ''
}

/**
 * Mounts the rows with the given props.
 *
 * @param props - The props (`data`, `loading`, `failed`) and the client.
 * @returns The root element.
 */
function renderUsage(props: Partial<ContextSessionUsageProps> & { http: HttpClient }): HTMLElement {
  unmountCurrent()
  container = document.createElement('div')
  document.body.appendChild(container)
  instance = mount(Host, {
    target: container,
    props: {
      http: props.http,
      data: props.data ?? null,
      loading: props.loading ?? false,
      failed: props.failed ?? false,
    },
  })
  flushSync()
  return container.querySelector('div[aria-live="polite"]') as HTMLElement
}

/** The mounted component root (the rows' `aria-live` container). */
const currentRoot = (): HTMLElement =>
  container!.querySelector('div[aria-live="polite"]') as HTMLElement

describe('ContextSessionUsage rows', () => {
  it('nothing loaded shows Unavailable on both rows', () => {
    const root = renderUsage({ http: fakeHttpClient(async () => usageResponse(USAGE)) })
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('Unavailable')
    expect(allowance.textContent).toBe('Unavailable')
    expect(root.textContent).toContain('Current session')
    expect(root.textContent).toContain('Overall AI allowance')
    expect(root.textContent).not.toContain('input (incl. cache)')
  })

  it('loading shows Loading… on both rows', () => {
    const root = renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      loading: true,
    })
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('Loading…')
    expect(allowance.textContent).toBe('Loading…')
  })

  it('a failed refresh states the error and keeps the totals unavailable', () => {
    const root = renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      failed: true,
    })
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('Unavailable')
    expect(allowance.textContent).toBe('Unavailable')
    expect(root.textContent).toContain('Usage could not be refreshed. Open details to retry.')
    // A stale payload changes nothing: the failure wins.
    const stale = renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      data: USAGE,
      failed: true,
    })
    expect(figures(stale)[0].textContent).toBe('Unavailable')
    expect(stale.textContent).not.toContain('1.2M tokens')
  })

  it('a payload shows the session and allowance rows', () => {
    const root = renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      data: USAGE,
    })
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('1.2M tokens')
    expect(allowance.textContent).toBe('~60% remaining')
    expect(root.textContent).toContain('11.0K input (incl. cache) · 1.2M output')
    expect(root.textContent).toContain('Shared across the project owner’s projects.')
    expect(root.textContent).toContain('Monthly allowance.')
    expect(root.textContent).toContain('Resets Nov 20, 02:45 AM.')
  })

  it('a streaming payload marks the session line live', () => {
    const root = renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      data: { ...USAGE, allowancePercent: 55, streaming: true },
    })
    expect(root.textContent).toContain('11.0K input (incl. cache) · 1.2M output · Live')
    expect(figures(root)[1].textContent).toBe('~45% remaining')
  })

  it('unmetered reads Unmetered and claims no reset', () => {
    const root = renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      data: { ...USAGE, allowancePercent: null },
    })
    const allowance = figures(root)[1]
    expect(allowance.textContent).toBe('Unmetered')
    expect(root.textContent).toContain('Monthly allowance.')
    expect(root.textContent).not.toContain('Resets')
  })

  it('a remainder at or under ten turns the figure red', () => {
    const cm = getClassMap()
    const low = renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      data: { ...USAGE, allowancePercent: 95 },
    })
    expect(figures(low)[1].classList.contains(cm.textError)).toBe(true)
    const mid = renderUsage({ http: fakeHttpClient(async () => usageResponse(USAGE)), data: USAGE })
    expect(figures(mid)[1].classList.contains(cm.textError)).toBe(false)
  })

  it('the remaining percent clamps into 0–100 both ways', () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    renderUsage({ http, data: { ...USAGE, allowancePercent: 150 } })
    expect(figures(currentRoot())[1].textContent).toBe('~0% remaining')
    renderUsage({ http, data: { ...USAGE, allowancePercent: -20 } })
    expect(figures(currentRoot())[1].textContent).toBe('~100% remaining')
  })

  it('a locale switch re-renders every label', async () => {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('fr', {
      ide: {
        chat: {
          context: {
            session: 'Session actuelle',
            sessionTotal: '{{tokens}} jetons',
            sessionDetail: '{{input}} entrée (cache inclus) · {{output}} sortie',
            live: 'En direct',
            allowance: 'Quota global d’IA',
            remainingPercent: '~{{percent}}% restant',
            ownerAllowance: 'Partagé entre les projets du propriétaire.',
            monthly: 'Quota mensuel.',
            resets: 'Réinitialisation {{at}}.',
          },
        },
      },
    })
    setProvider(provider)
    renderUsage({
      http: fakeHttpClient(async () => usageResponse(USAGE)),
      data: { ...USAGE, streaming: true },
    })
    await provider.setLocale('fr')
    flushSync()
    const root = currentRoot()
    expect(root.textContent).toContain('Session actuelle')
    expect(root.textContent).toContain('1.2M jetons')
    expect(root.textContent).toContain('~60% restant')
    expect(root.textContent).toContain('Quota global d’IA')
    expect(root.textContent).toContain('· En direct')
    expect(root.textContent).toContain('Quota mensuel.')
    expect(root.textContent).toContain('Réinitialisation Nov 20, 02:45 AM.')
  })
})

/**
 * An `HttpClient` whose `get` is the only live member.
 * @param get - The GET behaviour.
 * @returns The fake client.
 */
function fakeHttpClient(
  get: (url: string) => Promise<HttpResponse<SessionUsage | undefined>>,
): HttpClient {
  // Every method but `get` rejects: the composable under test catches its own
  // failures, and a never-called member needs no payload.
  const reject = <T = unknown>(): Promise<HttpResponse<T>> =>
    Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: vi.fn(async (url: string): Promise<HttpResponse<never>> => {
      // The stub's payload stands in for the server's reply; the client
      // contract is caller-generic, which no concrete payload can prove, so
      // the mock types it never and the interface widens it to the caller's T.
      const response = await get(url)
      return { ...response, data: response.data as never }
    }),
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: vi.fn(() => () => {}),
    addResponseInterceptor: vi.fn(() => () => {}),
    addErrorInterceptor: vi.fn(() => () => {}),
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => null),
    onAuthError: vi.fn(() => () => {}),
  }
}

/**
 * An HTTP reply carrying `data`.
 * @param data - The payload (or undefined for an empty body).
 * @returns The response.
 */
function usageResponse<T>(data: T): HttpResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { method: 'GET', url: '' } }
}

/** The state the hook host shows in its `data-usage` attribute. */
interface ShownState {
  data: SessionUsage | null
  loading: boolean
  failed: boolean
}

/** The hook host's shown state. */
function shownState(): ShownState {
  return JSON.parse(
    container!.querySelector('[data-usage]')!.getAttribute('data-usage')!,
  ) as ShownState
}

describe('useContextSessionUsage', () => {
  /**
   * Mounts the hook host with the given arguments.
   * @param http - The HTTP client the host provides.
   * @param args - The hook's arguments.
   * @returns The host container.
   */
  function mountHook(
    http: HttpClient,
    args: { projectId?: string; conversationId?: string | null; active?: boolean } = {},
  ): HTMLElement {
    unmountCurrent()
    container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(HookHost, {
      target: container,
      props: {
        http,
        // The hook's reactive sources arrive as readable stores, the way a
        // host's changing state reaches it.
        project: writable(args.projectId),
        conversation: writable(args.conversationId ?? null),
        active: writable(args.active ?? true),
      },
    })
    flushSync()
    return container
  }

  /** Clicks the host's refresh button. */
  function refresh(): void {
    ;(container!.querySelector('button') as HTMLButtonElement).click()
    flushSync()
  }

  it('loads the conversation totals while visible, scoped to the conversation', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    mountHook(http, { projectId: 'p1', conversationId: 'c/one' })
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(1))
    expect(http.get).toHaveBeenCalledWith('/projects/p1/chat-usage?conversationId=c%2Fone', {
      signal: expect.any(AbortSignal),
    })
    await vi.waitFor(() =>
      expect(shownState()).toEqual({ data: USAGE, loading: false, failed: false }),
    )
  })

  it('a failed load states failure and keeps the previous totals', async () => {
    let calls = 0
    const http = fakeHttpClient(async () => {
      calls += 1
      if (calls === 1) return usageResponse(USAGE)
      throw new Error('network down')
    })
    mountHook(http, { projectId: 'p1', conversationId: null })
    await vi.waitFor(() => expect(shownState().data).toEqual(USAGE))
    // A refresh that fails states the failure and keeps the totals until a
    // reply replaces them.
    refresh()
    await vi.waitFor(() => expect(shownState().failed).toBe(true))
    expect(shownState().data).toEqual(USAGE)
    expect(shownState().loading).toBe(false)
  })

  it('refresh() re-fetches at once', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    mountHook(http, { projectId: 'p1', conversationId: null })
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(1))
    refresh()
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(shownState().data).toEqual(USAGE))
  })

  it('inactive does not fetch, and neither does a missing project', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    mountHook(http, { projectId: 'p1', conversationId: null, active: false })
    mountHook(http, { conversationId: null })
    for (let i = 0; i < 6; i++) await Promise.resolve()
    flushSync()
    expect(http.get).not.toHaveBeenCalled()
  })

  it('re-fetches every 15 seconds while visible', async () => {
    vi.useFakeTimers()
    try {
      const http = fakeHttpClient(async () => usageResponse(USAGE))
      mountHook(http, { projectId: 'p1', conversationId: null })
      // The first load starts on a microtask after the mount's subscriptions.
      await Promise.resolve()
      expect(http.get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(15_000)
      expect(http.get).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(15_000)
      expect(http.get).toHaveBeenCalledTimes(3)
      expect(shownState().data).toEqual(USAGE)
    } finally {
      vi.useRealTimers()
    }
  })
})
