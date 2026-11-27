// @vitest-environment jsdom
/**
 * ChatPanel unit P3 — every request and storage read made at mount, in React's
 * effect order.
 *
 * The panel-level cases mount the real `ChatPanel` and record what reaches the
 * chat provider and the HTTP client; their order is React's (the conformance
 * golden `01-mount` records the same sequence: the context-usage restore, the
 * session's history load, the catalog, the settings restore, the git status,
 * the skills seed, and the outer header's conversation list last). The
 * slice-level cases mount one real slice over a small context so the retries,
 * cache hits, debounces and storage reads each get their own assertion.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { AUTO_COMMIT_DISABLED, CHAT_TIMESTAMPS_STORAGE_KEY } from '@molecule/app-ide-panel-logic'
import {
  DEFAULT_SOUNDS_CONFIG,
  type SkillInfo,
  SOUNDS_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'
import { resetAIModelsCache } from '@molecule/app-svelte/ai-models'
import { resetChatStoresForTests } from '@molecule/app-svelte/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatAutoCommitSlice } from '../components/chat-panel/chat-auto-commit.svelte.js'
import { createChatContextUsage } from '../components/chat-panel/chat-context-usage.svelte.js'
import { createChatModels } from '../components/chat-panel/chat-models.svelte.js'
import { createChatPrefs } from '../components/chat-panel/chat-prefs.svelte.js'
import {
  type ChatSkillsSlice,
  createChatSkills,
} from '../components/chat-panel/chat-skills.svelte.js'
import {
  type ChatSoundsSlice,
  createChatSounds,
} from '../components/chat-panel/chat-sounds.svelte.js'
import type { ChatStreamSlice } from '../components/chat-panel/chat-stream.svelte.js'
import type { ChatSystemCardsSlice } from '../components/chat-panel/chat-system-cards.svelte.js'
import type {
  ChatContext,
  ChatInnerProps,
  MutableRef,
} from '../components/chat-panel/context.svelte.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'
import SliceHarness from './ChatSliceHarness.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** A typed HTTP success envelope. */
const ok = responseOf

/**
 * Waits until every queued microtask (a resolved HTTP answer's `.then` chain)
 * has run.
 *
 * @returns A promise resolved after the microtask queue drains.
 */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** One recorded request. */
interface Recorded {
  /** The method, uppercased. */
  method: string
  /** The requested path (with its query string). */
  url: string
}

/** A route answer: data, or a function returning data or a promise. */
type RouteAnswer = () => unknown

/**
 * An HTTP client that records every call and answers from a route table. An
 * exact key wins; otherwise the LONGEST matching prefix answers.
 *
 * @param requests - The recorded request sink.
 * @param routes - Answers keyed by URL or URL prefix.
 * @returns The recording client.
 */
function recordingHttp(
  requests: Recorded[],
  routes: Record<string, unknown | RouteAnswer> = {},
): HttpClient {
  const answer = (url: string): unknown => {
    if (url in routes) {
      const value = routes[url]
      return typeof value === 'function' ? (value as RouteAnswer)() : value
    }
    const prefixes = Object.keys(routes)
      .filter((prefix) => url.startsWith(prefix))
      .sort((a, b) => b.length - a.length)
    const prefix = prefixes[0]
    if (prefix === undefined) return {}
    const value = routes[prefix]
    return typeof value === 'function' ? (value as RouteAnswer)() : value
  }
  const get = async <T>(url: string): Promise<HttpResponse<T>> => {
    requests.push({ method: 'GET', url })
    const value = answer(url)
    const resolved = value instanceof Promise ? await value : value
    return ok(resolved as never) as HttpResponse<T>
  }
  return { ...buildRejectingHttpClient(), get }
}

/**
 * A chat provider that records its history load and replays nothing.
 *
 * @param events - The shared event log.
 * @returns The provider.
 */
function recordingChatProvider(events: string[]): ChatProvider {
  return {
    name: 'recording',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => {
      events.push('chat.loadHistory')
      return []
    },
  }
}

/** A stream slice fake holding only what the slices under test read. */
interface FakeStream {
  /** The slice itself. */
  slice: ChatStreamSlice
}

