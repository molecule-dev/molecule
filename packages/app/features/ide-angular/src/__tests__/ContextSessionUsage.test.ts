// @vitest-environment jsdom
/**
 * `ContextSessionUsage` rendered for real: the session-and-allowance rows'
 * every state — the empty and loading states, a failed refresh, the loaded
 * breakdown with window and reset time, streaming, unmetered, the clamped
 * and error-red remainder, a locale switch — and the `useContextSessionUsage`
 * hook's load/refresh/failure loop. (The React package carries no unit test
 * of its own for the component — its states are pinned by the conformance
 * kit's `ContextSessionUsage` cases — so these assert the same contract at
 * the component boundary here.) Mounted through Angular's own
 * `createApplication`.
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
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_CLIENT, provideDomPlacement } from '@molecule/app-angular'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { useContextSessionUsage } from '../hooks/useContextSessionUsage.js'
import type { SessionUsage } from '../parts/context-session-usage.component.js'
import { ContextSessionUsage } from '../parts/context-session-usage.component.js'

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

/** One mounted host, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<unknown>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle, without timers. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  current.appRef.tick()
}

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the inputs are set through real bindings.
 */
const UsageHost = Component({
  selector: 'mol-context-session-usage-host',
  standalone: true,
  imports: [ContextSessionUsage],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-context-session-usage [data]="p['data']" [loading]="p['loading']" [failed]="p['failed']"></div>`,
})(
  class UsageHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/**
 * Mounts the rows with the given inputs.
 *
 * @param props - The inputs (`data`, `loading`, `failed`).
 * @returns The mount and its root element.
 */
async function renderUsage(
  props: Partial<{ data: SessionUsage | null; loading: boolean; failed: boolean }> = {},
): Promise<{ mounted: Mounted; root: HTMLElement }> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<InstanceType<typeof UsageHost>> = createComponent(UsageHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    data: props.data ?? null,
    loading: props.loading ?? false,
    failed: props.failed ?? false,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref: ref as ComponentRef<unknown>, container }
  await flush()
  const root = container.querySelector('div[aria-live="polite"]') as HTMLElement
  return { mounted: current, root }
}

/** The component root's two figures, in row order. */
function figures(root: HTMLElement): [HTMLElement, HTMLElement] {
  const strongs = root.querySelectorAll('strong')
  return [strongs[0] as HTMLElement, strongs[1] as HTMLElement]
}

/**
 * Patches the host's inputs and re-renders.
 * @param host - The mount whose inputs to patch.
 * @param props - The next inputs.
 */
async function patchInputs(
  host: Mounted,
  props: Partial<{ data: SessionUsage | null; loading: boolean; failed: boolean }>,
): Promise<void> {
  const ref = host.ref as ComponentRef<InstanceType<typeof UsageHost>>
  ref.instance.p = { ...ref.instance.p, ...props }
  ref.changeDetectorRef.markForCheck()
  await flush()
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
    const { mounted: host, root } = await renderUsage({ data: { ...USAGE, allowancePercent: 150 } })
    expect(figures(root)[1].textContent).toBe('~0% remaining')
    await patchInputs(host, { data: { ...USAGE, allowancePercent: -20 } })
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
    const { mounted: host, root } = await renderUsage({ data: { ...USAGE, streaming: true } })
    await provider.setLocale('fr')
    host.ref.changeDetectorRef.markForCheck()
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

/**
 * The JIT host that calls the hook in its injection context and shows the
 * loaded state, with a button that calls `refresh()`.
 */
const HookHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-context-session-usage-hook-host',
  standalone: true,
  template: `<span [attr.data-usage]="shown()"></span><button type="button" (click)="refreshUsage()">refresh</button>`,
})(
  class HookHost {
    /** The hook's arguments, as signals the hook's effect tracks. */
    readonly projectId = signal<string | undefined>(undefined)
    /** The conversation to scope the totals to. */
    readonly conversationId = signal<string | null | undefined>(null)
    /** Whether the summary is visible. */
    readonly active = signal<boolean>(true)

    /** The hook state (called in the injection context of the field init). */
    readonly result: HookResult = useContextSessionUsage(
      this.projectId,
      this.conversationId,
      this.active,
    )

    /**
     * The shown state, as JSON the test reads.
     * @returns The JSON text.
     */
    shown(): string {
      return JSON.stringify({
        data: this.result.data(),
        loading: this.result.loading(),
        failed: this.result.failed(),
      })
    }

    /** Re-fetches, the way a visible summary's host would. */
    refreshUsage(): void {
      this.result.refresh()
    }
  },
)

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

  /**
   * Mounts the hook host with the HTTP client provided.
   * @param http - The HTTP client.
   * @param args - The hook's arguments.
   * @returns The host component instance.
   */
  async function mountHook(
    http: HttpClient,
    args: { projectId?: string; conversationId?: string | null; active?: boolean } = {},
  ): Promise<InstanceType<typeof HookHost>> {
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
        provideDomPlacement(),
        { provide: HTTP_CLIENT, useValue: http },
      ],
    })
    const ref: ComponentRef<InstanceType<typeof HookHost>> = createComponent(HookHost, {
      environmentInjector: appRef.injector,
    })
    container.appendChild(ref.location.nativeElement as HTMLElement)
    appRef.attachView(ref.hostView)
    ref.instance.projectId.set(args.projectId)
    ref.instance.conversationId.set(args.conversationId ?? null)
    ref.instance.active.set(args.active ?? true)
    ref.changeDetectorRef.markForCheck()
    current = { appRef, ref: ref as ComponentRef<unknown>, container }
    await flush()
    return ref.instance
  }

  /** The hook host's shown state. */
  function shownState(): {
    data: SessionUsage | null
    loading: boolean
    failed: boolean
  } {
    return JSON.parse(document.querySelector('[data-usage]')!.getAttribute('data-usage')!) as {
      data: SessionUsage | null
      loading: boolean
      failed: boolean
    }
  }

  /** Clicks the host's refresh button and lets change detection settle. */
  async function refresh(): Promise<void> {
    ;(document.querySelector('button') as HTMLButtonElement).click()
    await flush()
  }

  it('loads the conversation totals while visible, scoped to the conversation', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    await mountHook(http, { projectId: 'p1', conversationId: 'c/one' })
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
    await mountHook(http, { projectId: 'p1', conversationId: null })
    await vi.waitFor(() => expect(shownState().data).toEqual(USAGE))
    // A refresh that fails states the failure and keeps the totals until a
    // reply replaces them.
    await refresh()
    await vi.waitFor(() => expect(shownState().failed).toBe(true))
    expect(shownState().data).toEqual(USAGE)
    expect(shownState().loading).toBe(false)
  })

  it('refresh() re-fetches at once', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    await mountHook(http, { projectId: 'p1', conversationId: null })
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(1))
    await refresh()
    await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(shownState().data).toEqual(USAGE))
  })

  it('inactive does not fetch, and neither does a missing project', async () => {
    const http = fakeHttpClient(async () => usageResponse(USAGE))
    await mountHook(http, { projectId: 'p1', conversationId: null, active: false })
    await mountHook(http, { conversationId: null })
    expect(http.get).not.toHaveBeenCalled()
  })

  it('re-fetches every 15 seconds while visible', async () => {
    vi.useFakeTimers()
    try {
      const http = fakeHttpClient(async () => usageResponse(USAGE))
      await mountHook(http, { projectId: 'p1', conversationId: null })
      expect(http.get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(15_000)
      await flush()
      expect(http.get).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(15_000)
      await flush()
      expect(http.get).toHaveBeenCalledTimes(3)
      expect(shownState().data).toEqual(USAGE)
    } finally {
      vi.useRealTimers()
    }
  })
})
