// @vitest-environment jsdom
/**
 * ChatPanel unit U5 — the stream-event handler, the verification auto-fix
 * countdown and the two countdown banners.
 *
 * The slice cases mount one real slice over a small context (the harness the
 * mount-requests suite uses) so the handler's own state writes, the host
 * callbacks it forwards and the one-second timer are asserted without the
 * units the rest of the panel still stubs. The banner cases mount the real
 * section components over a real context and compare the DOM React renders for
 * the same countdown, then drive the Pause, Resume and Cancel controls.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  BackgroundTaskState,
  ChatErrorMeta,
  ChatMessage,
  ChatMode,
  ChatRetryCountdown,
} from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatAutoFixSlice } from '../components/chat-panel/chat-auto-fix.svelte.js'
import { createChatAutoFix } from '../components/chat-panel/chat-auto-fix.svelte.js'
import type { ChatChatSlice } from '../components/chat-panel/chat-chat.svelte.js'
import type { ChatContextUsageSlice } from '../components/chat-panel/chat-context-usage.svelte.js'
import { createChatContextUsage } from '../components/chat-panel/chat-context-usage.svelte.js'
import type { ChatEnvSlice } from '../components/chat-panel/chat-env.svelte.js'
import type { ChatStreamSlice } from '../components/chat-panel/chat-stream.svelte.js'
import { createChatStream } from '../components/chat-panel/chat-stream.svelte.js'
import ChatAutoFixBanner from '../components/chat-panel/ChatAutoFixBanner.svelte'
import ChatRetryBanner from '../components/chat-panel/ChatRetryBanner.svelte'
import type {
  ChatContext,
  ChatInnerProps,
  MutableRef,
} from '../components/chat-panel/context.svelte.js'
import { ChatContext as ChatContextClass } from '../components/chat-panel/context.svelte.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  makeStorage,
} from './chat-panel-harness.js'
import SliceHarness from './ChatSliceHarness.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** A harness mount alive right now. */
interface SliceMount {
  /** Unmounts the harness. */
  unmount: () => void
}

/** Harnesses alive right now. */
const harnesses: SliceMount[] = []

/**
 * The inline style as declarations, the way the conformance kit compares it: a
 * framework may add a trailing `;` (Svelte does on a spread attribute), which
 * carries no style.
 *
 * @param element - The element whose `style` attribute to read.
 * @returns The trimmed, non-empty declarations joined with `; `.
 */
function styleText(element: Element | null): string {
  return (element?.getAttribute('style') ?? '')
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .sort()
    .join('; ')
}

/** Banners mounted right now (each is unmounted in teardown). */
const banners: (() => void)[] = []

/** The context usage sample a `context_usage` event carries. */
const USAGE = {
  requestId: 'r9',
  at: '2023-11-14T22:13:21.000Z',
  inputTokens: 5_000,
  contextWindow: 100_000,
  backgroundCompactAtTokens: 10_000,
}

/**
 * Builds the fixed env the sections read (the harness's own env, without the
 * Svelte context providers a slice context needs).
 *
 * @returns The env slice.
 */
function buildEnv(): ChatEnvSlice {
  const provider = createSimpleI18nProvider('en')
  return {
    t: provider.t,
    locale: 'en',
    cm: classMap,
    http: buildRejectingHttpClient(),
    themeMode: 'light',
    isLight: true,
    isNarrow: false,
    isCoarse: false,
    popupMaxHeight: '70vh',
    hasConversation: false,
    conversationId: null,
    conversationIdRef: { current: null },
    transcriptOnly: false,
    shareAllowed: true,
    mount(): void {
      // The sections never mount the env slice.
    },
    effects: { 1: () => {} },
  }
}

/**
 * Builds a context over fixed inner props, with the env already resolved.
 *
 * @param props - The inner props the context reads.
 * @returns The fresh context.
 */
function buildContext(props: Partial<ChatInnerProps> = {}): ChatContext {
  const innerProps: ChatInnerProps = {
    projectId: 'p1',
    endpoint: '/projects/p1/chat',
    ...props,
  }
  const ctx = new ChatContextClass(() => innerProps)
  ctx.env = buildEnv()
  return ctx
}

