// @vitest-environment jsdom
/**
 * ChatPanel unit P3 — every request and storage read made at mount, in React's
 * effect order.
 *
 * The panel-level cases mount the real `ChatPanel` and record what reaches the
 * chat provider and the HTTP client; their order is React's (the conformance
 * golden `01-mount` records the same sequence). The slice-level cases mount one
 * real slice over a small context and drive its mount effects directly, so the
 * retries, cache hits, debounces and persistence each get their own assertion.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createApp, defineComponent, h, nextTick, ref, shallowReactive } from 'vue'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { AUTO_COMMIT_DISABLED, CHAT_TIMESTAMPS_STORAGE_KEY } from '@molecule/app-ide-panel-logic'
import { DEFAULT_SOUNDS_CONFIG } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { moleculePlugin, useTranslation } from '@molecule/app-vue'
import { resetAIModelsCache } from '@molecule/app-vue/ai-models'
import { createChatPlugin } from '@molecule/app-vue/chat'
import { resetChatStoresForTests } from '@molecule/app-vue/chat'

import type { ChatCtx, ChatInnerProps } from '../components/chat-panel/context.js'
import type { ChatAutoCommitSlice } from '../components/chat-panel/use-chat-auto-commit.js'
import type { ChatChatSlice } from '../components/chat-panel/use-chat-chat.js'
import { createChatContextUsage } from '../components/chat-panel/use-chat-context-usage.js'
import type { ChatEnvSlice } from '../components/chat-panel/use-chat-env.js'
import type { ChatGitSlice } from '../components/chat-panel/use-chat-git.js'
import { createChatGit } from '../components/chat-panel/use-chat-git.js'
import { createChatModels } from '../components/chat-panel/use-chat-models.js'
import { createChatPrefs } from '../components/chat-panel/use-chat-prefs.js'
import type { ChatSkillsSlice } from '../components/chat-panel/use-chat-skills.js'
import { createChatSkills } from '../components/chat-panel/use-chat-skills.js'
import type { ChatSoundsSlice } from '../components/chat-panel/use-chat-sounds.js'
import { createChatSounds } from '../components/chat-panel/use-chat-sounds.js'
import type { ChatStreamSlice } from '../components/chat-panel/use-chat-stream.js'
import type { ChatSystemCardsSlice } from '../components/chat-panel/use-chat-system-cards.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'
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

/**
 * A stream slice fake holding only what the slices under test read.
 *
 * @param soundsConfig - The config the stream handler's ref starts from.
 * @returns The fake stream slice.
 */
function fakeStream(soundsConfig = { ...DEFAULT_SOUNDS_CONFIG }): ChatStreamSlice {
  return {
    handleStreamEvent: () => {},
    applyingPushedRef: { current: false },
    addActivityCardRef: { current: null },
    soundsConfigRef: { current: soundsConfig },
  }
}

/**
 * A system-card slice fake that records the texts published to it.
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
    effects: { 1: () => {}, 2: () => {}, 3: () => {} },
  }
}

/**
 * A sound slice fake whose device flag the caller controls.
 *
 * @param locallySet - Whether this device already holds a preference.
 * @returns The fake sounds slice.
 */
function fakeSounds(locallySet: boolean): ChatSoundsSlice {
  const soundsConfig = ref({ ...DEFAULT_SOUNDS_CONFIG })
  return {
    soundsPicker: ref(null),
    setSoundsPicker: () => {},
    soundsConfig,
    setSoundsConfig: (value) => {
      soundsConfig.value = typeof value === 'function' ? value(soundsConfig.value) : value
    },
    soundsLocallySetRef: { current: locallySet },
    cycleSoundMode: async () => {},
    effects: { 1: () => {}, 2: () => {} },
  }
}

/** The auto-commit slice fake plus its recorded dispatches. */
interface FakeAutoCommit {
  /** The slice itself. */
  slice: ChatAutoCommitSlice
  /** Every action dispatched to it. */
  dispatched: unknown[]
}

/**
 * Builds an auto-commit slice fake that records its dispatches and its loaded
 * flag.
 *
 * @param loaded - Receives each `setAutoCommitLoaded` call.
 * @returns The fake and its dispatch log.
 */
