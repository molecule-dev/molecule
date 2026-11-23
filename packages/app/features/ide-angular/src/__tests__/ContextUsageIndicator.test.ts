// @vitest-environment jsdom
/**
 * `ContextUsageIndicator` rendered for real: the Angular port of React's own
 * `ContextUsageIndicator.test.tsx` — the same test names and the same
 * assertions, mounted through Angular's own `createApplication` with an
 * `HTTP_CLIENT` fake.
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

import type { ContextComposition, ContextUsage } from '@molecule/app-ai-chat'
import { HTTP_CLIENT, provideDomPlacement } from '@molecule/app-angular'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ContextUsageIndicator } from '../parts/context-usage-indicator.component.js'

/**
 * An `HttpResponse` carrying `data`.
 * @param data - The payload.
 * @returns The response.
 */
function reply(data: unknown): HttpResponse<unknown> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { method: 'GET', url: '' } }
}

const get = vi.fn()

/** The fake client: only `get` is live, the rest satisfy the interface. */
const http: HttpClient = {
  baseURL: '',
  defaultHeaders: {},
  request: vi.fn(),
  get,
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  addRequestInterceptor: vi.fn(() => () => {}),
  addResponseInterceptor: vi.fn(() => () => {}),
  addErrorInterceptor: vi.fn(() => () => {}),
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
  onAuthError: vi.fn(() => () => {}),
}

/**
 * The abort signal the GET fake received for one call.
 * @param call - The call index.
 * @returns The signal, or undefined when the call carried none.
 */
const signalOf = (call: number): AbortSignal | undefined => {
  const config: RequestConfig | undefined = get.mock.calls[call][1]
  return config?.signal
}

const totals = {
  inputTokens: 1000,
  outputTokens: 2000,
  cacheReadInputTokens: 3000,
  cacheCreationInputTokens: 4000,
  allowancePercent: 25,
  allowanceWindow: 'daily',
  allowanceResetAt: new Date('2026-10-30T12:00:00Z').getTime(),
}

