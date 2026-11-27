// @vitest-environment jsdom
/**
 * `chat:stream` + `chat:auto-fix` (unit U5): the stream-event handler, the
 * verification auto-fix countdown, its auto-send, and the two countdown
 * banners.
 *
 * The slices under test are the REAL ones: a harness component creates them in
 * React's region order, registers the countdown's lifecycle effects, and
 * renders the two banners, so the ticks, the send and the DOM all run through
 * the unit's own code. Only the slices this unit READS (the context-usage
 * state, the chat session's retry countdown) and the props are small fakes,
 * exactly as the mount-order suite drives one slice over a minimal context.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  shallowReactive,
  type VNodeChild,
} from 'vue'

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { Activity, IdeClientAction } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { moleculePlugin, useTranslation } from '@molecule/app-vue'
import { createChatPlugin } from '@molecule/app-vue/chat'
import { resetChatStoresForTests } from '@molecule/app-vue/chat'

import type {
  ChatCtx,
  ChatInnerProps,
  ChatStreamEventLike,
} from '../components/chat-panel/context.js'
import { renderChatAutoFixBanner } from '../components/chat-panel/render-chat-auto-fix-banner.js'
import { renderChatRetryBanner } from '../components/chat-panel/render-chat-retry-banner.js'
import type { ChatAutoFixSlice } from '../components/chat-panel/use-chat-auto-fix.js'
import { createChatAutoFix } from '../components/chat-panel/use-chat-auto-fix.js'
import type { ChatStreamSlice } from '../components/chat-panel/use-chat-stream.js'
import { createChatStream } from '../components/chat-panel/use-chat-stream.js'
import { buildChatProvider, buildRejectingHttpClient, makeStorage } from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The verification output the fix message carries. */
const VERIFY_OUTPUT = 'src/app.ts(4,11): error TS2304: Cannot find name "quizzer"'

/** A verification that found one type error, in a file the fix would touch. */
const VERIFY_FAIL: ChatStreamEventLike = {
  type: 'verification_result',
  status: 'error',
  output: VERIFY_OUTPUT,
  workspaces: [],
  categories: ['type'],
  changedPaths: ['src/app.ts'],
}

/** The end of a turn. */
const DONE: ChatStreamEventLike = { type: 'done' }

/** The fix message the countdown sends on its last second. */
const FIX_MESSAGE = `Fix these issues:\n\n${VERIFY_OUTPUT}`

/** The countdown's Pause, Resume and Cancel buttons, and the retry strip. */
const PAUSE = '[data-mol-id="chat-autofix-pause"]'
const RESUME = '[data-mol-id="chat-autofix-resume"]'
const CANCEL = '[data-mol-id="chat-autofix-cancel"]'
const RETRY_BANNER = '[data-mol-id="chat-retry-countdown"]'

/** One mounted harness: the real slices over a minimal context. */
interface Harness {
  /** The stream slice under test. */
  stream: ChatStreamSlice
  /** The auto-fix slice under test. */
  autoFix: ChatAutoFixSlice
  /** The props the slices read (mutate to re-render with new ones). */
  props: ChatInnerProps
  /** The component's host element. */
  container: HTMLElement
  /** What the auto-fix countdown sent, in order. */
  sent: string[]
  /** The activities the stream published, in order. */
  activities: Activity[]
  /** The context-usage state the stream feeds. */
  usage: {
    /** The latest usage sample. */
    value: ContextUsage | null
    /** The usage history. */
    history: ContextUsage[]
    /** The compactions. */
    compactions: ContextCompaction[]
  }
  /** The retry countdown's cancel spy. */
  cancelRetry: ReturnType<typeof vi.fn>
  /** Sets the retry countdown the chat session reports. */
  setRetryCountdown: (value: { secondsRemaining: number; attempt: number } | null) => void
  /** Unmounts the harness. */
  unmount: () => void
}

/**
 * Mounts the real `chat:stream` and `chat:auto-fix` slices over a minimal
 * context, registering the countdown's effects and rendering both banners.
 *
 * @returns The harness.
 */