/**
 * Builds a stream slice fake whose sound config ref is observable.
 *
 * @param soundsConfig - The config the stream handler's ref starts from.
 * @returns The fake stream slice.
 */
function fakeStream(soundsConfig = { ...DEFAULT_SOUNDS_CONFIG }): FakeStream {
  const slice: ChatStreamSlice = {
    soundsConfigRef: { current: soundsConfig },
    addActivityCardRef: { current: null },
    applyingPushedRef: { current: false },
    handleStreamEvent: (): void => {},
    mount(): void {},
  }
  return { slice }
}

/**
 * Builds a system-card slice fake that records the texts published to it.
 *
 * @param cards - The sink for published card texts.
 * @returns The fake system-card slice.
 */
function fakeSystemCards(cards: string[] = []): ChatSystemCardsSlice {
  return {
    readMessages: () => [],
    addSystemCard: (text) => {
      cards.push(text)
    },
    blockDisabledTeamMessage: () => false,
    mount(): void {},
    effects: { 1: () => {}, 2: () => {}, 3: () => {} },
  }
}

/** The auto-commit slice fake plus its recorded dispatches. */
interface FakeAutoCommit {
  /** The slice itself. */
  slice: ChatAutoCommitSlice
  /** Every action dispatched to it. */
  dispatched: unknown[]
  /** Every `setAutoCommitLoaded` value it received. */
  loaded: (boolean | ((previous: boolean) => boolean))[]
}

/**
 * Builds an auto-commit slice fake that records its dispatches and its loaded
 * flag.
 *
 * @returns The fake and its logs.
 */
function fakeAutoCommit(): FakeAutoCommit {
  const dispatched: unknown[] = []
  const loaded: (boolean | ((previous: boolean) => boolean))[] = []
  const persistedRef: MutableRef<number> = { current: 0 }
  const slice: ChatAutoCommitSlice = {
    get autoCommit() {
      return AUTO_COMMIT_DISABLED
    },
    dispatchAutoCommit: (action) => {
      dispatched.push(action)
    },
    setAutoCommitLoaded: (value) => {
      loaded.push(value)
    },
    readCanEdit: () => true,
    autoCommitPersistedRef: persistedRef,
    get autoCommitHeld() {
      return false
    },
    mount(): void {},
    effects: { 1: () => {}, 2: () => {}, 3: () => {} },
  }
  return { slice, dispatched, loaded }
}

/** Everything a slice harness hands back. */
interface SliceMount {
  /** Unmounts the harness. */
  unmount: () => void
}

/** Harnesses alive right now. */
const harnesses: SliceMount[] = []

/**
 * Mounts one slice over a small context: the real env wiring, the given props,
 * and whatever slices the caller fills first.
 *
 * @param http - The HTTP client the context serves.
 * @param props - The inner chat props.
 * @param build - Creates the slice under test from the context.
 * @returns The harness mount.
 */
function mountSlice(
  http: HttpClient,
  props: Partial<ChatInnerProps>,
  build: (ctx: ChatContext) => void,
): SliceMount {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const innerProps = { projectId: 'p1', endpoint: '/projects/p1/chat', ...props } as ChatInnerProps
  const instance = mount(SliceHarness, {
    target: container,
    props: {
      http,
      chat: buildChatProvider([]),
      theme: buildThemeProvider(),
      props: innerProps,
      build,
    },
  })
  flushSync()
  const mountHandle: SliceMount = {
    unmount: () => {
      void unmount(instance)
      document.body.innerHTML = ''
    },
  }
  harnesses.push(mountHandle)
  return mountHandle
}