const composition: ContextComposition = {
  version: 1,
  basis: 'core-provider-context-json',
  percentBasis: 'estimated-known-tokens',
  totalChars: 13000,
  totalBytes: 14000,
  estimatedChars: 12000,
  estimatedTokens: 3000,
  charsPerToken: 4,
  actualInputTokens: 3100,
  unknownTokenItems: 1,
  serializationFailures: 0,
  categories: [
    {
      id: 'toolResults',
      chars: 12000,
      bytes: 12000,
      items: 1,
      unknownItems: 0,
      estimatedTokens: 3000,
      percent: 100,
      bytePercent: 85.71,
    },
    {
      id: 'images',
      chars: 1000,
      bytes: 2000,
      items: 1,
      unknownItems: 1,
      estimatedTokens: null,
      percent: null,
      bytePercent: 14.29,
    },
  ],
}
const usage: ContextUsage = {
  inputTokens: 3100,
  contextWindow: 100000,
  backgroundCompactAtTokens: 10000,
  compactAtTokens: 60000,
  composition,
  requestId: 'request-2',
  at: '2026-10-20T10:01:00Z',
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
  get.mockReset().mockResolvedValue(reply(totals))
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet({ 'x-mark': { paths: [] } })
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

/**
 * Lets Angular's zoneless change detection settle, without timers.
 * @returns A promise resolved after the effects and the pending replies ran.
 */
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
const IndicatorHost = Component({
  selector: 'mol-context-usage-indicator-host',
  standalone: true,
  imports: [ContextUsageIndicator],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<input aria-label="Composer" /><div mol-context-usage-indicator [usage]="p['usage']" [history]="p['history']" [compactions]="p['compactions']" [projectId]="p['projectId']" [conversationId]="p['conversationId']" [onOpenSettings]="p['onOpenSettings']"></div>`,
})(
  class IndicatorHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/**
 * Mounts the indicator with the given props.
 * @param props - The props to start from.
 * @returns The component instance, for a later patch.
 */
async function render(
  props: Partial<{
    usage: ContextUsage
    history: ContextUsage[]
    compactions: unknown[]
    projectId: string
    conversationId: string | null
    onOpenSettings: () => void
  }>,
): Promise<InstanceType<typeof IndicatorHost>> {
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
  const ref: ComponentRef<InstanceType<typeof IndicatorHost>> = createComponent(IndicatorHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    usage,
    history: [],
    compactions: [],
    projectId: undefined,
    conversationId: undefined,
    onOpenSettings: undefined,
    ...props,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref: ref as ComponentRef<unknown>, container }
  await flush()
  return ref.instance
}

/**
 * Patches the host's props and re-renders.
 * @param host - The host whose props to patch.
 * @param props - The next props.
 */
async function patch(
  host: InstanceType<typeof IndicatorHost>,
  props: Record<string, unknown>,
): Promise<void> {
  host.p = { ...host.p, ...props }
  current?.ref.changeDetectorRef.markForCheck()
  await flush()
}

/** The trigger button. */
const button = (): HTMLButtonElement =>
  document.querySelector('[data-mol-id="chat-context-usage"]') as HTMLButtonElement

/** The open modal's dialog element, or null while closed. */
const dialog = (): HTMLElement | null => document.querySelector('[role="dialog"]')

/** The visible tooltip box, or null while hidden. */
const tooltip = (): HTMLElement | null => document.querySelector('[role="tooltip"]')

/**
 * Hovers an element the way a pointer entering its boundary does.
 * @param el - The element to hover.
 */
const hover = (el: HTMLElement): void => {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
}

/**
 * Leaves an element the way a pointer crossing its boundary out does.
 * @param el - The element to leave.
 */
const unhover = (el: HTMLElement): void => {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
}

/**
 * Presses a key on an element (it bubbles).
 * @param el - The event target.
 * @param key - The key name.
 */
const keyDown = (el: EventTarget, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('context usage details', () => {
  it('uses the server target and distinguishes actual tokens, estimates, bytes, and unknown media', async () => {
    await render({})
    expect(button().getAttribute('aria-label')).toContain('Compaction target (31%)')
    expect(button().querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
    expect(button().title).toBe('')
    button().click()
    await flush()
    expect(dialog()).toBeTruthy()
    const modal = dialog() as HTMLElement
    expect(modal.textContent).toContain('Provider-reported input: 3,100 tokens')
    expect(modal.textContent).toContain('Known text estimate: 3,000 tokens')
    expect(modal.textContent).toContain('unknown token cost')
    const rows = modal.querySelectorAll('tbody tr')
    expect(rows[0]?.textContent).toContain('100%')
    expect(rows[1]?.textContent).toContain('— + ?')
    keyDown(document, 'Escape')
    await flush()
    expect(dialog()).toBeNull()
  })

  it('falls back to the context window without inventing a compaction threshold', async () => {
    await render({ usage: { inputTokens: 0, contextWindow: 100000 } })
    expect(button().textContent).toContain('0%')
    expect(button().getAttribute('aria-label')).toContain('Context window')
    expect(button().getAttribute('aria-label')).not.toContain('Compaction target')
  })

  it('shows usage history and actual completed compactions', async () => {
    await render({
      history: [
        { ...usage, requestId: 'request-1', at: '2026-10-20T10:00:00Z', inputTokens: 20000 },
      ],
      compactions: [
        {
          at: '2026-10-20T10:00:30Z',
          compactedCount: 12,
          beforeChars: 80000,
          afterChars: 8000,
          elapsedMs: 4500,
        },
      ],
    })
    button().click()
    await flush()
    const modal = dialog() as HTMLElement
    expect(modal.textContent).toContain('Context over time · 2 requests')
    expect(modal.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
      'Input tokens over time',
    )
    expect(modal.textContent).toContain('80,000 → 8,000 characters · 5s')
  })

  it('replaces estimates with actual usage for the same request and refuses a stale estimate', () => {
    const estimate = { ...usage, composition: { ...composition, actualInputTokens: null } }
    expect(mergeContextHistory([estimate], [usage])).toEqual([usage])
    expect(mergeContextHistory([usage], [estimate])).toEqual([usage])
  })

  it('bounds history while retaining the beginning and newest request', () => {
    const samples = Array.from({ length: 150 }, (_, index) => ({
      ...usage,
      requestId: String(index),
      at: new Date(index * 1000).toISOString(),
    }))
    const merged = mergeContextHistory(samples, [])
    expect(merged).toHaveLength(128)
    expect(merged[0].requestId).toBe('0')
    expect(merged.at(-1)?.requestId).toBe('149')
  })

  it('reveals the percentage and a detailed tooltip on hover, then dismisses both', async () => {
    await render({ projectId: 'a project', conversationId: 'session/one' })
    expect(get).not.toHaveBeenCalled()
    hover(button())
    await flush()
    const box = tooltip()
    expect(box).toBeTruthy()
    expect(button().querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('1')
    expect(box?.textContent).toContain('Context has room')
    expect(box?.textContent).toContain('7K tokens of headroom')
    await vi.waitFor(() => expect(box?.textContent).toContain('~75% remaining'))
    expect(get.mock.calls[0][0]).toBe(
      '/projects/a%20project/chat-usage?conversationId=session%2Fone',
    )
    expect(box?.textContent).toContain('10.0K tokens')
    expect(box?.textContent).toContain('8.0K input (incl. cache) · 2.0K output')
    expect(box?.textContent).toContain('Daily allowance')
    unhover(button())
    await flush()
    await vi.waitFor(() => expect(tooltip()).toBeNull())
    expect(button().querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
  })

  it('supports keyboard focus, Escape and click without leaving the tooltip above the modal', async () => {
    await render({})
    const trigger = button()
    const matches = trigger.matches.bind(trigger)
    vi.spyOn(trigger, 'matches').mockImplementation(
      (selector) => selector === ':focus-visible' || matches(selector),
    )
    trigger.focus()
    await flush()
    expect(trigger.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('1')
    keyDown(trigger, 'Escape')
    await flush()
    expect(tooltip()).toBeNull()
    expect(trigger.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
    hover(trigger)
    await flush()
    trigger.click()
    await flush()
    expect(tooltip()).toBeNull()
    expect(dialog()).toBeTruthy()
  })

  it('does not reveal the percentage or fetch on mouse-driven focus restoration', async () => {
    await render({ projectId: 'p' })
    const trigger = button()
    const matches = trigger.matches.bind(trigger)
    vi.spyOn(trigger, 'matches').mockImplementation(
      (selector) => selector !== ':focus-visible' && matches(selector),
    )
    trigger.focus()
    await flush()
    expect(trigger.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
    expect(get).not.toHaveBeenCalled()
  })

  it('dismisses pointer-only context help with Escape from the composer', async () => {
    await render({ projectId: 'p' })
    const composer = document.querySelector('input[aria-label="Composer"]') as HTMLInputElement
    composer.focus()
    const trigger = button()
    hover(trigger)
    await vi.waitFor(() => expect(document.body.textContent).toContain('~75% remaining'))
    keyDown(composer, 'Escape')
    await flush()
    expect(tooltip()).toBeNull()
    expect(trigger.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
    expect(document.activeElement).toBe(composer)
    expect(signalOf(0)?.aborted).toBe(true)
  })

  it.each([
    [1000, 'textSuccess'],
    [7000, 'textWarning'],
    [9500, 'textError'],
  ] as const)('colors the ring semantically at %i tokens', async (tokens, color) => {
    await render({ usage: { ...usage, inputTokens: tokens } })
    const ring = button().querySelector('svg')
    expect(ring?.getAttribute('class')).toBe(classMap[color])
  })

  it('keeps the context target separate from the window and clamps exhausted allowance', async () => {
    get.mockResolvedValue(
      reply({ ...totals, allowancePercent: 125, allowanceWindow: 'billing-period' }),
    )
    await render({ usage: { ...usage, inputTokens: 11000 }, projectId: 'p', conversationId: null })
    button().click()
    await flush()
    const modal = dialog() as HTMLElement
    await vi.waitFor(() => expect(modal.textContent).toContain('~0% remaining'))
    expect(modal.textContent).toContain('At compaction target')
    expect(modal.textContent).toContain('Model context window: 100K tokens.')
    expect(modal.textContent).toContain('Monthly allowance')
    expect(modal.textContent).toContain('0 tokens of headroom')
    expect(
      (modal.querySelector('[role="progressbar"]') as HTMLElement).getAttribute('aria-valuenow'),
    ).toBe('100')
  })

  it.each([
    [null, 'Unmetered'],
    [undefined, 'Unavailable'],
  ] as const)('distinguishes allowance %s', async (percent, expected) => {
    get.mockResolvedValue(reply({ ...totals, allowancePercent: percent }))
    await render({ projectId: 'p' })
    button().click()
    await flush()
    const modal = dialog() as HTMLElement
    await vi.waitFor(() => expect(modal.textContent).toContain(expected))
    expect(modal.textContent).not.toContain('~100% remaining')
  })

  it('retries failed usage and closes the modal before opening chat settings', async () => {
    get.mockRejectedValueOnce(new Error('offline'))
    const settings = vi.fn()
    await render({ projectId: 'p', onOpenSettings: settings })
    button().click()
    await flush()
    const modal = dialog() as HTMLElement
    await vi.waitFor(() => expect(modal.textContent).toContain('Usage could not be refreshed'))
    expect(modal.textContent).not.toContain('~100% remaining')
    const refresh = modal.querySelector('[data-mol-id="chat-context-refresh"]') as HTMLButtonElement
    refresh.click()
    await vi.waitFor(() => expect(modal.textContent).toContain('~75% remaining'))
    const settingsButton = modal.querySelector(
      '[data-mol-id="chat-context-settings"]',
    ) as HTMLButtonElement
    settingsButton.click()
    await flush()
    expect(settings).toHaveBeenCalledOnce()
    expect(dialog()).toBeNull()
  })

  it('discards old-session totals and an old response when navigation changes the session', async () => {
    let finish!: (value: unknown) => void
    get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const host = await render({ projectId: 'p', conversationId: 'old' })
    button().click()
    await flush()
    await patch(host, { conversationId: 'new' })
    // The reset closes the modal on navigation; the second click opens the new
    // session's modal the way React's remount + click does.
    button().click()
    await flush()
    const modal = dialog() as HTMLElement
    await vi.waitFor(() => expect(modal.textContent).toContain('~75% remaining'))
    finish({ data: { ...totals, allowancePercent: 99 } })
    await flush()
    expect(document.body.textContent).not.toContain('~1% remaining')
    expect(signalOf(0)?.aborted).toBe(true)
  })

  it('refreshes visible usage every 15 seconds and cancels the timer and request on close', async () => {
    vi.useFakeTimers()
    await render({ projectId: 'p' })
    button().click()
    await flush()
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15000)
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
    keyDown(document, 'Escape')
    await flush()
    await vi.advanceTimersByTimeAsync(30000)
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
    expect(signalOf(1)?.aborted).toBe(true)
  })
})
