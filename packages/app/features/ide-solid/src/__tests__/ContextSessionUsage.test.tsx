// @vitest-environment jsdom
/**
 * `ContextSessionUsage` rendered for real: the session-and-allowance rows'
 * every state — the empty and loading states, a failed refresh, the loaded
 * breakdown with window and reset time, streaming, unmetered, the clamped
 * and error-red remainder, a locale switch — and the `useContextSessionUsage`
 * primitive's load/refresh/failure loop. (The React package carries no unit
 * test of its own for the component — its states are pinned by the
 * conformance kit's `ContextSessionUsage` cases — so these assert the same
 * contract at the component boundary here.) Mounted through Solid's own
 * `render`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
// The JSX types the mount helpers read.
import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { HttpContext } from '@molecule/app-solid'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  ContextSessionUsage,
  type ContextSessionUsageProps,
  type SessionUsage,
  useContextSessionUsage,
} from '../parts/ContextSessionUsage.jsx'

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
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** The component root's two figures, in row order. */
function figures(root: HTMLElement): [HTMLElement, HTMLElement] {
  const strongs = root.querySelectorAll('strong')
  return [strongs[0] as HTMLElement, strongs[1] as HTMLElement]
}

/** Lets Solid's synchronous graph settle its async continuations. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve()
}

/**
 * Mounts the rows with the given props, backed by a signal so a later patch
 * re-renders the same mount.
 *
 * @param props - The props to start from (`data`, `loading`, `failed`).
 * @returns The root element and the prop setter for a later patch.
 */
async function renderUsage(props: Partial<ContextSessionUsageProps> = {}): Promise<{
  root: HTMLElement
  set: (next: Partial<ContextSessionUsageProps>) => void
}> {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [state, setState] = createSignal<ContextSessionUsageProps>({
    data: null,
    loading: false,
    failed: false,
    ...props,
  })
  mounted.dispose = render(
    () => (
      <ContextSessionUsage data={state().data} loading={state().loading} failed={state().failed} />
    ),
    container,
  )
  await flush()
  const root = container.querySelector('div[aria-live="polite"]') as HTMLElement
  return { root, set: (next) => setState({ ...state(), ...next }) }
}

describe('ContextSessionUsage rows', () => {
  it('nothing loaded shows Unavailable on both rows', async () => {
    const { root } = await renderUsage()
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('Unavailable')
    expect(allowance.textContent).toBe('Unavailable')
    expect(root.textContent).toContain('Current session')
    expect(root.textContent).toContain('Overall AI allowance')
    expect(root.textContent).not.toContain('input (incl. cache)')
  })

  it('loading shows Loading… on both rows', async () => {
    const { root } = await renderUsage({ loading: true })
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('Loading…')
    expect(allowance.textContent).toBe('Loading…')
  })

  it('a failed refresh states the error and keeps the totals unavailable', async () => {
    const { root } = await renderUsage({ failed: true })
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('Unavailable')
    expect(allowance.textContent).toBe('Unavailable')
    expect(root.textContent).toContain('Usage could not be refreshed. Open details to retry.')
    // A stale payload changes nothing: the failure wins.
    const stale = await renderUsage({ data: USAGE, failed: true })
    expect(figures(stale.root)[0].textContent).toBe('Unavailable')
    expect(stale.root.textContent).not.toContain('1.2M tokens')
  })

  it('a payload shows the session and allowance rows', async () => {
    const { root } = await renderUsage({ data: USAGE })
    const [session, allowance] = figures(root)
    expect(session.textContent).toBe('1.2M tokens')
    expect(allowance.textContent).toBe('~60% remaining')
    expect(root.textContent).toContain('11.0K input (incl. cache) · 1.2M output')
    expect(root.textContent).toContain('Shared across the project owner’s projects.')
    expect(root.textContent).toContain('Monthly allowance.')
    expect(root.textContent).toContain('Resets Nov 20, 02:45 AM.')
  })

  it('a streaming payload marks the session line live', async () => {
    const { root } = await renderUsage({
      data: { ...USAGE, allowancePercent: 55, streaming: true },
    })
    expect(root.textContent).toContain('11.0K input (incl. cache) · 1.2M output · Live')
    expect(figures(root)[1].textContent).toBe('~45% remaining')
  })

  it('unmetered reads Unmetered and claims no reset', async () => {
    const { root } = await renderUsage({ data: { ...USAGE, allowancePercent: null } })
    const allowance = figures(root)[1]
    expect(allowance.textContent).toBe('Unmetered')
    expect(root.textContent).toContain('Monthly allowance.')
    expect(root.textContent).not.toContain('Resets')
  })

  it('a remainder at or under ten turns the figure red', async () => {
    const cm = getClassMap()
    const low = await renderUsage({ data: { ...USAGE, allowancePercent: 95 } })
    expect(figures(low.root)[1].classList.contains(cm.textError)).toBe(true)
    const mid = await renderUsage({ data: USAGE })
    expect(figures(mid.root)[1].classList.contains(cm.textError)).toBe(false)
  })

  it('the remaining percent clamps into 0–100 both ways', async () => {
    const { root, set } = await renderUsage({ data: { ...USAGE, allowancePercent: 150 } })
    expect(figures(root)[1].textContent).toBe('~0% remaining')
    set({ data: { ...USAGE, allowancePercent: -20 } })
    await flush()
    expect(figures(root)[1].textContent).toBe('~100% remaining')
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
    const { root } = await renderUsage({ data: { ...USAGE, streaming: true } })
    await provider.setLocale('fr')
    await flush()
    expect(root.textContent).toContain('Session actuelle')
    expect(root.textContent).toContain('1.2M jetons')
    expect(root.textContent).toContain('~60% restant')
    expect(root.textContent).toContain('Quota global d’IA')
    expect(root.textContent).toContain('· En direct')
    expect(root.textContent).toContain('Quota mensuel.')
    expect(root.textContent).toContain('Réinitialisation Nov 20, 02:45 AM.')
  })
})

