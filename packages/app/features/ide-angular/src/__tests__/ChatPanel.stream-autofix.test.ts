// @vitest-environment jsdom
/**
 * Unit U5 of the ChatPanel port: `chat:stream` and `chat:auto-fix` — the
 * stream-event handler, the verification auto-fix countdown with its
 * auto-send, and the two countdown banners.
 *
 * The slices under test are the REAL ones: the harness provides them through
 * `ChatInnerState`, registers the countdown's effects at React's positions and
 * renders both banner components, so the ticks, the send and the DOM all run
 * through the unit's own code. Only the slices this unit READS are fakes: the
 * context-usage setters (checked through their recorded state) and the chat
 * slice's retry countdown with its cancel action.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  inject,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatRetryCountdown, ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { provideChat, provideDomPlacement, provideHttp } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { Activity, IdeClientAction } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatAutoFix } from '../components/chat-panel/chat-auto-fix.slice.js'
import { ChatAutoFixBanner } from '../components/chat-panel/chat-auto-fix-banner.component.js'
import { ChatChat } from '../components/chat-panel/chat-chat.slice.js'
import { ChatContextUsage } from '../components/chat-panel/chat-context-usage.slice.js'
import type { ChatEnvValues, ChatInnerProps } from '../components/chat-panel/chat-inner-state.js'
import { ChatInnerState } from '../components/chat-panel/chat-inner-state.js'
import { ChatRetryBanner } from '../components/chat-panel/chat-retry-banner.component.js'
import type { ChatStreamEventLike } from '../components/chat-panel/chat-stream.slice.js'
import { ChatStream } from '../components/chat-panel/chat-stream.slice.js'
import { buildChatProvider, buildRejectingHttpClient } from './chat-panel-harness.js'

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

/** A verification that passed. */
const VERIFY_OK: ChatStreamEventLike = {
  type: 'verification_result',
  status: 'ok',
  workspaces: [],
}

/** The end of a turn. */
const DONE: ChatStreamEventLike = { type: 'done' }

/** The fix message the countdown sends on its last second. */
const FIX_MESSAGE = `Fix these issues:\n\n${VERIFY_OUTPUT}`

/** The countdown's Pause, Resume and Cancel buttons. */
const PAUSE = '[data-mol-id="chat-autofix-pause"]'
const RESUME = '[data-mol-id="chat-autofix-resume"]'
const CANCEL = '[data-mol-id="chat-autofix-cancel"]'

/** The retry strip and its Cancel button. */
const RETRY_BANNER = '[data-mol-id="chat-retry-countdown"]'
const RETRY_CANCEL = '[data-mol-id="chat-retry-cancel"]'

/** The banner host elements (the port fills React's own root element). */
const AUTO_FIX_HOST = '[mol-chat-auto-fix-banner]'
const RETRY_HOST = '[mol-chat-retry-banner]'

/** The env every slice and section reads (only `t`, `locale` and `cm` matter here). */
const ENV: ChatEnvValues = {
  t: createSimpleI18nProvider('en').t,
  locale: signal('en'),
  cm: classMap,
  http: buildRejectingHttpClient(),
  themeMode: signal<'light' | 'dark'>('dark'),
  isLight: signal(false),
  isNarrow: signal(false),
  isCoarse: signal(false),
  popupMaxHeight: signal('140px'),
  hasConversation: signal(false),
  conversationId: signal(null),
  conversationIdRef: { current: null },
  transcriptOnly: signal(false),
  shareAllowed: signal(true),
}

/** The context-usage state the stream handler feeds (the fake the slice reads). */
class FakeContextUsage {
  /** The latest usage sample. */
  usage: ContextUsage | null = null

  /** Every usage sample, oldest first. */
  history: ContextUsage[] = []

  /** The conversation's completed compactions. */
  compactions: ContextCompaction[] = []

  /**
   * Sets the usage the ring shows.
   * @param next - The next value, or an updater over the current one.
   */
  setContextUsage(
    next: ContextUsage | null | ((previous: ContextUsage | null) => ContextUsage | null),
  ): void {
    this.usage = typeof next === 'function' ? next(this.usage) : next
  }

  /**
   * Sets the usage history.
   * @param next - The next value, or an updater over the current one.
   */
  setContextHistory(next: ContextUsage[] | ((previous: ContextUsage[]) => ContextUsage[])): void {
    this.history = typeof next === 'function' ? next(this.history) : next
  }