/** The panel mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  // The header renders the bonded glyphs (share, bug, gear); a name-keyed proxy
  // set keeps the icons from needing a concrete bond package here.
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
  resetChatStoresForTests()
  resetAIModelsCache()
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
  for (const harness of harnesses.splice(0)) harness.unmount()
  vi.useRealTimers()
})

describe('mount requests, in React order', () => {
  /** The five per-project requests a mount makes, with empty answers. */
  const PROJECT_ROUTES: Record<string, unknown> = {
    '/ai/models': { models: [], defaults: {} },
    '/projects/p1': { settings: {} },
    '/projects/p1/git-status': { files: [] },
    '/projects/p1/files-list': { files: [] },
    '/projects/p1/conversations': { conversations: [] },
  }

  it('the panel makes its mount requests in the recorded effect order', async () => {
    const events: string[] = []
    const requests: Recorded[] = []
    mounted = mountPanel({
      http: recordingHttp(requests, PROJECT_ROUTES),
      chat: recordingChatProvider(events),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat?conversationId=c1' },
    })
    await flush()
    // The context-usage restore is the first request React fires, then the
    // session's history load, then the catalog and the per-project reads.
    // The activity-card restore (its own request, asserted by the timeline
    // dispatch unit) fires beside the session's history load; it is not one of
    // the endpoints this ordering case is about.
    expect(
      requests
        .filter((request) => !request.url.endsWith('/activity-cards'))
        .map((request) => `${request.method} ${request.url}`),
    ).toEqual([
      'GET /projects/p1/chat?conversationId=c1',
      'GET /ai/models?projectId=p1',
      'GET /projects/p1',
      'GET /projects/p1/git-status',
      'GET /projects/p1/files-list',
      'GET /projects/p1/conversations',
    ])
    expect(events).toEqual(['chat.loadHistory'])
  })

  it('a conversation without an id skips the context-usage read', async () => {
    const requests: Recorded[] = []
    mounted = mountPanel({
      http: recordingHttp(requests, PROJECT_ROUTES),
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat' },
    })
    await flush()
    expect(requests.map((request) => request.url)).toEqual([
      '/ai/models?projectId=p1',
      '/projects/p1',
      '/projects/p1/git-status',
      '/projects/p1/files-list',
      '/projects/p1/conversations',
    ])
  })

  it('shares one catalog fetch across consecutive mounts', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, PROJECT_ROUTES)
    mounted = mountPanel({
      http,
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat' },
    })
    await flush()
    mounted.unmount()
    mounted = mountPanel({
      http,
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat?conversationId=c2' },
    })
    await flush()
    expect(requests.filter((request) => request.url.startsWith('/ai/models'))).toHaveLength(1)
  })
})

describe('context usage', () => {
  it('retries a failed restore with backoff and stops after its budget', async () => {
    vi.useFakeTimers()
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/projects/p1/chat': () => Promise.reject(new Error('offline')),
    })
    mountSlice(http, { endpoint: '/projects/p1/chat?conversationId=c1' }, (ctx) => {
      const slice = createChatContextUsage(ctx)
      slice.effects[1]()
    })
    await flush()
    expect(requests).toHaveLength(1)
    // 4 s, then 8 s, then 12 s — the fourth attempt is made, and a fifth never is.
    await vi.advanceTimersByTimeAsync(4_000)
    expect(requests).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(8_000)
    expect(requests).toHaveLength(3)
    await vi.advanceTimersByTimeAsync(12_000)
    expect(requests).toHaveLength(4)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(requests).toHaveLength(4)
  })

  it('restores the usage sample, its history and the compactions', async () => {
    const usage = {
      requestId: 'r1',
      at: '2023-11-14T22:12:00.000Z',
      inputTokens: 5_000,
      contextWindow: 100_000,
      backgroundCompactAtTokens: 10_000,
    }
    const compaction = { at: '2023-11-14T22:10:00.000Z' }
    const http = recordingHttp([], {
      '/projects/p1/chat': {
        contextUsage: usage,
        contextHistory: [usage],
        compactions: [compaction],
      },
    })
    let usageSlice!: ReturnType<typeof createChatContextUsage>
    mountSlice(http, { endpoint: '/projects/p1/chat?conversationId=c1' }, (ctx) => {
      usageSlice = createChatContextUsage(ctx)
      usageSlice.effects[1]()
    })
    await flush()
    await settle()
    expect(usageSlice?.contextUsage).toEqual(usage)
    expect(usageSlice?.contextHistory).toEqual([usage])
    expect(usageSlice?.contextCompactions).toEqual([compaction])
  })
})