/**
 * Mounts one slice over a small context, as the mount-requests suite does.
 *
 * @param props - The inner props.
 * @param build - Creates the slices under test from the context.
 * @returns The harness mount.
 */
function mountSlice(props: Partial<ChatInnerProps>, build: (ctx: ChatContext) => void): SliceMount {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const innerProps: ChatInnerProps = { projectId: 'p1', endpoint: '/projects/p1/chat', ...props }
  const instance = mount(SliceHarness, {
    target: container,
    props: {
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      theme: buildThemeProvider(),
      props: innerProps,
      build,
    },
  })
  flushSync()
  const handle: SliceMount = {
    unmount: () => {
      void unmount(instance)
      document.body.innerHTML = ''
    },
  }
  harnesses.push(handle)
  return handle
}

/**
 * Mounts a section component over a context.
 *
 * @param component - The section component.
 * @param ctx - The shared context.
 * @returns The mount target the section rendered into.
 */
function mountSection(component: Component<{ ctx: ChatContext }>, ctx: ChatContext): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(component, { target: container, props: { ctx } })
  flushSync()
  banners.push(() => {
    void unmount(instance)
    document.body.innerHTML = ''
  })
  return container
}

/**
 * Builds a chat-slice fake holding only what the retry banner reads.
 *
 * @param retryCountdown - The pending retry, or null.
 * @param onCancel - Records the banner's cancel call.
 * @returns The fake slice.
 */
function fakeChatSlice(
  retryCountdown: ChatRetryCountdown | null,
  onCancel: () => void,
): ChatChatSlice {
  const debouncedFetchPendingFilesRef: MutableRef<(() => void) | null> = { current: null }
  return {
    messages: [] as ChatMessage[],
    isLoading: false,
    isRemoteStreaming: false,
    error: null,
    errorMeta: null as ChatErrorMeta | null,
    mode: 'execute' as ChatMode,
    fastMode: false,
    streamingStatus: null,
    backgroundTasks: [] as BackgroundTaskState[],
    retryCountdown,
    noteRemoteStreamEvent(): void {},
    setMode(): void {},
    setFastMode(): void {},
    async sendMessage(): Promise<void> {},
    cancelRetry: onCancel,
    async clearHistory(): Promise<void> {},
    editQueuedMessage(): void {},
    deleteQueuedMessage(): void {},
    clearQueuedForFile(): void {},
    applyRemoteEvent(): void {},
    async reconcileHistory(): Promise<void> {},
    debouncedFetchPendingFilesRef,
    liveModelMode: 'execute',
    settingsPatchUrl: (): string => '/projects/p1',
    async sendLatestMessage(): Promise<void> {},
    handleAbort(): void {},
    handleAskUserResponse(): void {},
    mount(): void {},
    effects: { 1: () => {} },
  }
}

beforeEach(() => {
  setClassMap(classMap)
  // The banners render the bonded warning glyph; a name-keyed proxy set keeps
  // the icons from needing a concrete bond package here.
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
  setProvider(createSimpleI18nProvider('en'))
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  for (const unmountBanner of banners.splice(0)) unmountBanner()
  for (const harness of harnesses.splice(0)) harness.unmount()
  vi.useRealTimers()
})