/** The hook state {@link mountHook} exposes. */
type HookResult = ReturnType<typeof useContextSessionUsage>

describe('useContextSessionUsage', () => {
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
    const reject = <T = unknown,>(): Promise<HttpResponse<T>> =>
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

  /**
   * A host component that calls the primitive in a reactive root under the
   * given HTTP context.
   * @param http - The HTTP client the host provides.
   * @param args - The primitive's arguments.
   * @returns The mounted container and the primitive's state.
   */
  function mountHook(
    http: HttpClient,
    args: { projectId?: string; conversationId?: string | null; active?: boolean } = {},
  ): { container: HTMLElement; result: HookResult } {
    mounted.dispose?.()
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    let result!: HookResult

    /**
     * Calls the primitive once in a component root so its effects own a
     * disposal scope.
     * @returns The host markup.
     */
    function Host(): JSX.Element {
      result = useContextSessionUsage(
        () => args.projectId,
        () => args.conversationId ?? null,
        () => args.active ?? true,
      )
      return <span />
    }

    mounted.dispose = render(
      () => (
        <HttpContext.Provider value={http}>
          <Host />
        </HttpContext.Provider>
      ),
      container,
    )
    return { container, result }
  }

  it('loads the conversation totals while visible, scoped to the conversation', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    const { result } = mountHook(http, { projectId: 'p1', conversationId: 'c/one' })
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(1))
    expect(http.get).toHaveBeenCalledWith('/projects/p1/chat-usage?conversationId=c%2Fone', {
      signal: expect.any(AbortSignal),
    })
    await vi.waitFor(() => expect(result.data()).toEqual(USAGE))
    expect(result.loading()).toBe(false)
    expect(result.failed()).toBe(false)
  })

  it('a failed load states failure and keeps the previous totals', async () => {
    let calls = 0
    const http = fakeHttpClient(async () => {
      calls += 1
      if (calls === 1) return usageResponse(USAGE)
      throw new Error('network down')
    })
    const { result } = mountHook(http, { projectId: 'p1', conversationId: null })
    await vi.waitFor(() => expect(result.data()).toEqual(USAGE))
    // A refresh that fails states the failure and keeps the totals until a
    // reply replaces them.
    result.refresh()
    await vi.waitFor(() => expect(result.failed()).toBe(true))
    expect(result.data()).toEqual(USAGE)
    expect(result.loading()).toBe(false)
  })

  it('refresh() re-fetches at once', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    const { result } = mountHook(http, { projectId: 'p1', conversationId: null })
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(1))
    result.refresh()
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(result.data()).toEqual(USAGE))
  })

  it('inactive does not fetch, and neither does a missing project', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    mountHook(http, { projectId: 'p1', conversationId: null, active: false })
    mountHook(http, { conversationId: null })
    await flush()
    expect(http.get).not.toHaveBeenCalled()
  })

  it('re-fetches every 15 seconds while visible', async () => {
    vi.useFakeTimers()
    try {
      const http = fakeHttpClient(async () => usageResponse(USAGE))
      const { result } = mountHook(http, { projectId: 'p1', conversationId: null })
      expect(http.get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(15_000)
      expect(http.get).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(15_000)
      expect(http.get).toHaveBeenCalledTimes(3)
      expect(result.data()).toEqual(USAGE)
    } finally {
      vi.useRealTimers()
    }
  })
})