  /**
   * Sets the completed compactions.
   * @param next - The next value, or an updater over the current one.
   */
  setContextCompactions(
    next: ContextCompaction[] | ((previous: ContextCompaction[]) => ContextCompaction[]),
  ): void {
    this.compactions = typeof next === 'function' ? next(this.compactions) : next
  }
}

/** What the harness exposes to a case. */
interface Harness {
  /** The stream slice under test. */
  stream: ChatStream
  /** The auto-fix slice under test. */
  autoFix: ChatAutoFix
  /** The faked context-usage setters the stream writes to. */
  usage: FakeContextUsage
  /** The fix messages the countdown sent, in order. */
  sent: string[]
  /** The activities the stream published, in order. */
  activities: Activity[]
  /** The client actions the stream forwarded, in order. */
  clientActions: IdeClientAction[]
  /** How many turns the stream reported complete. */
  turnCompletes: () => number
  /** How many builds the stream requested. */
  readyToBuild: () => number
  /** Replaces the props (React's re-render with new props), then flushes. */
  setProps: (next: Partial<ChatInnerProps>) => Promise<void>
  /** Sets the retry countdown the chat slice reports, then flushes. */
  setRetryCountdown: (value: ChatRetryCountdown | null) => Promise<void>
  /** The cancel-retry spy. */
  cancelRetry: ReturnType<typeof vi.fn>
  /** The mounted host element. */
  container: HTMLElement
  /** Runs one change-detection pass and drains the scheduler and effect queue. */
  flush: () => Promise<void>
  /** Unmounts the harness. */
  unmount: () => void
}

/**
 * Mounts the real `chat:stream` and `chat:auto-fix` slices over a minimal
 * environment, registering the countdown's effects in React's order and
 * rendering both banners.
 *
 * @param options - Whether the viewer may edit (React's `canEdit`).
 * @returns The harness.
 */
async function mountHarness(options: { canEdit?: boolean } = {}): Promise<Harness> {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)

  const usage = new FakeContextUsage()
  const retry = signal<ChatRetryCountdown | null>(null)
  const cancelRetry = vi.fn()
  const sent: string[] = []
  const activities: Activity[] = []
  const clientActions: IdeClientAction[] = []
  let turnCompletes = 0
  let readyToBuild = 0

  const props = signal<ChatInnerProps>({
    projectId: 'proj-u5',
    endpoint: '/projects/proj-u5/chat',
    canEdit: options.canEdit ?? true,
    onReadyToBuild: () => {
      readyToBuild++
    },
    onClientAction: (action) => {
      clientActions.push(action)
    },
    onTurnComplete: () => {
      turnCompletes++
    },
  })

  /**
   * The harness: it provides the slices, publishes the env and registers the
   * countdown's two effects where `ChatInner` declares them.
   */
  const U5Harness = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-u5-harness]',
    standalone: true,
    imports: [ChatAutoFixBanner, ChatRetryBanner],
    providers: [
      ChatInnerState,
      ChatStream,
      ChatAutoFix,
      { provide: ChatContextUsage, useValue: usage },
      { provide: ChatChat, useValue: { retryCountdown: () => retry(), cancelRetry } },
    ],
    // prettier-ignore
    template: `<div mol-chat-auto-fix-banner></div><div mol-chat-retry-banner></div>`,
  })(
    class U5HarnessComponent {
      /** The shared state the slices and sections read. */
      private readonly state = inject(ChatInnerState)

      /** The stream slice under test. */
      readonly stream = inject(ChatStream)

      /** The auto-fix slice under test. */
      readonly autoFix = inject(ChatAutoFix)

      /** Publishes the env and the props, then registers the two effects. */
      constructor() {
        this.state.env = ENV
        this.state.props.set(props())
        this.autoFix.effects[1]()
        this.autoFix.effects[2]()
      }

      /**
       * Replaces the props this panel renders with, then lets them reach the
       * shared state (React's re-render with new props).
       *
       * @param next - The props to merge over the current ones.
       */
      setProps(next: Partial<ChatInnerProps>): void {
        props.update((current) => ({ ...current, ...next }))
        this.state.props.set(props())
      }
    },
  )

  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideHttp(buildRejectingHttpClient()),
      provideChat(buildChatProvider([])),
    ],
  })
  const ref = createComponent(U5Harness, { environmentInjector: appRef.injector })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()

  const instance = ref.instance
  instance.autoFix.sendMessageRef.current = (message) => {
    sent.push(message)
  }
  instance.stream.addActivityCardRef.current = (activity) => {
    activities.push(activity)
  }

  /**
   * Runs one change-detection pass and lets the scheduler and effect queue drain.
   */
  const flush = async (): Promise<void> => {
    appRef.tick()
    for (let index = 0; index < 4; index++) await Promise.resolve()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    appRef.tick()
  }

  await flush()

  return {
    stream: instance.stream,
    autoFix: instance.autoFix,
    usage,
    sent,
    activities,
    clientActions,
    turnCompletes: () => turnCompletes,
    readyToBuild: () => readyToBuild,
    setProps: async (next) => {
      instance.setProps(next)
      await flush()
    },
    setRetryCountdown: async (value) => {
      retry.set(value)
      await flush()
    },
    cancelRetry,
    container,
    flush,
    unmount: () => {
      appRef.destroy()
      container.remove()
      document.body.innerHTML = ''
    },
  }
}