function fakeAutoCommit(loaded: boolean[] = []): FakeAutoCommit {
  const dispatched: unknown[] = []
  const slice: ChatAutoCommitSlice = {
    autoCommit: ref(AUTO_COMMIT_DISABLED),
    dispatchAutoCommit: (action) => {
      dispatched.push(action)
    },
    autoCommitPersistedRef: { current: 0 },
    readCanEdit: () => undefined,
    setAutoCommitLoaded: (value) => {
      loaded.push(typeof value === 'function' ? value(false) : value)
    },
    autoCommitHeld: computed(() => false),
    effects: { 1: () => {}, 2: () => {}, 3: () => {} },
  }
  return { slice, dispatched }
}

/** Everything the slice harness hands back. */
interface SliceHarness {
  /** The live panel context. */
  ctx: ChatCtx
  /** Unmounts the harness. */
  unmount: () => void
}

/**
 * Mounts one real slice over a small context: the env (real translation and
 * ClassMap), the given props, and whatever slices the caller fills first.
 *
 * @param http - The HTTP client the injected plugin and `env.http` both serve.
 * @param props - The inner chat props.
 * @param build - Builds the slice(s) and returns the node to render.
 * @returns The mount and its context.
 */
function mountHarness(
  http: HttpClient,
  props: Partial<ChatInnerProps>,
  build: (ctx: ChatCtx) => ReturnType<typeof h>,
): SliceHarness {
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
        const env: ChatEnvSlice = {
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
          hasConversation: computed(() => reactiveProps.endpoint.includes('conversationId=')),
          conversationId: computed(
            () => reactiveProps.endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null,
          ),
          conversationIdRef: { current: null },
          effects: { 1: () => {} },
        }
        const ctx = { props: reactiveProps, env } as ChatCtx
        built = ctx
        const tree = build(ctx)
        return () => tree
      },
    }),
  )
  app.use(moleculePlugin, {
    i18n: createSimpleI18nProvider('en'),
    theme: buildThemeProvider(),
    http,
  })
  app.use(createChatPlugin(buildChatProvider([])))
  app.mount(container)
  if (!built) throw new Error('the slice harness did not build its context')
  return {
    ctx: built,
    unmount: () => {
      app.unmount()
      document.body.innerHTML = ''
    },
  }
}

/** The panel mount alive right now, if any. */
let mounted: PanelMount | null = null

/** Slice harnesses alive right now. */
const harnesses: SliceHarness[] = []

beforeEach(() => {
  setClassMap(classMap)
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
  it('the panel makes its mount requests in the recorded effect order', async () => {
    const events: string[] = []
    const requests: Recorded[] = []
    mounted = mountPanel({
      http: recordingHttp(requests, {
        '/ai/models': { models: [], defaults: {} },
        '/projects/p1': { settings: {} },
        '/projects/p1/git-status': { files: [] },
        '/projects/p1/files-list': { files: [] },
        '/projects/p1/conversations': { conversations: [] },
      }),
      chat: recordingChatProvider(events),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat?conversationId=c1' },
    })
    await flush()
    // The activity-cards restore (chat:activity) is its own request, asserted by
    // the activity slice's cases; this one is about the catalog and the
    // per-project reads, so it narrows to those endpoints.
    const order = requests
      .map((r) => `${r.method} ${r.url}`)
      .filter((line) => !line.endsWith('/activity-cards'))
    // The context-usage restore is the first request React fires, then the
    // session's history load, then the catalog and the per-project reads.
    expect(order).toEqual([
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
      http: recordingHttp(requests, {
        '/ai/models': { models: [], defaults: {} },
        '/projects/p1': { settings: {} },
        '/projects/p1/git-status': { files: [] },
        '/projects/p1/files-list': { files: [] },
        '/projects/p1/conversations': { conversations: [] },
      }),
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat' },
    })
    await flush()
    expect(requests.map((r) => r.url)).toEqual([
      '/ai/models?projectId=p1',
      '/projects/p1',
      '/projects/p1/git-status',
      '/projects/p1/files-list',
      '/projects/p1/conversations',
    ])
  })

  it('shares one catalog fetch across consecutive mounts', async () => {
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
    mounted.unmount()
    mounted = mountPanel({
      http,
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { endpoint: '/projects/p1/chat?conversationId=c2' },
    })
    await flush()
    expect(requests.filter((r) => r.url.startsWith('/ai/models'))).toHaveLength(1)
  })
})

describe('context usage', () => {
  it('retries a failed restore with backoff and stops after its budget', async () => {
    vi.useFakeTimers()
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/projects/p1/chat': () => Promise.reject(new Error('offline')),
    })
    const harness = mountHarness(
      http,
      { endpoint: '/projects/p1/chat?conversationId=c1' },
      (ctx) => {
        const slice = createChatContextUsage(ctx)
        slice.effects[1]()
        return h('div')
      },
    )
    harnesses.push(harness)
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
})