function mountHarness(): Harness {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)

  const props = shallowReactive<ChatInnerProps>({
    projectId: 'proj-u5',
    endpoint: '/projects/proj-u5/chat',
    canEdit: true,
  })
  const usage: {
    value: ContextUsage | null
    history: ContextUsage[]
    compactions: ContextCompaction[]
  } = { value: null, history: [], compactions: [] }
  const retrySource = ref<{ secondsRemaining: number; attempt: number } | null>(null)
  const retryCountdown = computed(() => retrySource.value)
  const cancelRetry = vi.fn()
  const sent: string[] = []
  const activities: Activity[] = []

  let harness!: Harness

  const HarnessComponent = defineComponent({
    name: 'StreamAutoFixHarness',
    setup() {
      const { t } = useTranslation()
      const env = { t, cm: classMap } as ChatCtx['env']
      const ctx = { props, env } as ChatCtx
      // The state the stream drives, as the panel's own slices expose it.
      const contextUsage = {
        setContextUsage(
          value: ContextUsage | null | ((previous: ContextUsage | null) => ContextUsage | null),
        ) {
          usage.value = typeof value === 'function' ? value(usage.value) : value
        },
        setContextHistory(value: ContextUsage[] | ((previous: ContextUsage[]) => ContextUsage[])) {
          usage.history = typeof value === 'function' ? value(usage.history) : value
        },
        setContextCompactions(
          value: ContextCompaction[] | ((previous: ContextCompaction[]) => ContextCompaction[]),
        ) {
          usage.compactions = typeof value === 'function' ? value(usage.compactions) : value
        },
      } as ChatCtx['contextUsage']
      const chatRetry: Pick<ChatCtx['chat'], 'retryCountdown' | 'cancelRetry'> = {
        retryCountdown,
        cancelRetry: () => {
          cancelRetry()
        },
      }
      const chat = chatRetry as ChatCtx['chat']
      ctx.contextUsage = contextUsage
      ctx.chat = chat

      // React's region order: the stream slice first, then auto-fix and its effects.
      const stream = createChatStream(ctx)
      ctx.stream = stream
      const autoFix = createChatAutoFix(ctx)
      ctx.autoFix = autoFix
      autoFix.effects[1]()
      autoFix.effects[2]()

      // What the submit path would have installed (the panel's committed send).
      autoFix.sendMessageRef.current = (message) => {
        sent.push(message)
      }
      stream.addActivityCardRef.current = (activity) => activities.push(activity)

      harness = {
        stream,
        autoFix,
        props,
        container,
        sent,
        activities,
        usage,
        cancelRetry,
        setRetryCountdown: (value) => {
          retrySource.value = value
        },
        unmount: () => {},
      }

      return (): VNodeChild => h('div', [renderChatAutoFixBanner(ctx), renderChatRetryBanner(ctx)])
    },
  })

  const app = createApp(HarnessComponent)
  app.use(moleculePlugin, {
    i18n: createSimpleI18nProvider('en'),
    theme: buildThemeProvider(),
    http: buildRejectingHttpClient(),
  })
  app.use(createChatPlugin(buildChatProvider([])))
  app.mount(container)
  harness.unmount = () => {
    app.unmount()
    document.body.innerHTML = ''
  }
  return harness
}

/**
 * Reads the countdown banner's text, or `null` when no countdown is shown.
 *
 * @param container - The harness container.
 * @returns The banner's text content.
 */
function bannerText(container: HTMLElement): string | null {
  const pause = container.querySelector(PAUSE)
  const resume = container.querySelector(RESUME)
  const banner = (pause ?? resume)?.parentElement ?? null
  return banner ? (banner.querySelector('span')?.textContent ?? '').trim() : null
}

/**
 * Clicks one of the countdown's buttons and lets the render flush.
 *
 * @param container - The harness container.
 * @param selector - The button's selector.
 * @returns A promise resolved after the flush.
 */
async function click(container: HTMLElement, selector: string): Promise<void> {
  const button = container.querySelector<HTMLElement>(selector)
  expect(button, `${selector} renders`).not.toBeNull()
  button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}

/**
 * Plays a failed verification and the turn's end, arming the countdown.
 *
 * @param harness - The mounted harness.
 * @returns A promise resolved after the render flush.
 */
async function failVerification(harness: Harness): Promise<void> {
  harness.stream.handleStreamEvent(VERIFY_FAIL)
  harness.stream.handleStreamEvent(DONE)
  await nextTick()
}

/** The harness alive right now, if any. */
let mounted: Harness | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  vi.useRealTimers()
})

/**
 * Runs one stream event and lets the render flush.
 *
 * @param harness - The mounted harness.
 * @param event - The event to play.
 * @returns A promise resolved after the flush.
 */
async function emit(harness: Harness, event: ChatStreamEventLike): Promise<void> {
  harness.stream.handleStreamEvent(event)
  await nextTick()
}

