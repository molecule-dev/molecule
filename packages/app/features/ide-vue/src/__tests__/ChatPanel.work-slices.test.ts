// @vitest-environment jsdom
/**
 * ChatPanel unit U15 — the git, auto-commit and undo slices, driven directly.
 *
 * The conformance cases for these slices type a slash command and press Enter,
 * which belongs to another unit's composer keyboard listener; these
 * slice-level cases cover the same behaviour through the slices' own entry
 * points, so the commit actions, the cadence PATCH, the countdown and the undo
 * writes are each checked without the keyboard.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createApp, defineComponent, h, nextTick, ref, shallowReactive } from 'vue'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { AutoFixCountdown } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { moleculePlugin, resetChatStoresForTests, useTranslation } from '@molecule/app-vue'

import type { ChatCtx, ChatInnerProps } from '../components/chat-panel/context.js'
import type { ChatAutoCommitSlice } from '../components/chat-panel/use-chat-auto-commit.js'
import { createChatAutoCommit } from '../components/chat-panel/use-chat-auto-commit.js'
import type { ChatGitSlice } from '../components/chat-panel/use-chat-git.js'
import { createChatGit } from '../components/chat-panel/use-chat-git.js'
import type { ChatUndoSlice } from '../components/chat-panel/use-chat-undo.js'
import { createChatUndo } from '../components/chat-panel/use-chat-undo.js'
import { buildChatProvider, makeStorage, responseOf } from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** One recorded HTTP call. */
interface Recorded {
  /** The method, uppercased. */
  method: string
  /** The requested path. */
  url: string
  /** The request body. */
  data?: unknown
}

/** What one harness mount hands back. */
interface Harness {
  /** The live panel context. */
  ctx: ChatCtx
  /** Unmounts the tree. */
  unmount: () => void
}

/**
 * A recording HTTP client answering every call with a fixed envelope, or
 * rejecting when the caller passes an `Error`.
 *
 * @param requests - The sink for every call.
 * @param answer - What every call resolves, or the rejection it throws.
 * @returns The client.
 */