describe('git status', () => {
  /** A deferred answer for one git-status request. */
  interface Deferred {
    /** Settles the promise with a file list. */
    settle: (files: { path: string; status: string }[]) => void
  }

  it('drops an answer that a newer request superseded', async () => {
    const pending: Deferred[] = []
    const http: HttpClient = {
      ...buildRejectingHttpClient(),
      get: (url: string): Promise<HttpResponse<never>> => {
        if (!url.endsWith('/git-status')) return Promise.resolve(ok({} as never))
        let settle = (_files: { path: string; status: string }[]): void => {}
        const promise = new Promise<HttpResponse<never>>((resolve) => {
          settle = (files) => resolve(ok({ files } as never) as HttpResponse<never>)
        })
        pending.push({ settle })
        return promise
      },
    }
    const loading = ref(false)
    let git!: ChatGitSlice
    const harness = mountHarness(http, {}, (ctx) => {
      ctx.chat = {
        isLoading: computed(() => loading.value),
        debouncedFetchPendingFilesRef: { current: null },
      } as ChatChatSlice
      git = createChatGit(ctx)
      git.effects[1]()
      git.effects[2]()
      return h('div')
    })
    harnesses.push(harness)
    await flush()
    expect(pending).toHaveLength(1)
    // A second fetch (a turn boundary) starts before the first answers.
    loading.value = true
    await flush()
    expect(pending).toHaveLength(2)
    pending[1]?.settle([{ path: 'new.ts', status: 'M' }])
    await flush()
    pending[0]?.settle([{ path: 'old.ts', status: 'M' }])
    await flush()
    expect(git?.pendingFiles.value).toEqual([{ path: 'new.ts', status: 'M' }])
  })

  it('refetches on the host tick after its debounce', async () => {
    vi.useFakeTimers()
    const requests: Recorded[] = []
    const http = recordingHttp(requests, { '/projects/p1/git-status': { files: [] } })
    const harness = mountHarness(http, { gitStatusTick: 0 }, (ctx) => {
      ctx.chat = {
        isLoading: computed(() => false),
        debouncedFetchPendingFilesRef: { current: null },
      } as ChatChatSlice
      const git = createChatGit(ctx)
      git.effects[1]()
      git.effects[2]()
      git.effects[3]()
      return h('div')
    })
    harnesses.push(harness)
    await flush()
    expect(requests.filter((r) => r.url.endsWith('/git-status'))).toHaveLength(1)
    harness.ctx.props.gitStatusTick = 1
    await flush()
    // Debounced, so nothing yet; after 400 ms the fetch lands.
    expect(requests.filter((r) => r.url.endsWith('/git-status'))).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(400)
    expect(requests.filter((r) => r.url.endsWith('/git-status'))).toHaveLength(2)
  })
})

describe('sounds preference', () => {
  it('reads the stored device preference at creation and latches it on mount', async () => {
    localStorage.setItem('molecule.ide.sounds', JSON.stringify({ error: 'off' }))
    let sounds!: ChatSoundsSlice
    const harness = mountHarness(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.stream = fakeStream()
      sounds = createChatSounds(ctx)
      sounds.effects[1]()
      return h('div')
    })
    harnesses.push(harness)
    await flush()
    expect(sounds?.soundsConfig.value.error).toBe('off')
    expect(sounds?.soundsLocallySetRef.current).toBe(true)
  })

  it('starts from the defaults and stays unlatched without a stored preference', async () => {
    let sounds!: ChatSoundsSlice
    const harness = mountHarness(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.stream = fakeStream()
      sounds = createChatSounds(ctx)
      sounds.effects[1]()
      return h('div')
    })
    harnesses.push(harness)
    await flush()
    expect(sounds?.soundsConfig.value.message).toBe('always')
    expect(sounds?.soundsLocallySetRef.current).toBe(false)
  })

  it('cycling a mode persists it to this device', async () => {
    let sounds!: ChatSoundsSlice
    const harness = mountHarness(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.stream = fakeStream()
      sounds = createChatSounds(ctx)
      return h('div')
    })
    harnesses.push(harness)
    await sounds?.cycleSoundMode('error')
    expect(sounds?.soundsConfig.value.error).toBe('always')
    expect(sounds?.soundsLocallySetRef.current).toBe(true)
    expect(JSON.parse(localStorage.getItem('molecule.ide.sounds') ?? '{}')).toEqual(
      sounds?.soundsConfig.value,
    )
  })
})