/**
 * Waits, then flushes the render.
 *
 * @param harness - The mounted harness.
 * @param ms - How long to let pass.
 */
async function wait(harness: Harness, ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
  await harness.flush()
}

/**
 * Reads the auto-fix banner's label, or `null` when the strip is not shown.
 *
 * @param container - The harness container.
 * @returns The label text.
 */
function autoFixText(container: HTMLElement): string | null {
  const button = container.querySelector(`${PAUSE}, ${RESUME}`)
  const banner = button?.parentElement ?? null
  if (!banner) return null
  return (banner.querySelector('span')?.textContent ?? '').trim()
}

/**
 * Clicks an element and flushes the render.
 *
 * @param harness - The mounted harness.
 * @param selector - The element's selector.
 */
async function click(harness: Harness, selector: string): Promise<void> {
  const element = harness.container.querySelector<HTMLElement>(selector)
  expect(element, `${selector} renders`).not.toBeNull()
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await harness.flush()
}

/**
 * Plays a failed verification and the end of the turn, arming the countdown.
 *
 * @param harness - The mounted harness.
 */
async function failVerification(harness: Harness): Promise<void> {
  harness.stream.handleStreamEvent(VERIFY_FAIL)
  harness.stream.handleStreamEvent(DONE)
  await harness.flush()
}

/** The mounted harness for the current case. */
let mounted: Harness | null = null