function recordingHttp(requests: Recorded[], answer: unknown | Error = {}): HttpClient {
  const respond = <T>(): Promise<HttpResponse<T>> =>
    answer instanceof Error ? Promise.reject(answer) : Promise.resolve(responseOf(answer as T))
  const call =
    (method: string) =>
    <T>(url: string, data?: unknown): Promise<HttpResponse<T>> => {
      requests.push({ method, url, data })
      return respond<T>()
    }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: <T>(): Promise<HttpResponse<T>> => respond<T>(),
    get: call('GET'),
    post: call('POST'),
    put: call('PUT'),
    patch: call('PATCH'),
    delete: call('DELETE'),
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/**
 * A system-card slice fake recording the texts published to it.
 *
 * @param cards - The sink for published texts.
 * @returns The fake slice.
 */
function fakeSystemCards(cards: string[]): ChatCtx['systemCards'] {
  return {
    readMessages: () => [],
    addSystemCard: (text: string) => {
      cards.push(text)
    },
    blockDisabledTeamMessage: () => false,
    effects: { 1: () => {}, 2: () => {}, 3: () => {} },
  } as ChatCtx['systemCards']
}

/**
 * A chat slice fake holding only the fields the git and undo slices read.
 *
 * @param state - The transcript, loading flags and the nudge ref.
 * @returns The fake slice.
 */
function fakeChat(state: {
  messages?: ChatMessage[]
  isLoading?: boolean
  isRemoteStreaming?: boolean
  messagesRef?: ReturnType<typeof ref<ChatMessage[]>>
  loadingRef?: ReturnType<typeof ref<boolean>>
  remoteRef?: ReturnType<typeof ref<boolean>>
}): ChatCtx['chat'] {
  const messagesRef = state.messagesRef ?? ref<ChatMessage[]>(state.messages ?? [])
  const loadingRef = state.loadingRef ?? ref(state.isLoading ?? false)
  const remoteRef = state.remoteRef ?? ref(state.isRemoteStreaming ?? false)
  return {
    messages: computed(() => messagesRef.value),
    isLoading: computed(() => loadingRef.value),
    isRemoteStreaming: computed(() => remoteRef.value),
    debouncedFetchPendingFilesRef: { current: null },
  } as ChatCtx['chat']
}

/**
 * Mounts a tree in which the caller's build function creates a slice and
 * registers its effects, over a small live context.
 *
 * @param http - The client `env.http` serves.
 * @param props - The inner chat props.
 * @param build - Builds the slice(s), registering its effects.
 * @returns The mount and its context.
 */
function mountHarness(
  http: HttpClient,
  props: Partial<ChatInnerProps>,
  build: (ctx: ChatCtx) => void,
): Harness {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const reactiveProps = shallowReactive<ChatInnerProps>({
    projectId: 'p1',
    endpoint: '/projects/p1/chat',
    ...props,
  })
  let built: ChatCtx | null = null
  const app = createApp(
    defineComponent({
      name: 'SliceHarness',
      setup() {
        const { t, locale } = useTranslation()
        const ctx = {
          props: reactiveProps,
          env: {
            t,
            locale,
            cm: getClassMap(),
            http,
            themeMode: computed(() => 'light'),
            isLight: computed(() => true),
            isNarrow: ref(false),
            isCoarse: ref(false),
            popupMaxHeight: computed(() => '70vh'),
            transcriptOnly: computed(() => false),
            shareAllowed: computed(() => true),
            hasConversation: computed(() => false),
            conversationId: computed(() => null),
            conversationIdRef: { current: null },
            effects: { 1: () => {} },
          },
        } as ChatCtx
        built = ctx
        build(ctx)
        return () => h('div')
      },
    }),
  )
  app.use(moleculePlugin, {
    i18n: createSimpleI18nProvider('en'),
    theme: buildThemeProvider(),
    http,
    chat: buildChatProvider([]),
  })
  app.mount(container)
  if (!built) throw new Error('the harness did not build its context')
  return {
    ctx: built,
    unmount: () => {
      app.unmount()
      document.body.innerHTML = ''
    },
  }
}

/** Every harness alive right now. */
const harnesses: Harness[] = []

/**
 * Drops and unmounts the most recently pushed harness.
 *
 * @returns The harness that was dropped, if any.
 */
function dropLastHarness(): Harness | undefined {
  return harnesses.pop()
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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
  for (const harness of harnesses.splice(0)) harness.unmount()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('chat:git actions', () => {
  /**
   * Mounts the git slice with its status effects and returns it.
   *
   * @param http - The client the slice uses.
   * @param props - Extra inner chat props.
   * @param cards - The sink for system-card texts.
   * @returns The slice.
   */
  function mountGit(
    http: HttpClient,
    props: Partial<ChatInnerProps> = {},
    cards: string[] = [],
  ): ChatGitSlice {
    let git!: ChatGitSlice
    const harness = mountHarness(http, props, (ctx) => {
      ctx.chat = fakeChat({})
      ctx.systemCards = fakeSystemCards(cards)
      git = createChatGit(ctx)
      git.effects[1]()
      git.effects[2]()
    })
    harnesses.push(harness)
    return git
  }

  it('commits the tree, clears the strip and marks the card done', async () => {
    const requests: Recorded[] = []
    const onCommit = vi.fn()
    const http: HttpClient = {
      ...recordingHttp(requests),
      get: <T>(url: string): Promise<HttpResponse<T>> => {
        requests.push({ method: 'GET', url })
        return Promise.resolve(responseOf({ files: [{ path: 'src/a.ts', status: 'M' }] } as T))
      },
      post: <T>(url: string, data?: unknown): Promise<HttpResponse<T>> => {
        requests.push({ method: 'POST', url, data })
        return Promise.resolve(
          responseOf({
            committed: true,
            message: 'feat: x',
            files: ['src/a.ts'],
            hash: 'abc1234',
          } as T),
        )
      },
    }
    const git = mountGit(http, { onCommit })
    await nextTick()
    await Promise.resolve()
    // The mount fetch listed one changed file, so the bar is showing.
    expect(git.pendingFiles.value).toEqual([{ path: 'src/a.ts', status: 'M' }])

    git.setCommitBarExpanded(true)
    await git.handleCommit()
    expect(git.commitState.value).toEqual({ status: 'committed', message: 'feat: x' })
    expect(git.pendingFiles.value).toBeNull()
    expect(git.commitBarExpanded.value).toBe(false)
    expect(git.commitCards.value).toHaveLength(1)
    expect(git.commitCards.value[0]).toMatchObject({
      message: 'feat: x',
      files: ['src/a.ts'],
      status: 'done',
      hash: 'abc1234',
    })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(requests.some((r) => r.method === 'POST' && r.url === '/projects/p1/commit')).toBe(true)
  })

  it('answers a clean tree with its notice and re-fetches the status', async () => {
    const requests: Recorded[] = []
    const cards: string[] = []
    const http: HttpClient = {
      ...recordingHttp(requests),
      get: <T>(url: string): Promise<HttpResponse<T>> => {
        requests.push({ method: 'GET', url })
        return Promise.resolve(responseOf({ files: [] } as T))
      },
      post: <T>(url: string, data?: unknown): Promise<HttpResponse<T>> => {
        requests.push({ method: 'POST', url, data })
        return Promise.resolve(
          responseOf({ committed: false, message: 'No changes to commit' } as T),
        )
      },
    }
    const git = mountGit(http, {}, cards)
    await nextTick()
    await git.handleCommit()
    expect(cards).toEqual(['No changes to commit.'])
    expect(git.commitState.value).toBeNull()
    expect(git.commitCards.value).toHaveLength(0)
    expect(
      requests.filter((r) => r.method === 'GET' && r.url === '/projects/p1/git-status').length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('explains a build in progress', async () => {
    const cards: string[] = []
    const http: HttpClient = {
      ...recordingHttp([]),
      get: <T>(): Promise<HttpResponse<T>> => Promise.resolve(responseOf({ files: [] } as T)),
      post: <T>(): Promise<HttpResponse<T>> =>
        Promise.resolve(responseOf({ committed: false, message: 'A build is in progress' } as T)),
    }
    const git = mountGit(http, {}, cards)
    await nextTick()
    await git.handleCommit()
    expect(cards).toEqual(['Wait for the build to finish before creating a Git commit.'])
  })

  it('explains an unrecognized refusal', async () => {
    const cards: string[] = []
    const http: HttpClient = {
      ...recordingHttp([]),
      get: <T>(): Promise<HttpResponse<T>> => Promise.resolve(responseOf({ files: [] } as T)),
      post: <T>(): Promise<HttpResponse<T>> =>
        Promise.resolve(responseOf({ committed: false, message: 'The sandbox refused' } as T)),
    }
    const git = mountGit(http, {}, cards)
    await nextTick()
    await git.handleCommit()
    expect(cards).toEqual(['Failed to commit changes.'])
  })

  it('marks a network failure on the card and re-arms the action', async () => {
    const http: HttpClient = {
      ...recordingHttp([]),
      get: <T>(): Promise<HttpResponse<T>> => Promise.resolve(responseOf({ files: [] } as T)),
      post: <T>(): Promise<HttpResponse<T>> => Promise.reject(new Error('unreachable')),
    }
    const git = mountGit(http)
    await nextTick()
    await git.handleCommit()
    expect(git.commitState.value).toEqual({ status: 'error' })
    expect(git.commitCards.value).toHaveLength(1)
    expect(git.commitCards.value[0]).toMatchObject({ status: 'error', message: 'Commit failed' })
  })

  it('reverts a file and refreshes the status after the host write', async () => {
    const requests: Recorded[] = []
    const onFileRevert = vi.fn(async () => {})
    const http: HttpClient = {
      ...recordingHttp(requests),
      get: <T>(url: string): Promise<HttpResponse<T>> => {
        requests.push({ method: 'GET', url })
        return Promise.resolve(responseOf({ files: [] } as T))
      },
    }
    const git = mountGit(http, { onFileRevert })
    await nextTick()
    requests.length = 0
    await git.handleFileRevert('src/a.ts', 'original')
    expect(onFileRevert).toHaveBeenCalledWith('src/a.ts', 'original')
    await nextTick()
    await Promise.resolve()
    await nextTick()
    expect(requests.some((r) => r.method === 'GET' && r.url === '/projects/p1/git-status')).toBe(
      true,
    )
  })

  it('returns the revert commit hash on success', async () => {
    const onCommit = vi.fn()
    const http: HttpClient = {
      ...recordingHttp([]),
      get: <T>(): Promise<HttpResponse<T>> => Promise.resolve(responseOf({ files: [] } as T)),
      post: <T>(url: string): Promise<HttpResponse<T>> =>
        url.endsWith('/revert-commit')
          ? Promise.resolve(responseOf({ ok: true, hash: 'new1234' } as T))
          : Promise.resolve(responseOf({} as T)),
    }
    const git = mountGit(http, { onCommit })
    await nextTick()
    expect(await git.handleRevertCommit('old1234')).toBe('new1234')
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('returns nothing when the revert commit is refused', async () => {
    const http: HttpClient = {
      ...recordingHttp([]),
      get: <T>(): Promise<HttpResponse<T>> => Promise.resolve(responseOf({ files: [] } as T)),
      post: <T>(): Promise<HttpResponse<T>> => Promise.reject(new Error('offline')),
    }
    const git = mountGit(http)
    await nextTick()
    expect(await git.handleRevertCommit('old1234')).toBeUndefined()
  })
})

describe('chat:auto-commit', () => {
  /** The live state an auto-commit harness reads. */
  interface AutoCommitStateRefs {
    /** Whether a local turn streams. */
    loading: ReturnType<typeof ref<boolean>>
    /** Whether a remote turn streams. */
    remote: ReturnType<typeof ref<boolean>>
    /** The verification auto-fix countdown, or `null`. */
    countdown: ReturnType<typeof ref<AutoFixCountdown | null>>
    /** The commit-command spy the slice calls. */
    execute: ReturnType<typeof vi.fn>
  }

  /**
   * Mounts the auto-commit slice with its effects and the fakes it reads.
   *
   * @param props - Extra inner chat props.
   * @returns The slice, the HTTP recorder and the live state.
   */
  function mountAutoCommit(props: Partial<ChatInnerProps> = {}): {
    slice: ChatAutoCommitSlice
    requests: Recorded[]
    refs: AutoCommitStateRefs
    ctx: ChatCtx
  } {
    const requests: Recorded[] = []
    const refs: AutoCommitStateRefs = {
      loading: ref(false),
      remote: ref(false),
      countdown: ref<AutoFixCountdown | null>(null),
      execute: vi.fn(async () => {}),
    }
    let slice!: ChatAutoCommitSlice
    const harness = mountHarness(recordingHttp(requests), props, (ctx) => {
      ctx.chat = fakeChat({
        loadingRef: refs.loading,
        remoteRef: refs.remote,
      })
      ctx.autoFix = {
        autoFixCountdown: computed(() => refs.countdown.value),
      } as ChatCtx['autoFix']
      ctx.commands = {
        allCommands: computed(() => []),
        executeCommand: refs.execute,
      } as ChatCtx['commands']
      slice = createChatAutoCommit(ctx)
      slice.effects[1]()
      slice.effects[2]()
      slice.effects[3]()
    })
    harnesses.push(harness)
    return { slice, requests, refs, ctx: harness.ctx }
  }

  it('hydrates a saved cadence without echoing it back as a PATCH', async () => {
    vi.useFakeTimers()
    const { slice, requests } = mountAutoCommit()
    // React's settings load records the value it read BEFORE dispatching the
    // hydrate, so the mirror below never sees it as a change to persist.
    slice.autoCommitPersistedRef.current = 30
    slice.dispatchAutoCommit({ type: 'hydrate', seconds: 30 })
    slice.setAutoCommitLoaded(true)
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    expect(slice.autoCommit.value.intervalSeconds).toBe(30)
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('debounce-PATCHes a cadence change once, as the last choice', async () => {
    vi.useFakeTimers()
    const { slice, requests } = mountAutoCommit()
    slice.setAutoCommitLoaded(true)
    await nextTick()
    slice.dispatchAutoCommit({ type: 'set', seconds: 30 })
    await nextTick()
    slice.dispatchAutoCommit({ type: 'set', seconds: 45 })
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    const patches = requests.filter((r) => r.method === 'PATCH')
    expect(patches).toHaveLength(1)
    expect(patches[0]?.url).toBe('/projects/p1')
    expect(patches[0]?.data).toEqual({ settings: { autoCommitSeconds: 45 } })
    expect(slice.autoCommitPersistedRef.current).toBe(45)
  })

  it('never persists a viewer’s cadence', async () => {
    vi.useFakeTimers()
    const { slice, requests } = mountAutoCommit({ canEdit: false })
    slice.setAutoCommitLoaded(true)
    await nextTick()
    slice.dispatchAutoCommit({ type: 'set', seconds: 30 })
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('cancels a pending PATCH when the viewer is demoted mid-session', async () => {
    vi.useFakeTimers()
    const { slice, requests, ctx } = mountAutoCommit()
    slice.setAutoCommitLoaded(true)
    await nextTick()
    slice.dispatchAutoCommit({ type: 'set', seconds: 30 })
    await nextTick()
    ctx.props.canEdit = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('restarts the countdown on the host’s file-change tick', async () => {
    const { slice, ctx } = mountAutoCommit({ gitStatusTick: 0 })
    slice.dispatchAutoCommit({ type: 'hydrate', seconds: 5 })
    expect(slice.autoCommit.value.remaining).toBeNull()
    ctx.props.gitStatusTick = 1
    await nextTick()
    expect(slice.autoCommit.value.remaining).toBe(5)
  })

  it('ticks once a second and fires the commit when the countdown lapses', async () => {
    vi.useFakeTimers()
    const { slice, refs } = mountAutoCommit()
    slice.dispatchAutoCommit({ type: 'set', seconds: 3 })
    await nextTick()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(slice.autoCommit.value.remaining).toBe(2)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(refs.execute).toHaveBeenCalledWith('commit')
    expect(slice.autoCommit.value.remaining).toBeNull()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(refs.execute).toHaveBeenCalledTimes(1)
  })

  it('holds the countdown while a turn streams and fires once it finishes', async () => {
    vi.useFakeTimers()
    const { slice, refs } = mountAutoCommit()
    refs.loading.value = true
    slice.dispatchAutoCommit({ type: 'set', seconds: 1 })
    await nextTick()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(refs.execute).not.toHaveBeenCalled()
    expect(slice.autoCommit.value.remaining).toBe(1)
    refs.loading.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(refs.execute).toHaveBeenCalledTimes(1)
  })

  it('holds the countdown while an auto-fix follow-up is pending', async () => {
    vi.useFakeTimers()
    const { slice, refs } = mountAutoCommit()
    refs.countdown.value = {
      output: 'error',
      categories: ['type'],
      changedPaths: ['src/a.ts'],
      secondsLeft: 5,
      paused: false,
    }
    slice.dispatchAutoCommit({ type: 'set', seconds: 1 })
    await nextTick()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(refs.execute).not.toHaveBeenCalled()
    refs.countdown.value = null
    await nextTick()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(refs.execute).toHaveBeenCalledTimes(1)
  })

  it('stops the countdown on unmount', async () => {
    vi.useFakeTimers()
    const { slice, refs } = mountAutoCommit()
    slice.dispatchAutoCommit({ type: 'set', seconds: 3 })
    await nextTick()
    dropLastHarness()?.unmount()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(refs.execute).not.toHaveBeenCalled()
  })

  it('keeps the armed cadence when the PATCH is refused', async () => {
    vi.useFakeTimers()
    const requests: Recorded[] = []
    const http: HttpClient = {
      ...recordingHttp(requests),
      patch: <T>(url: string, data?: unknown): Promise<HttpResponse<T>> => {
        requests.push({ method: 'PATCH', url, data })
        return Promise.reject(new Error('refused'))
      },
    }
    let slice!: ChatAutoCommitSlice
    const harness = mountHarness(http, {}, (ctx) => {
      ctx.chat = fakeChat({})
      ctx.autoFix = { autoFixCountdown: computed(() => null) } as ChatCtx['autoFix']
      ctx.commands = {
        allCommands: computed(() => []),
        executeCommand: vi.fn(async () => {}),
      } as ChatCtx['commands']
      slice = createChatAutoCommit(ctx)
      slice.effects[1]()
    })
    harnesses.push(harness)
    slice.setAutoCommitLoaded(true)
    await nextTick()
    slice.dispatchAutoCommit({ type: 'set', seconds: 30 })
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(1)
    expect(slice.autoCommit.value).toEqual({ intervalSeconds: 30, remaining: 30 })
  })
})

describe('chat:undo', () => {
  /**
   * One persisted assistant turn with a file-changing tool call.
   *
   * @param undone - Whether the record carries the persisted undone flag.
   * @returns The message.
   */
  const turn = (undone?: boolean): ChatMessage => ({
    id: 'a1',
    role: 'assistant',
    content: 'Done.',
    timestamp: 1,
    toolCalls: [
      {
        id: 't1',
        name: 'edit_file',
        input: { path: 'src/a.ts' },
        status: 'done',
        fileDiff: { original: 'a\n', modified: 'b\n' },
        ...(undone ? { isUndone: true } : {}),
      },
    ],
  })

  /**
   * Mounts the undo slice over a mutable transcript.
   *
   * @param messages - The transcript the chat session starts with.
   * @param http - The client the slice persists through.
   * @returns The slice, the mutable transcript and the HTTP recorder.
   */
  function mountUndo(
    messages: ChatMessage[] = [],
    http?: HttpClient,
  ): {
    slice: ChatUndoSlice
    transcript: ReturnType<typeof ref<ChatMessage[]>>
    requests: Recorded[]
  } {
    const requests: Recorded[] = []
    const transcript = ref<ChatMessage[]>(messages)
    let slice!: ChatUndoSlice
    const harness = mountHarness(http ?? recordingHttp(requests), {}, (ctx) => {
      ctx.chat = fakeChat({ messagesRef: transcript })
      slice = createChatUndo(ctx)
    })
    harnesses.push(harness)
    return { slice, transcript, requests }
  }

  it('seeds the undone set from a loaded history in bulk', async () => {
    const { slice, transcript } = mountUndo()
    expect(slice.undoneTcIds.value.size).toBe(0)
    transcript.value = [turn(true)]
    await nextTick()
    expect([...slice.undoneTcIds.value]).toEqual(['t1'])
  })

  it('does not re-seed on a message appended after the load', async () => {
    const { slice, transcript } = mountUndo()
    transcript.value = [turn()]
    await nextTick()
    slice.handleUndoToggle('t1', true)
    transcript.value = [...transcript.value, turn()]
    await nextTick()
    expect([...slice.undoneTcIds.value]).toEqual(['t1'])
  })

  it('toggles one call and persists it both ways', async () => {
    const { slice, requests } = mountUndo()
    slice.handleUndoToggle('t1', true)
    expect([...slice.undoneTcIds.value]).toEqual(['t1'])
    slice.handleUndoToggle('t1', false)
    expect(slice.undoneTcIds.value.size).toBe(0)
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(2)
    expect(posts[0]).toMatchObject({
      url: '/projects/p1/tool-call-undo',
      data: { toolCallIds: ['t1'], undone: true },
    })
    expect(posts[1]).toMatchObject({ data: { toolCallIds: ['t1'], undone: false } })
  })

  it('keeps the undone state and warns when the persist fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const http: HttpClient = {
      ...recordingHttp([]),
      post: <T>(): Promise<HttpResponse<T>> => Promise.reject(new Error('offline')),
    }
    const { slice } = mountUndo([], http)
    slice.handleUndoToggle('t1', true)
    await nextTick()
    await Promise.resolve()
    expect([...slice.undoneTcIds.value]).toEqual(['t1'])
    expect(warn).toHaveBeenCalled()
  })
})