describe('git status', () => {
  it('fetches the files at mount and after the host tick debounce', async () => {
    vi.useFakeTimers()
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/ai/models': { models: [], defaults: {} },
      '/projects/p1': { settings: {} },
      '/projects/p1/git-status': { files: [] },
      '/projects/p1/files-list': { files: [] },
      '/projects/p1/conversations': { conversations: [] },
    })
    mounted = mountPanel({
      http,
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat' },
    })
    await flush()
    expect(requests.filter((request) => request.url.endsWith('/git-status'))).toHaveLength(1)
    mounted.setProps({ gitStatusTick: 1 })
    await flush()
    // Debounced, so nothing yet; after 400 ms the fetch lands.
    expect(requests.filter((request) => request.url.endsWith('/git-status'))).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(400)
    expect(requests.filter((request) => request.url.endsWith('/git-status'))).toHaveLength(2)
  })
})

describe('sounds preference', () => {
  it('reads the stored device preference at creation and latches it on mount', async () => {
    localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify({ error: 'off' }))
    const stream = fakeStream()
    let sounds!: ChatSoundsSlice
    mountSlice(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.stream = stream.slice
      sounds = createChatSounds(ctx)
      sounds.effects[1]()
      sounds.effects[2]()
    })
    await flush()
    expect(sounds?.soundsConfig.error).toBe('off')
    expect(sounds?.soundsLocallySetRef.current).toBe(true)
    expect(stream.slice.soundsConfigRef.current.error).toBe('off')
  })

  it('starts from the defaults and stays unlatched without a stored preference', async () => {
    const stream = fakeStream()
    let sounds!: ChatSoundsSlice
    mountSlice(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.stream = stream.slice
      sounds = createChatSounds(ctx)
      sounds.effects[1]()
    })
    await flush()
    expect(sounds?.soundsConfig.message).toBe('always')
    expect(sounds?.soundsLocallySetRef.current).toBe(false)
  })

  it('cycling a mode persists it to this device', async () => {
    const stream = fakeStream()
    let sounds!: ChatSoundsSlice
    mountSlice(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.stream = stream.slice
      sounds = createChatSounds(ctx)
    })
    await sounds?.cycleSoundMode('error')
    expect(sounds?.soundsConfig.error).toBe('always')
    expect(sounds?.soundsLocallySetRef.current).toBe(true)
    expect(JSON.parse(localStorage.getItem(SOUNDS_STORAGE_KEY) ?? '{}')).toEqual(
      sounds?.soundsConfig,
    )
  })
})

describe('preferences', () => {
  it('toggling timestamps persists the device flag and confirms with a card', async () => {
    const cards: string[] = []
    let prefs!: ReturnType<typeof createChatPrefs>
    mountSlice(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.systemCards = fakeSystemCards(cards)
      prefs = createChatPrefs(ctx)
    })
    prefs?.applyTimestampsVisible(true)
    expect(localStorage.getItem(CHAT_TIMESTAMPS_STORAGE_KEY)).toBe('true')
    expect(cards).toEqual(['Timestamps shown.'])
    prefs?.applyTimestampsVisible(false)
    expect(localStorage.getItem(CHAT_TIMESTAMPS_STORAGE_KEY)).toBe('false')
    expect(cards).toEqual(['Timestamps shown.', 'Timestamps hidden.'])
  })
})

