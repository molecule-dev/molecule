// @vitest-environment jsdom
/**
 * `ContextUsageIndicator` rendered for real: the Solid port of React's own
 * `ContextUsageIndicator.test.tsx` — the same test names and the same
 * assertions, mounted through Solid's `render` under an `HttpContext`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContextComposition, ContextUsage } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'
import { HttpContext } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  ContextUsageIndicator,
  type ContextUsageIndicatorProps,
} from '../parts/ContextUsageIndicator.jsx'

const get = vi.fn()

/** An `HttpResponse` carrying `data`. */
function reply(data: unknown): HttpResponse<unknown> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { method: 'GET', url: '' } }
}
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

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

/** Lets Solid's synchronous graph settle its async continuations. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve()
}

/**
 * Mounts the indicator with the given props, backed by a signal so a later
 * patch re-renders the same mount.
 * @param props - The props to start from.
 * @returns The prop setter for a later patch.
 */
async function mount(
  props: Partial<ContextUsageIndicatorProps> = {},
): Promise<(next: Partial<ContextUsageIndicatorProps>) => void> {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [state, setState] = createSignal<Partial<ContextUsageIndicatorProps>>({
    usage,
    history: [],
    compactions: [],
    projectId: undefined,
    conversationId: undefined,
    onOpenSettings: undefined,
    ...props,
  })

  /** The reactive host the way the kit mounts the component. */
  function Host(): JSX.Element {
    return (
      <ContextUsageIndicator
        usage={state().usage as ContextUsage}
        history={state().history}
        compactions={state().compactions}
        projectId={state().projectId}
        conversationId={state().conversationId}
        onOpenSettings={state().onOpenSettings}
      />
    )
  }

  mounted.dispose = render(
    () => (
      <HttpContext.Provider value={http}>
        <Host />
      </HttpContext.Provider>
    ),
    container,
  )
  await flush()
  return (next) => setState({ ...state(), ...next })
}

/** The trigger button. */
const button = (): HTMLButtonElement =>
  document.querySelector('[data-mol-id="chat-context-usage"]') as HTMLButtonElement

/** The open modal's dialog element, or null while closed. */
const dialog = (): HTMLElement | null => document.querySelector('[role="dialog"]')

/** The visible tooltip box, or null while hidden. */
const tooltip = (): HTMLElement | null => document.querySelector('[role="tooltip"]')

/** Hovers like the conformance kit's mouseenter step (over, then enter). */
const hover = (el: HTMLElement): void => {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
}

/** Unhovers like the conformance kit's mouseleave step (out, then leave). */
const unhover = (el: HTMLElement): void => {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
}

/** Presses a key on the element (it bubbles). */
const keyDown = (el: EventTarget, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

beforeEach(() => {
  get.mockReset().mockResolvedValue(reply(totals))
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet({ 'x-mark': { paths: [] } })
})
afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

describe('context usage details', () => {
  it('uses the server target and distinguishes actual tokens, estimates, bytes, and unknown media', async () => {
    await mount()
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
    await mount({ usage: { inputTokens: 0, contextWindow: 100000 } })
    expect(button().textContent).toContain('0%')
    expect(button().getAttribute('aria-label')).toContain('Context window')
    expect(button().getAttribute('aria-label')).not.toContain('Compaction target')
  })

  it('shows usage history and actual completed compactions', async () => {
    await mount({
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
    await mount({ projectId: 'a project', conversationId: 'session/one' })
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
    await mount()
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
    await mount({ projectId: 'p' })
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
    mounted.dispose?.()
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    const composer = document.createElement('input')
    composer.setAttribute('aria-label', 'Composer')
    document.body.appendChild(composer)
    mounted.dispose = render(
      () => (
        <HttpContext.Provider value={http}>
          <ContextUsageIndicator usage={usage} projectId="p" />
        </HttpContext.Provider>
      ),
      container,
    )
    await flush()
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
    await mount({ usage: { ...usage, inputTokens: tokens } })
    const ring = button().querySelector('svg')
    expect(ring?.getAttribute('class')).toBe(classMap[color])
  })

  it('keeps the context target separate from the window and clamps exhausted allowance', async () => {
    get.mockResolvedValue(
      reply({ ...totals, allowancePercent: 125, allowanceWindow: 'billing-period' }),
    )
    await mount({ usage: { ...usage, inputTokens: 11000 }, projectId: 'p', conversationId: null })
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
    await mount({ projectId: 'p' })
    button().click()
    await flush()
    const modal = dialog() as HTMLElement
    await vi.waitFor(() => expect(modal.textContent).toContain(expected))
    expect(modal.textContent).not.toContain('~100% remaining')
  })

  it('retries failed usage and closes the modal before opening chat settings', async () => {
    get.mockRejectedValueOnce(new Error('offline'))
    const settings = vi.fn()
    await mount({ projectId: 'p', onOpenSettings: settings })
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
    const set = await mount({ projectId: 'p', conversationId: 'old' })
    button().click()
    await flush()
    set({ conversationId: 'new' })
    await flush()
    // The re-keyed view remounts with its modal closed; the second click opens
    // the new session's modal the way React's rerender + click does.
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
    await mount({ projectId: 'p' })
    button().click()
    await flush()
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15000)
    expect(get).toHaveBeenCalledTimes(2)
    keyDown(document, 'Escape')
    await flush()
    await vi.advanceTimersByTimeAsync(30000)
    expect(get).toHaveBeenCalledTimes(2)
    expect(signalOf(1)?.aborted).toBe(true)
  })
})