describe('ChatPanel chat:stream and chat:auto-fix (unit U5)', () => {
  beforeEach(() => {
    setClassMap(classMap)
    setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
    setProvider(createSimpleI18nProvider('en'))
    Element.prototype.scrollIntoView = (): void => {}
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = null
    vi.restoreAllMocks()
  })

  it('arms the countdown from a failed verification and renders the strip', async () => {
    mounted = await mountHarness()

    expect(autoFixText(mounted.container)).toBeNull()
    // React renders nothing while closed: the host is out of the DOM, not a
    // `display: contents` wrapper.
    expect(mounted.container.querySelector(AUTO_FIX_HOST)).toBeNull()

    await failVerification(mounted)

    expect(autoFixText(mounted.container)).toBe('Auto-fixing in 3s...')
    const host = mounted.container.querySelector(AUTO_FIX_HOST)
    expect(host).not.toBeNull()
    expect(host?.getAttribute('class')).toBeTruthy()
    expect(host?.getAttribute('style')).toContain('gap: 8px')
    expect(mounted.container.querySelector(PAUSE)).not.toBeNull()
    expect(mounted.container.querySelector(CANCEL)).not.toBeNull()
  }, 30_000)

  it('ticks down one second at a time and sends the fix message on the last second', async () => {
    mounted = await mountHarness()

    await failVerification(mounted)
    expect(autoFixText(mounted.container)).toBe('Auto-fixing in 3s...')

    await wait(mounted, 1_200)
    expect(autoFixText(mounted.container)).toBe('Auto-fixing in 2s...')
    expect(mounted.sent).toEqual([])

    await wait(mounted, 2_800)
    expect(mounted.sent).toEqual([FIX_MESSAGE])
    expect(autoFixText(mounted.container)).toBeNull()
  }, 30_000)

  it('pauses, holds, and resumes at three seconds', async () => {
    mounted = await mountHarness()

    await failVerification(mounted)
    await click(mounted, PAUSE)
    expect(autoFixText(mounted.container)).toBe('Auto-fix paused')
    expect(mounted.container.querySelector(RESUME)).not.toBeNull()

    await wait(mounted, 2_000)
    expect(autoFixText(mounted.container)).toBe('Auto-fix paused')
    expect(mounted.sent).toEqual([])

    await click(mounted, RESUME)
    expect(autoFixText(mounted.container)).toBe('Auto-fixing in 3s...')
  }, 30_000)

  it('cancels without sending, and a clean verification never arms the countdown', async () => {
    mounted = await mountHarness()

    await failVerification(mounted)
    await click(mounted, CANCEL)
    await wait(mounted, 1_200)
    expect(autoFixText(mounted.container)).toBeNull()
    expect(mounted.sent).toEqual([])

    mounted.stream.handleStreamEvent(VERIFY_FAIL)
    mounted.stream.handleStreamEvent(VERIFY_OK)
    mounted.stream.handleStreamEvent(DONE)
    await mounted.flush()
    expect(autoFixText(mounted.container)).toBeNull()
  }, 30_000)

  it('pauses when the user starts typing', async () => {
    mounted = await mountHarness()

    await failVerification(mounted)
    mounted.autoFix.handleAutoFixPauseOnInput()
    await mounted.flush()
    expect(autoFixText(mounted.container)).toBe('Auto-fix paused')
  }, 30_000)

  it('drops the countdown at zero on a read-only client without sending', async () => {
    mounted = await mountHarness({ canEdit: false })

    await failVerification(mounted)
    await wait(mounted, 3_800)
    expect(mounted.sent).toEqual([])
    expect(autoFixText(mounted.container)).toBeNull()
  }, 30_000)

  it('sends nothing after an unmount mid-countdown', async () => {
    mounted = await mountHarness()

    await failVerification(mounted)
    const sent = mounted.sent
    mounted.unmount()
    mounted = null
    await new Promise<void>((resolve) => setTimeout(resolve, 3_800))
    expect(sent).toEqual([])
  }, 30_000)

  it("never arms from a teammate's pushed verification and never boots from a pushed ready_to_build", async () => {
    mounted = await mountHarness()

    const stream = mounted.stream
    stream.applyingPushedRef.current = true
    try {
      stream.handleStreamEvent(VERIFY_FAIL)
      stream.handleStreamEvent({ type: 'ready_to_build' })
      stream.handleStreamEvent(DONE)
    } finally {
      stream.applyingPushedRef.current = false
    }
    await mounted.flush()

    expect(autoFixText(mounted.container)).toBeNull()
    expect(mounted.readyToBuild()).toBe(0)
  }, 30_000)

  it('applies the stream effects in order and forwards every host callback', async () => {
    mounted = await mountHarness()

    const usage: ContextUsage = {
      requestId: 'r9',
      at: '2023-11-14T22:13:21.000Z',
      inputTokens: 5_000,
      contextWindow: 100_000,
    }
    mounted.stream.handleStreamEvent({ type: 'context_usage', usage })
    mounted.stream.handleStreamEvent({
      type: 'compaction',
      at: '2023-11-14T22:13:23.000Z',
      compactedCount: 10,
      elapsedMs: 3_000,
      beforeChars: 50_000,
      afterChars: 5_000,
    })
    mounted.stream.handleStreamEvent({
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
    mounted.stream.handleStreamEvent({ type: 'ready_to_build' })
    mounted.stream.handleStreamEvent({
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
    mounted.stream.handleStreamEvent(DONE)

    expect(mounted.usage.usage).toEqual(usage)
    expect(mounted.usage.history).toHaveLength(1)
    expect(mounted.usage.compactions).toHaveLength(1)
    expect(mounted.activities.map((activity) => activity.id)).toEqual(['act-9'])
    expect(mounted.readyToBuild()).toBe(1)
    expect(mounted.clientActions).toEqual([
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
    expect(mounted.turnCompletes()).toBe(1)
  }, 30_000)

  it('renders the retry strip and cancels the pending retry', async () => {
    mounted = await mountHarness()

    expect(mounted.container.querySelector(RETRY_BANNER)).toBeNull()

    await mounted.setRetryCountdown({ secondsRemaining: 4, attempt: 2 })

    const banner = mounted.container.querySelector(RETRY_BANNER)
    expect(banner).not.toBeNull()
    expect((banner?.querySelector('span')?.textContent ?? '').trim()).toBe(
      'Server error — retrying in 4s… (attempt 2)',
    )
    // While shown the host is React's own strip root, with no unwrap marker.
    expect(mounted.container.querySelector(RETRY_HOST)).not.toBeNull()

    await click(mounted, RETRY_CANCEL)
    expect(mounted.cancelRetry).toHaveBeenCalledTimes(1)
  }, 30_000)
})