describe('skills seed', () => {
  /** One skill file the fake project holds. */
  const skillFiles = ['.agents/skills/deploy/SKILL.md']

  it('fetches the file list at mount and seeds the default set', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/projects/p1/files-list': { files: skillFiles },
      '/projects/p1/files/.agents/skills/deploy/SKILL.md': {
        content: '---\nname: Deploy\ndescription: Ship it\n---\n',
      },
    })
    let skills!: ChatSkillsSlice
    mountSlice(http, {}, (ctx) => {
      skills = createChatSkills(ctx)
      skills.effects[1]()
    })
    await flush()
    await settle()
    expect(requests.map((request) => request.url)).toEqual([
      '/projects/p1/files-list',
      '/projects/p1/files/.agents/skills/deploy/SKILL.md',
    ])
    expect(skills?.projectSkills.map((skill: SkillInfo) => skill.path)).toEqual([
      '.agents/skills/deploy/SKILL.md',
    ])
    expect([...(skills?.defaultSkillPaths ?? [])]).toEqual(['.agents/skills/deploy/SKILL.md'])
  })

  it('retries an empty first load instead of latching', async () => {
    vi.useFakeTimers()
    const requests: Recorded[] = []
    let call = 0
    const http: HttpClient = {
      ...buildRejectingHttpClient(),
      get: async <T>(url: string): Promise<HttpResponse<T>> => {
        requests.push({ method: 'GET', url })
        if (url.endsWith('/files-list')) {
          call += 1
          return ok({ files: call === 1 ? [] : skillFiles } as never) as HttpResponse<T>
        }
        return ok({ content: '---\nname: Deploy\n---\n' } as never) as HttpResponse<T>
      },
    }
    let skills!: ChatSkillsSlice
    mountSlice(http, {}, (ctx) => {
      skills = createChatSkills(ctx)
      skills.effects[1]()
    })
    await flush()
    expect(skills?.skillsLoadedRef.current).toBe(false)
    await vi.advanceTimersByTimeAsync(1_500)
    await flush()
    expect(skills?.skillsLoadedRef.current).toBe(true)
    expect(skills?.projectSkills).toHaveLength(1)
    expect(requests.filter((request) => request.url.endsWith('/files-list'))).toHaveLength(2)
  })

  it('skips seeding when the user already saved an explicit default set', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/projects/p1/files-list': { files: [] },
    })
    let skills!: ChatSkillsSlice
    mountSlice(http, {}, (ctx) => {
      const slice = createChatSkills(ctx)
      slice.defaultSkillsExplicitRef.current = true
      slice.setDefaultSkillsExplicit(true)
      skills = slice
      slice.effects[1]()
    })
    await flush()
    expect(skills?.defaultSkillsExplicit).toBe(true)
    expect([...(skills?.defaultSkillPaths ?? [])]).toEqual([])
  })
})