describe('chat:auto-fix countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('a failed verification ends the turn into a three-second countdown that ticks once a second', async () => {
    mounted = mountHarness()
    await failVerification(mounted)

    expect(bannerText(mounted.container)).toBe('Auto-fixing in 3s...')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()
    expect(bannerText(mounted.container)).toBe('Auto-fixing in 2s...')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()
    expect(bannerText(mounted.container)).toBe('Auto-fixing in 1s...')
  })

  it('at zero the countdown sends the fix message automatically and clears the banner', async () => {
    mounted = mountHarness()
    await failVerification(mounted)

    await vi.advanceTimersByTimeAsync(3000)
    await nextTick()

    expect(bannerText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([FIX_MESSAGE])
  })

  it('pausing holds the countdown and stops the ticking', async () => {
    mounted = mountHarness()
    await failVerification(mounted)

    await click(mounted.container, PAUSE)
    expect(bannerText(mounted.container)).toBe('Auto-fix paused')
    await vi.advanceTimersByTimeAsync(2000)
    await nextTick()
    expect(bannerText(mounted.container)).toBe('Auto-fix paused')
    expect(mounted.sent).toEqual([])
  })

  it('resuming restarts the countdown at three seconds', async () => {
    mounted = mountHarness()
    await failVerification(mounted)

    await click(mounted.container, PAUSE)
    await click(mounted.container, RESUME)
    expect(bannerText(mounted.container)).toBe('Auto-fixing in 3s...')
    await vi.advanceTimersByTimeAsync(2000)
    await nextTick()
    expect(bannerText(mounted.container)).toBe('Auto-fixing in 1s...')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()
    expect(mounted.sent).toEqual([FIX_MESSAGE])
  })

  it('cancelling the countdown sends no fix message', async () => {
    mounted = mountHarness()
    await failVerification(mounted)

    await click(mounted.container, CANCEL)
    expect(bannerText(mounted.container)).toBeNull()
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()
    expect(mounted.sent).toEqual([])
  })

  it('typing in the composer pauses the countdown', async () => {
    mounted = mountHarness()
    await failVerification(mounted)

    mounted.autoFix.handleAutoFixPauseOnInput()
    await nextTick()
    expect(bannerText(mounted.container)).toBe('Auto-fix paused')
  })

  it('a read-only client drops the countdown at zero without sending', async () => {
    mounted = mountHarness()
    await failVerification(mounted)

    mounted.props.canEdit = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(3000)
    await nextTick()

    expect(bannerText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([])
  })

  it('unmounting during the countdown sends nothing afterwards', async () => {
    mounted = mountHarness()
    await failVerification(mounted)
    expect(bannerText(mounted.container)).not.toBeNull()
    const sent = mounted.sent

    mounted.unmount()
    mounted = null
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()
    expect(sent).toEqual([])
  })

  it('a clean verification never arms the countdown', async () => {
    mounted = mountHarness()
    await emit(mounted, { type: 'verification_result', status: 'ok', workspaces: [] })
    await emit(mounted, DONE)
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(bannerText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([])
  })

  it('a verification error without output never arms the countdown', async () => {
    mounted = mountHarness()
    await emit(mounted, { type: 'verification_result', status: 'error', workspaces: [] })
    await emit(mounted, DONE)
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(bannerText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([])
  })

  it('a clean verification after an error cancels the arming', async () => {
    mounted = mountHarness()
    await emit(mounted, VERIFY_FAIL)
    await emit(mounted, { type: 'verification_result', status: 'ok', workspaces: [] })
    await emit(mounted, DONE)
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(bannerText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([])
  })

  it('a stream that fails instead of finishing never arms the countdown', async () => {
    mounted = mountHarness()
    await emit(mounted, VERIFY_FAIL)
    await emit(mounted, { type: 'error', message: 'The API dropped the turn' })
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(bannerText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([])
  })

  it("a teammate's failed verification never arms this client's countdown", async () => {
    mounted = mountHarness()
    mounted.stream.applyingPushedRef.current = true
    try {
      await emit(mounted, VERIFY_FAIL)
      await emit(mounted, DONE)
    } finally {
      mounted.stream.applyingPushedRef.current = false
    }
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(bannerText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([])
  })
})

describe('chat:stream side effects', () => {
  it('a context_usage event feeds the usage ring and the history', async () => {
    mounted = mountHarness()
    await emit(mounted, {
      type: 'context_usage',
      usage: {
        requestId: 'r9',
        at: '2023-11-14T22:13:21.000Z',
        inputTokens: 5_000,
        contextWindow: 100_000,
        backgroundCompactAtTokens: 10_000,
      },
    })

    expect(mounted.usage.value?.inputTokens).toBe(5_000)
    expect(mounted.usage.history).toHaveLength(1)
  })

  it('a compaction event is listed in the usage breakdown', async () => {
    mounted = mountHarness()
    await emit(mounted, {
      type: 'compaction',
      at: '2023-11-14T22:13:23.000Z',
      compactedCount: 10,
      elapsedMs: 3_000,
      beforeChars: 50_000,
      afterChars: 5_000,
    })

    expect(mounted.usage.compactions).toHaveLength(1)
    expect(mounted.usage.compactions[0].at).toBe('2023-11-14T22:13:23.000Z')
  })

  it('a captured side effect reaches the activity publisher', async () => {
    mounted = mountHarness()
    await emit(mounted, {
      type: 'activity',
      activity: {
        id: 'act-9',
        type: 'email',
        status: 'captured',
        recipient: 'ada@example.test',
        summary: 'Welcome aboard',
        timestamp: '2023-11-14T22:13:22.000Z',
      },
    })

    expect(mounted.activities).toHaveLength(1)
    expect(mounted.activities[0].id).toBe('act-9')
  })

  it('forwards ready_to_build, client_action and turn completion to the host', async () => {
    mounted = mountHarness()
    let ready = 0
    let turns = 0
    const actions: IdeClientAction[] = []
    mounted.props.onReadyToBuild = () => {
      ready++
    }
    mounted.props.onClientAction = (action) => {
      actions.push(action)
    }
    mounted.props.onTurnComplete = () => {
      turns++
    }

    await emit(mounted, { type: 'ready_to_build' })
    await emit(mounted, {
      type: 'client_action',
      action: 'preview_ui',
      requestId: 'req-7',
      command: 'fill',
      molId: 'login-email',
      selector: '#email',
      text: 'Email',
      value: 'ada@example.test',
      path: '/login',
    })
    await emit(mounted, DONE)

    expect(ready).toBe(1)
    expect(actions).toEqual([
      {
        action: 'preview_ui',
        path: '/login',
        requestId: 'req-7',
        command: 'fill',
        molId: 'login-email',
        selector: '#email',
        text: 'Email',
        value: 'ada@example.test',
      },
    ])
    expect(turns).toBe(1)
  })

  it('a pushed ready_to_build does not boot on the watching client', async () => {
    mounted = mountHarness()
    let ready = 0
    mounted.props.onReadyToBuild = () => {
      ready++
    }

    mounted.stream.applyingPushedRef.current = true
    try {
      await emit(mounted, { type: 'ready_to_build' })
    } finally {
      mounted.stream.applyingPushedRef.current = false
    }
    expect(ready).toBe(0)
  })

  it('a verification error drops the deferred preview message', async () => {
    mounted = mountHarness()
    mounted.autoFix.deferredPendingRef.current = 'The preview crashed on load'

    await emit(mounted, VERIFY_FAIL)

    expect(mounted.autoFix.deferredPendingRef.current).toBeNull()
  })

  it('a pushed verification error leaves the deferred preview message alone', async () => {
    mounted = mountHarness()
    mounted.autoFix.deferredPendingRef.current = 'The preview crashed on load'

    mounted.stream.applyingPushedRef.current = true
    try {
      await emit(mounted, VERIFY_FAIL)
    } finally {
      mounted.stream.applyingPushedRef.current = false
    }

    expect(mounted.autoFix.deferredPendingRef.current).toBe('The preview crashed on load')
  })
})

describe('5XX backoff-retry countdown banner', () => {
  it('renders the retry countdown and cancels it', async () => {
    mounted = mountHarness()
    expect(mounted.container.querySelector(RETRY_BANNER)).toBeNull()

    mounted.setRetryCountdown({ secondsRemaining: 5, attempt: 1 })
    await nextTick()

    const banner = mounted.container.querySelector(RETRY_BANNER)
    expect(banner, 'the retry countdown banner renders').not.toBeNull()
    expect(banner?.textContent).toContain('Server error — retrying in 5s… (attempt 1)')
    expect(banner?.textContent).toContain('Cancel')

    await click(mounted.container, '[data-mol-id="chat-retry-cancel"]')
    expect(mounted.cancelRetry).toHaveBeenCalledTimes(1)
  })
})