describe('preferences', () => {
  it('toggling timestamps persists the device flag and confirms with a card', async () => {
    const cards: string[] = []
    let prefs!: ReturnType<typeof createChatPrefs>
    const harness = mountHarness(buildRejectingHttpClient(), {}, (ctx) => {
      ctx.systemCards = fakeSystemCards(cards)
      prefs = createChatPrefs(ctx)
      return h('div')
    })
    harnesses.push(harness)
    prefs?.applyTimestampsVisible(true)
    expect(localStorage.getItem(CHAT_TIMESTAMPS_STORAGE_KEY)).toBe('true')
    expect(cards).toEqual(['Timestamps shown.'])
    prefs?.applyTimestampsVisible(false)
    expect(localStorage.getItem(CHAT_TIMESTAMPS_STORAGE_KEY)).toBe('false')
    expect(cards).toEqual(['Timestamps shown.', 'Timestamps hidden.'])
  })
})

describe('skills seed', () => {
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
    const harness = mountHarness(http, {}, (ctx) => {
      const slice = createChatSkills(ctx)
      slice.effects[1]()
      skills = slice
      return h('div')
    })
    harnesses.push(harness)
    await settle()
    expect(requests.map((r) => r.url)).toEqual([
      '/projects/p1/files-list',
      '/projects/p1/files/.agents/skills/deploy/SKILL.md',
    ])
    expect(skills?.projectSkills.value.map((s) => s.path)).toEqual([
      '.agents/skills/deploy/SKILL.md',
    ])
    expect([...(skills?.defaultSkillPaths.value ?? [])]).toEqual(['.agents/skills/deploy/SKILL.md'])
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
    const harness = mountHarness(http, {}, (ctx) => {
      const slice = createChatSkills(ctx)
      slice.effects[1]()
      skills = slice
      return h('div')
    })
    harnesses.push(harness)
    await flush()
    expect(skills?.skillsLoadedRef.current).toBe(false)
    await vi.advanceTimersByTimeAsync(1_500)
    await flush()
    expect(skills?.skillsLoadedRef.current).toBe(true)
    expect(skills?.projectSkills.value).toHaveLength(1)
    expect(requests.filter((r) => r.url.endsWith('/files-list'))).toHaveLength(2)
  })
})