describe('the stream-event handler', () => {
  /**
   * Builds the slices a stream case reads: the real handler, the real usage
   * state and the real countdown.
   *
   * @param props - The inner props (the host callbacks recorded here).
   * @returns The mounted context and its slices, once the harness mounted.
   */
  function mountStream(props: Partial<ChatInnerProps> = {}): {
    ctx: ChatContext
    stream: ChatStreamSlice
    autoFix: ChatAutoFixSlice
    usage: ChatContextUsageSlice
  } {
    const captured: {
      ctx?: ChatContext
      stream?: ChatStreamSlice
      autoFix?: ChatAutoFixSlice
      usage?: ChatContextUsageSlice
    } = {}
    mountSlice(props, (ctx) => {
      ctx.contextUsage = createChatContextUsage(ctx)
      ctx.autoFix = createChatAutoFix(ctx)
      ctx.stream = createChatStream(ctx)
      captured.ctx = ctx
      captured.stream = ctx.stream
      captured.autoFix = ctx.autoFix
      captured.usage = ctx.contextUsage
    })
    if (!captured.ctx || !captured.stream || !captured.autoFix || !captured.usage)
      throw new Error('stream slice harness did not mount')
    return {
      ctx: captured.ctx,
      stream: captured.stream,
      autoFix: captured.autoFix,
      usage: captured.usage,
    }
  }

  it('applies a context_usage sample to the ring and its history', async () => {
    const { stream, usage } = mountStream()
    stream.handleStreamEvent({ type: 'context_usage', usage: USAGE })
    await flush()
    expect(usage.contextUsage).toEqual(USAGE)
    expect(usage.contextHistory).toEqual([USAGE])
  })

  it('merges the done event usage into the ring', async () => {
    const { stream, usage } = mountStream()
    stream.handleStreamEvent({ type: 'context_usage', usage: USAGE })
    await flush()
    const doneUsage = {
      ...USAGE,
      inputTokens: 6_000,
      outputTokens: 120,
      at: '2023-11-14T22:13:25.000Z',
    }
    stream.handleStreamEvent({ type: 'done', usage: doneUsage })
    await flush()
    expect(usage.contextUsage).toEqual(doneUsage)
  })

  it('lists a compaction in the usage breakdown', async () => {
    const { stream, usage } = mountStream()
    stream.handleStreamEvent({
      type: 'compaction',
      at: '2023-11-14T22:13:23.000Z',
      compactedCount: 10,
      remainingCount: 2,
      summary: '',
      elapsedMs: 3_000,
      beforeChars: 50_000,
      afterChars: 5_000,
    })
    await flush()
    expect(usage.contextCompactions).toEqual([
      {
        at: '2023-11-14T22:13:23.000Z',
        compactedCount: 10,
        elapsedMs: 3_000,
        beforeChars: 50_000,
        afterChars: 5_000,
      },
    ])
  })

  it('arms the countdown from a failed verification once the turn ends', async () => {
    const { stream, autoFix } = mountStream()
    stream.handleStreamEvent({
      type: 'verification_result',
      status: 'error',
      output: 'src/app.ts(4,11): error TS2304',
      workspaces: [],
      categories: ['type'],
      changedPaths: ['src/app.ts'],
    })
    await flush()
    expect(autoFix.autoFixCountdown).toBeNull()
    stream.handleStreamEvent({ type: 'done' })
    await flush()
    expect(autoFix.autoFixCountdown).toEqual({
      output: 'src/app.ts(4,11): error TS2304',
      categories: ['type'],
      changedPaths: ['src/app.ts'],
      secondsLeft: 3,
      paused: false,
    })
  })

  it('never arms the countdown from a pushed verification', async () => {
    const { stream, autoFix } = mountStream()
    stream.applyingPushedRef.current = true
    stream.handleStreamEvent({
      type: 'verification_result',
      status: 'error',
      output: 'src/app.ts(4,11): error TS2304',
      workspaces: [],
    })
    stream.handleStreamEvent({ type: 'done' })
    await flush()
    expect(autoFix.autoFixCountdown).toBeNull()
  })

  it('drops a deferred preview error when a failed verification has output', async () => {
    const { stream, autoFix } = mountStream()
    autoFix.deferredPendingRef.current = 'The preview crashed on load'
    stream.handleStreamEvent({
      type: 'verification_result',
      status: 'error',
      output: 'src/app.ts(4,11): error TS2304',
      workspaces: [],
    })
    expect(autoFix.deferredPendingRef.current).toBeNull()
  })

  it('forwards ready_to_build, client_action and turn-complete to the host', async () => {
    const ready: string[] = []
    const actions: unknown[] = []
    const completed: string[] = []
    const { stream } = mountStream({
      onReadyToBuild: () => {
        ready.push('ready')
      },
      onClientAction: (action) => {
        actions.push(action)
      },
      onTurnComplete: () => {
        completed.push('complete')
      },
    })
    stream.handleStreamEvent({ type: 'ready_to_build' })
    stream.handleStreamEvent({
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
    stream.handleStreamEvent({ type: 'done' })
    await flush()
    expect(ready).toEqual(['ready'])
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
    expect(completed).toEqual(['complete'])
  })

  it('does not boot the sandbox from a pushed ready_to_build', async () => {
    const ready: string[] = []
    const { stream } = mountStream({
      onReadyToBuild: () => {
        ready.push('ready')
      },
    })
    stream.applyingPushedRef.current = true
    stream.handleStreamEvent({ type: 'ready_to_build' })
    await flush()
    expect(ready).toEqual([])
  })

  it('adds a captured side effect through the activity adder ref', async () => {
    const added: unknown[] = []
    const { stream } = mountStream()
    stream.addActivityCardRef.current = (activity): void => {
      added.push(activity)
    }
    stream.handleStreamEvent({
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
    await flush()
    expect(added).toEqual([
      expect.objectContaining({ id: 'act-9', type: 'email', status: 'captured' }),
    ])
  })
})

describe('the auto-fix countdown', () => {
  /**
   * Mounts the real countdown slice with its two effects at React's positions.
   *
   * @param props - The inner props (the read-only gate).
   * @returns The slice and the harness mount.
   */
  function mountAutoFix(props: Partial<ChatInnerProps> = {}): {
    autoFix: ChatAutoFixSlice
    mount: SliceMount
  } {
    const captured: { autoFix?: ChatAutoFixSlice } = {}
    const handle = mountSlice(props, (ctx) => {
      ctx.autoFix = createChatAutoFix(ctx)
      captured.autoFix = ctx.autoFix
      ctx.autoFix.mount()
      ctx.autoFix.effects[1]()
      ctx.autoFix.effects[2]()
    })
    if (!captured.autoFix) throw new Error('auto-fix slice harness did not mount')
    return { autoFix: captured.autoFix, mount: handle }
  }

  /**
   * Arms a three-second countdown on the slice.
   *
   * @param autoFix - The countdown slice.
   */
  function arm(autoFix: ChatAutoFixSlice): void {
    autoFix.dispatchAutoFix({
      type: 'verificationResult',
      status: 'error',
      output: 'TS2304: Cannot find name "quizzer"',
      categories: ['type'],
      changedPaths: ['src/app.ts'],
      applyingPushed: false,
    })
    autoFix.dispatchAutoFix({ type: 'done' })
  }

  it('keeps the running second when an unrelated reducer update lands', async () => {
    vi.useFakeTimers()
    const { autoFix } = mountAutoFix()
    await flush()
    arm(autoFix)
    await flush()
    // 900 ms into the first second: no tick yet.
    await vi.advanceTimersByTimeAsync(900)
    await flush()
    expect(autoFix.autoFixCountdown?.secondsLeft).toBe(3)
    // React's effect depends only on [paused, secondsLeft]; a new pending error
    // (same countdown object) must not restart the one-second timer.
    autoFix.dispatchAutoFix({
      type: 'verificationResult',
      status: 'error',
      output: 'TS2345: Argument of type string',
      categories: ['type'],
      changedPaths: ['src/other.ts'],
      applyingPushed: false,
    })
    await flush()
    expect(autoFix.autoFixCountdown?.secondsLeft).toBe(3)
    await vi.advanceTimersByTimeAsync(100)
    await flush()
    expect(autoFix.autoFixCountdown?.secondsLeft).toBe(2)
  })

  it('ticks once a second and sends the fix message on the last second', async () => {
    vi.useFakeTimers()
    const sent: unknown[][] = []
    const { autoFix } = mountAutoFix()
    autoFix.sendMessageRef.current = async (...args): Promise<void> => {
      sent.push(args)
    }
    await flush()
    arm(autoFix)
    await flush()
    expect(autoFix.autoFixCountdown?.secondsLeft).toBe(3)

    await vi.advanceTimersByTimeAsync(1_000)
    await flush()
    expect(autoFix.autoFixCountdown?.secondsLeft).toBe(2)
    await vi.advanceTimersByTimeAsync(1_000)
    await flush()
    expect(autoFix.autoFixCountdown?.secondsLeft).toBe(1)
    expect(sent).toEqual([])

    await vi.advanceTimersByTimeAsync(1_000)
    await flush()
    expect(autoFix.autoFixCountdown).toBeNull()
    expect(sent).toEqual([
      ['Fix these issues:\n\nTS2304: Cannot find name "quizzer"', undefined, { automatic: true }],
    ])
  })

  it('holds the countdown while paused and restarts at three on resume', async () => {
    vi.useFakeTimers()
    const sent: unknown[][] = []
    const { autoFix } = mountAutoFix()
    autoFix.sendMessageRef.current = async (...args): Promise<void> => {
      sent.push(args)
    }
    await flush()
    arm(autoFix)
    await flush()
    autoFix.handleAutoFixPauseOnInput()
    await flush()
    expect(autoFix.autoFixCountdown?.paused).toBe(true)
    await vi.advanceTimersByTimeAsync(5_000)
    await flush()
    expect(autoFix.autoFixCountdown?.secondsLeft).toBe(3)
    expect(sent).toEqual([])

    autoFix.dispatchAutoFix({ type: 'resume' })
    await flush()
    expect(autoFix.autoFixCountdown).toEqual(
      expect.objectContaining({ secondsLeft: 3, paused: false }),
    )
  })

  it('sends nothing from a read-only client', async () => {
    vi.useFakeTimers()
    const sent: unknown[][] = []
    const { autoFix } = mountAutoFix({ canEdit: false })
    autoFix.sendMessageRef.current = async (...args): Promise<void> => {
      sent.push(args)
    }
    await flush()
    arm(autoFix)
    await flush()
    await vi.advanceTimersByTimeAsync(3_000)
    await flush()
    expect(autoFix.autoFixCountdown).toBeNull()
    expect(sent).toEqual([])
  })

  it('sends nothing after unmount', async () => {
    vi.useFakeTimers()
    const sent: unknown[][] = []
    const { autoFix, mount: handle } = mountAutoFix()
    autoFix.sendMessageRef.current = async (...args): Promise<void> => {
      sent.push(args)
    }
    await flush()
    arm(autoFix)
    await flush()
    handle.unmount()
    const index = harnesses.indexOf(handle)
    if (index >= 0) harnesses.splice(index, 1)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(sent).toEqual([])
  })

  it('cancelling clears the countdown without sending', async () => {
    vi.useFakeTimers()
    const sent: unknown[][] = []
    const { autoFix } = mountAutoFix()
    autoFix.sendMessageRef.current = async (...args): Promise<void> => {
      sent.push(args)
    }
    await flush()
    arm(autoFix)
    await flush()
    autoFix.dispatchAutoFix({ type: 'cancel' })
    await flush()
    await vi.advanceTimersByTimeAsync(5_000)
    await flush()
    expect(autoFix.autoFixCountdown).toBeNull()
    expect(sent).toEqual([])
  })
})

describe('the auto-fix countdown banner', () => {
  it('renders React’s strip and drives pause, resume and cancel', async () => {
    const ctx = buildContext()
    ctx.autoFix = createChatAutoFix(ctx)
    ctx.autoFix.dispatchAutoFix({
      type: 'verificationResult',
      status: 'error',
      output: 'src/app.ts(4,11): error TS2304',
      categories: ['type'],
      changedPaths: ['src/app.ts'],
      applyingPushed: false,
    })
    ctx.autoFix.dispatchAutoFix({ type: 'done' })
    const container = mountSection(ChatAutoFixBanner, ctx)

    const strip = container.firstElementChild as HTMLElement | null
    expect(strip?.tagName).toBe('DIV')
    expect(strip?.className).toBe(classMap.cn(classMap.shrink0, classMap.borderT))
    expect(strip?.getAttribute('style')).toBe(
      'align-items: center; background: rgba(234, 179, 8, 0.06); display: flex; font-size: 12px; gap: 8px; padding: 6px 12px',
    )
    expect(strip?.style.display).toBe('flex')
    expect(strip?.style.alignItems).toBe('center')
    expect(strip?.style.gap).toBe('8px')
    expect(strip?.style.padding).toBe('6px 12px')
    expect(strip?.style.fontSize).toBe('12px')

    const icon = strip?.firstElementChild as SVGElement | null
    expect(icon?.tagName.toLowerCase()).toBe('svg')
    expect(icon?.getAttribute('width')).toBe('14')
    expect(icon?.getAttribute('height')).toBe('14')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(styleText(icon)).toBe('color: rgb(212, 160, 23); flex-shrink: 0')

    const label = strip?.children[1] as HTMLElement | null
    expect(label?.tagName).toBe('SPAN')
    expect(styleText(label)).toBe('flex: 1 1 0%; opacity: 0.85')
    expect(label?.textContent?.trim()).toBe('Auto-fixing in 3s...')

    const pause = container.querySelector('[data-mol-id="chat-autofix-pause"]') as HTMLElement
    expect(pause.textContent?.trim()).toBe('Pause')
    expect(pause.getAttribute('type')).toBe('button')
    expect(pause.className).toBe(
      classMap.cn(
        classMap.button({ variant: 'solid', color: 'warning', size: 'xs' }),
        classMap.touchTargetCompact,
      ),
    )
    const cancel = container.querySelector('[data-mol-id="chat-autofix-cancel"]') as HTMLElement
    expect(cancel.textContent?.trim()).toBe('Cancel')
    expect(cancel.className).toBe(
      classMap.cn(
        classMap.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
        classMap.touchTargetCompact,
      ),
    )

    pause.click()
    await flush()
    expect(ctx.autoFix.autoFixCountdown?.paused).toBe(true)
    expect((container.firstElementChild?.children[1] as HTMLElement).textContent?.trim()).toBe(
      'Auto-fix paused',
    )
    const resume = container.querySelector('[data-mol-id="chat-autofix-resume"]') as HTMLElement
    expect(resume.textContent?.trim()).toBe('Resume')
    expect(resume.className).toBe(
      classMap.cn(
        classMap.button({ variant: 'solid', color: 'primary', size: 'xs' }),
        classMap.touchTargetCompact,
      ),
    )

    resume.click()
    await flush()
    expect(ctx.autoFix.autoFixCountdown).toEqual(
      expect.objectContaining({ paused: false, secondsLeft: 3 }),
    )

    cancel.click()
    await flush()
    expect(ctx.autoFix.autoFixCountdown).toBeNull()
    expect(container.firstElementChild).toBeNull()
  })
})

describe('the retry banner', () => {
  it('renders React’s retry strip and cancels through the chat slice', async () => {
    let cancelled = 0
    const ctx = buildContext()
    ctx.chat = fakeChatSlice({ secondsRemaining: 4, attempt: 2 }, () => {
      cancelled += 1
    })
    const container = mountSection(ChatRetryBanner, ctx)

    const strip = container.firstElementChild as HTMLElement | null
    expect(strip?.tagName).toBe('DIV')
    expect(strip?.className).toBe(classMap.cn(classMap.shrink0, classMap.borderT))
    expect(strip?.getAttribute('data-mol-id')).toBe('chat-retry-countdown')
    expect(strip?.getAttribute('style')).toBe(
      'align-items: center; background: rgba(234, 179, 8, 0.06); display: flex; font-size: 12px; gap: 8px; padding: 6px 12px',
    )
    expect(strip?.style.display).toBe('flex')

    const icon = strip?.firstElementChild as SVGElement | null
    expect(icon?.tagName.toLowerCase()).toBe('svg')
    expect(icon?.getAttribute('width')).toBe('14')
    expect(styleText(icon)).toBe('color: rgb(212, 160, 23); flex-shrink: 0')

    const label = strip?.children[1] as HTMLElement | null
    expect(styleText(label)).toBe('flex: 1 1 0%; opacity: 0.85')
    expect(label?.textContent?.trim()).toBe('Server error — retrying in 4s… (attempt 2)')

    const cancel = container.querySelector('[data-mol-id="chat-retry-cancel"]') as HTMLElement
    expect(cancel.textContent?.trim()).toBe('Cancel')
    expect(cancel.className).toBe(
      classMap.cn(
        classMap.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
        classMap.touchTargetCompact,
      ),
    )
    cancel.click()
    expect(cancelled).toBe(1)
  })
})