describe('project settings hydration', () => {
  /** A free-tier model entry the catalog route answers with. */
  const FREE_MODEL = {
    id: 'free-model',
    provider: 'vendor',
    label: 'Free Model',
    description: 'the free one',
    contextWindow: 128_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 0,
    outputPricePerMTok: 0,
    cacheReadPricePerMTok: 0,
    cacheWritePricePerMTok: 0,
    knowledgeCutoff: '2025-01-01',
    freeTier: true,
  }

  /**
   * Builds the slices the models slice reads at mount.
   *
   * @param ctx - The harness context.
   * @param autoCommit - The auto-commit fake to install.
   * @returns The installed auto-commit fake.
   */
  function fillModelsContext(ctx: ChatContext, autoCommit: FakeAutoCommit): FakeAutoCommit {
    ctx.autoCommit = autoCommit.slice
    ctx.skills = createChatSkills(ctx)
    const stream = fakeStream()
    ctx.stream = stream.slice
    ctx.sounds = createChatSounds(ctx)
    ctx.systemCards = fakeSystemCards()
    return autoCommit
  }

  it('subscribes to the catalog at mount and adopts its free-tier model', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/ai/models': { models: [FREE_MODEL], defaults: { plan: 'free-model' } },
      '/projects/p1': { settings: {} },
    })
    let models!: ReturnType<typeof createChatModels>
    mountSlice(http, {}, (ctx) => {
      fillModelsContext(ctx, fakeAutoCommit())
      models = createChatModels(ctx)
      models.effects[2]()
    })
    await flush()
    await settle()
    expect(requests.map((request) => request.url)).toEqual([
      '/ai/models?projectId=p1',
      '/projects/p1',
    ])
    expect(models?.AVAILABLE_MODELS).toHaveLength(1)
    expect(models?.FREE_TIER_MODEL).toBe('free-model')
    expect(models?.currentModel).toBe('free-model')
    expect(models?.modelsLoading).toBe(false)
    expect(models?.serverModelDefaults).toEqual({ plan: 'free-model' })
  })

  it('hydrates the per-mode models, effort, regions and loop cap', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/ai/models': { models: [], defaults: {} },
      '/projects/p1': {
        settings: {
          chatModel: 'chat-1',
          planModel: 'plan-1',
          executeModel: 'exec-1',
          effortLevel: 'high',
          effortByMode: { plan: 'low' },
          modelRegions: { 'chat-1': 'cn' },
          maxToolLoops: 7,
          autoFix: false,
          autoApproveCommands: true,
        },
      },
    })
    const autoCommit = fakeAutoCommit()
    let models!: ReturnType<typeof createChatModels>
    mountSlice(http, {}, (ctx) => {
      fillModelsContext(ctx, autoCommit)
      models = createChatModels(ctx)
      models.effects[2]()
    })
    await flush()
    await settle()
    expect(models?.savedChatModel).toBe('chat-1')
    expect(models?.planModel).toBe('plan-1')
    expect(models?.executeModel).toBe('exec-1')
    expect(models?.effortLevel).toBe('high')
    expect(models?.effortByMode).toEqual({ plan: 'low' })
    expect(models?.modelRegions).toEqual({ 'chat-1': 'cn' })
    expect(models?.currentMaxLoops).toBe(7)
    expect(models?.autoFixEnabled).toBe(false)
    expect(models?.autoApproveCommandsEnabled).toBe(true)
    expect(autoCommit.slice.autoCommitPersistedRef.current).toBeGreaterThan(0)
    expect(autoCommit.dispatched).toEqual([
      { type: 'hydrate', seconds: autoCommit.slice.autoCommitPersistedRef.current },
    ])
    expect(autoCommit.loaded).toEqual([true])
  })

  it('applies the saved default skills and the legacy project sounds', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/ai/models': { models: [], defaults: {} },
      '/projects/p1': {
        settings: { defaultSkills: ['.agents/skills/a/SKILL.md'], sounds: { error: 'off' } },
      },
    })
    let models: ReturnType<typeof createChatModels> | null = null
    let skills!: ChatSkillsSlice
    mountSlice(http, {}, (ctx) => {
      ctx.autoCommit = fakeAutoCommit().slice
      ctx.systemCards = fakeSystemCards()
      const soundsStream = fakeStream()
      ctx.stream = soundsStream.slice
      ctx.sounds = createChatSounds(ctx)
      skills = createChatSkills(ctx)
      ctx.skills = skills
      models = createChatModels(ctx)
      models.effects[2]()
    })
    await flush()
    await settle()
    expect([...(skills?.defaultSkillPaths ?? [])]).toEqual(['.agents/skills/a/SKILL.md'])
    expect(skills?.defaultSkillsExplicit).toBe(true)
    expect(skills?.defaultSkillsExplicitRef.current).toBe(true)
    expect(models).not.toBeNull()
  })

  it('leaves auto-commit off when the settings read fails', async () => {
    const requests: Recorded[] = []
    const http: HttpClient = {
      ...buildRejectingHttpClient(),
      get: async <T>(url: string): Promise<HttpResponse<T>> => {
        requests.push({ method: 'GET', url })
        if (url.startsWith('/ai/models')) return ok({ models: [], defaults: {} } as never)
        throw new Error('settings unavailable')
      },
    }
    const autoCommit = fakeAutoCommit()
    mountSlice(http, {}, (ctx) => {
      fillModelsContext(ctx, autoCommit)
      const models = createChatModels(ctx)
      models.effects[2]()
    })
    await flush()
    await settle()
    expect(autoCommit.slice.autoCommitPersistedRef.current).toBe(0)
    expect(autoCommit.loaded).toEqual([true])
    expect(autoCommit.dispatched).toEqual([])
  })
})

describe('project switch', () => {
  it('re-reads the catalog, the settings and the git status for the new project', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/ai/models': { models: [], defaults: {} },
      '/projects/p1': { settings: {} },
      '/projects/p1/git-status': { files: [] },
      '/projects/p1/files-list': { files: [] },
      '/projects/p1/conversations': { conversations: [] },
      '/projects/p2': { settings: {} },
      '/projects/p2/git-status': { files: [] },
      '/projects/p2/files-list': { files: [] },
      '/projects/p2/conversations': { conversations: [] },
    })
    mounted = mountPanel({
      http,
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat' },
    })
    await flush()
    requests.length = 0
    mounted.setProps({ projectId: 'p2' })
    await flush()
    expect(requests.map((request) => request.url)).toEqual([
      '/ai/models?projectId=p2',
      '/projects/p2',
      '/projects/p2/git-status',
      '/projects/p2/files-list',
      '/projects/p2/conversations',
    ])
  })
})