describe('project settings hydration', () => {
  it('subscribes to the catalog at mount and adopts its free-tier model', async () => {
    const requests: Recorded[] = []
    const model = {
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
    const http = recordingHttp(requests, {
      '/ai/models': { models: [model], defaults: { plan: 'free-model' } },
      '/projects/p1': { settings: {} },
    })
    const autoCommit = fakeAutoCommit()
    let models!: ReturnType<typeof createChatModels>
    const harness = mountHarness(http, {}, (ctx) => {
      ctx.autoCommit = autoCommit.slice
      ctx.skills = createChatSkills(ctx)
      ctx.sounds = fakeSounds(true)
      ctx.systemCards = fakeSystemCards()
      const slice = createChatModels(ctx)
      slice.effects[2]()
      models = slice
      return h('div')
    })
    harnesses.push(harness)
    await settle()
    expect(requests.map((r) => r.url)).toContain('/ai/models?projectId=p1')
    expect(models?.AVAILABLE_MODELS.value).toHaveLength(1)
    expect(models?.FREE_TIER_MODEL.value).toBe('free-model')
    expect(models?.currentModel.value).toBe('free-model')
    expect(models?.modelsLoading.value).toBe(false)
    expect(models?.serverModelDefaults.value).toEqual({ plan: 'free-model' })
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
    const harness = mountHarness(http, {}, (ctx) => {
      ctx.autoCommit = autoCommit.slice
      ctx.skills = createChatSkills(ctx)
      ctx.sounds = fakeSounds(true)
      ctx.systemCards = fakeSystemCards()
      const slice = createChatModels(ctx)
      slice.effects[2]()
      models = slice
      return h('div')
    })
    harnesses.push(harness)
    await settle()
    expect(models?.savedChatModel.value).toBe('chat-1')
    expect(models?.planModel.value).toBe('plan-1')
    expect(models?.executeModel.value).toBe('exec-1')
    expect(models?.effortLevel.value).toBe('high')
    expect(models?.effortByMode.value).toEqual({ plan: 'low' })
    expect(models?.modelRegions.value).toEqual({ 'chat-1': 'cn' })
    expect(models?.currentMaxLoops.value).toBe(7)
    expect(models?.autoFixEnabled.value).toBe(false)
    expect(models?.autoApproveCommandsEnabled.value).toBe(true)
    expect(autoCommit.slice.autoCommitPersistedRef.current).toBeGreaterThan(0)
    expect(autoCommit.dispatched).toEqual([
      { type: 'hydrate', seconds: autoCommit.slice.autoCommitPersistedRef.current },
    ])
    expect(requests.map((r) => r.url)).toContain('/projects/p1')
  })

  it('applies the saved default skills and the legacy project sounds', async () => {
    const requests: Recorded[] = []
    const http = recordingHttp(requests, {
      '/ai/models': { models: [], defaults: {} },
      '/projects/p1': {
        settings: { defaultSkills: ['.agents/skills/a/SKILL.md'], sounds: { error: 'off' } },
      },
    })
    const sounds = fakeSounds(false)
    let models: ReturnType<typeof createChatModels> | null = null
    let skills!: ChatSkillsSlice
    const autoCommit = fakeAutoCommit()
    const harness = mountHarness(http, {}, (ctx) => {
      ctx.autoCommit = autoCommit.slice
      ctx.sounds = sounds
      const skillsSlice = createChatSkills(ctx)
      skills = skillsSlice
      ctx.skills = skillsSlice
      ctx.systemCards = fakeSystemCards()
      const slice = createChatModels(ctx)
      slice.effects[2]()
      models = slice
      return h('div')
    })
    harnesses.push(harness)
    await settle()
    expect([...(skills?.defaultSkillPaths.value ?? [])]).toEqual(['.agents/skills/a/SKILL.md'])
    expect(skills?.defaultSkillsExplicit.value).toBe(true)
    expect(skills?.defaultSkillsExplicitRef.current).toBe(true)
    expect(sounds.soundsConfig.value.error).toBe('off')
    expect(models).not.toBeNull()
  })

  it('re-reads the settings when the host change signal bumps', async () => {
    const requests: Recorded[] = []
    let planModel = 'first'
    const http: HttpClient = {
      ...buildRejectingHttpClient(),
      get: async <T>(url: string): Promise<HttpResponse<T>> => {
        requests.push({ method: 'GET', url })
        if (url.startsWith('/ai/models')) return ok({ models: [], defaults: {} } as never)
        return ok({ settings: { planModel } } as never)
      },
    }
    const autoCommit = fakeAutoCommit()
    let models!: ReturnType<typeof createChatModels>
    const harness = mountHarness(http, { modelSelectionSignal: 0 }, (ctx) => {
      ctx.autoCommit = autoCommit.slice
      ctx.skills = createChatSkills(ctx)
      ctx.sounds = fakeSounds(true)
      ctx.systemCards = fakeSystemCards()
      const slice = createChatModels(ctx)
      slice.effects[2]()
      slice.effects[3]()
      models = slice
      return h('div')
    })
    harnesses.push(harness)
    await settle()
    expect(models?.planModel.value).toBe('first')
    planModel = 'second'
    harness.ctx.props.modelSelectionSignal = 1
    await flush()
    await settle()
    expect(models?.planModel.value).toBe('second')
    expect(requests.filter((r) => r.url === '/projects/p1')).toHaveLength(2)
  })

  it('leaves auto-commit off when the settings read fails', async () => {
    const http: HttpClient = {
      ...buildRejectingHttpClient(),
      get: async <T>(url: string): Promise<HttpResponse<T>> => {
        if (url.startsWith('/ai/models')) return ok({ models: [], defaults: {} } as never)
        throw new Error('settings unavailable')
      },
    }
    const loaded: boolean[] = []
    const autoCommit = fakeAutoCommit(loaded)
    let models: ReturnType<typeof createChatModels> | null = null
    const harness = mountHarness(http, {}, (ctx) => {
      ctx.autoCommit = autoCommit.slice
      ctx.skills = createChatSkills(ctx)
      ctx.sounds = fakeSounds(true)
      ctx.systemCards = fakeSystemCards()
      const slice = createChatModels(ctx)
      slice.effects[2]()
      models = slice
      return h('div')
    })
    harnesses.push(harness)
    await settle()
    await nextTick()
    expect(autoCommit.slice.autoCommitPersistedRef.current).toBe(0)
    expect(loaded).toEqual([true])
    expect(autoCommit.dispatched).toEqual([])
    expect(models).not.toBeNull()
  })
})
