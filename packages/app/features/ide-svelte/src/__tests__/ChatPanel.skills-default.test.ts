// @vitest-environment jsdom
/**
 * P3-11 — the `/skills` default-loaded set's toggle math + reset are REAL,
 * end-to-end, through the actual ChatPanel.
 *
 * A port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.skills-default.test.tsx` with
 * the same test names and the same assertions: when `settings.defaultSkills` is
 * unset ALL discovered skills are default; the panel seeds its badge set only
 * AFTER its own (non-empty) skills load (the race guard), and the reset returns
 * to the implicit unset→all state. This renders the real panel, opens
 * `/skills`, and proves both fixes plus the server-driven "Loaded N skills"
 * card and the always-reserved activity slot.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
  submit,
} from './chat-panel-harness.js'

const PROJECT_ID = 'proj-skills'

const SKILL_PATHS = [
  '.agents/skills/auth/SKILL.md',
  '.agents/skills/caching/SKILL.md',
  '.agents/skills/deploy/SKILL.md',
] as const

/**
 * Frontmatter content for one skill so `parseSkillMeta` yields its name.
 *
 * @param name - The skill's name.
 * @returns The SKILL.md body.
 */
function skillContent(name: string): string {
  return ['---', `name: ${name}`, `description: The ${name} skill.`, '---', '', `# ${name}`].join(
    '\n',
  )
}

/**
 * Maps a `/files/<rel>` URL to its skill name (the dir under .agents/skills/).
 *
 * @param url - The requested file URL.
 * @returns The skill name.
 */
function nameForFilesUrl(url: string): string {
  const match = url.match(/\.agents\/skills\/([^/]+)\/SKILL\.md$/)
  return match ? match[1] : 'unknown'
}

/**
 * A chat provider whose history resolves empty. `emit` lets a test drive
 * server stream events (e.g. a skills card) through the live send path.
 *
 * @param emit - Optional: emit stream events on send.
 * @returns The stub provider.
 */
function buildEmitChatProvider(
  emit?: (onEvent: (event: ChatStreamEvent) => void) => void,
): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (_message, _config, onEvent): Promise<void> => {
      emit?.(onEvent)
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/**
 * A typed HTTP success envelope.
 *
 * @param data - The response payload.
 * @returns The envelope.
 */
const ok = responseOf

/** The PATCH spy's type. */
type PatchSpy = ReturnType<
  typeof vi.fn<
    (url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>
  >
>

/**
 * An {@link HttpClient} stub serving the project settings + a fixed skill list.
 *
 * @param settings - The settings the project GET resolves.
 * @param patchSpy - The PATCH spy.
 * @param filesList - Returns the file list for a `…/files-list` GET.
 * @returns The stub client.
 */
function buildHttpClient(
  settings: Record<string, unknown>,
  patchSpy: PatchSpy,
  filesList: () => Promise<string[]>,
): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = async (url: string): Promise<HttpResponse<never>> => {
    if (url === `/projects/${PROJECT_ID}`) return ok({ settings })
    if (url.endsWith('/files-list')) return ok({ files: await filesList() })
    if (url.includes('/files/')) return ok({ content: skillContent(nameForFilesUrl(url)) })
    return reject()
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
    post: reject,
    put: reject,
    patch: patchSpy,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/**
 * Polls `predicate` until it stops throwing.
 *
 * @param predicate - The assertion to retry.
 * @param timeout - How long to keep trying, in ms.
 * @returns A promise resolved once the predicate passes.
 */
async function waitFor(predicate: () => void, timeout = 3000): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      predicate()
      return
    } catch (error) {
      if (Date.now() - started > timeout) throw error
      await new Promise((resolve) => setTimeout(resolve, 10))
      await flush()
    }
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the panel over the given HTTP stub.
 *
 * @param http - The HTTP client stub.
 * @param provider - The chat provider (defaults to an empty stub).
 * @param extraProps - Extra panel props.
 * @returns The mount container.
 */
function mountChatPanel(
  http: HttpClient,
  provider: ChatProvider = buildEmitChatProvider(),
  extraProps: Record<string, unknown> = {},
): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http,
    chat: provider,
    projectId: PROJECT_ID,
    props: { ...extraProps },
  })
  return mounted.container
}

/**
 * Pulls the `defaultSkills` value from the last PATCH that carried one.
 *
 * @param patchSpy - The PATCH spy.
 * @returns The persisted value, or `'none'` when no PATCH carried one.
 */
function lastDefaultSkillsPatch(spy: PatchSpy): unknown[] | null | undefined | 'none' {
  const calls = spy.mock.calls
  for (let i = calls.length - 1; i >= 0; i--) {
    const body = calls[i]?.[1] as { settings?: Record<string, unknown> } | undefined
    if (body?.settings && 'defaultSkills' in body.settings) {
      return body.settings.defaultSkills as unknown[] | null
    }
  }
  return 'none'
}

/**
 * A `filesList` that returns EMPTY on its first invocation and the full skill
 * set thereafter — models the sandbox file API not serving `.agents` yet.
 *
 * @returns A `filesList` closure with first-call-empty behavior.
 */
function emptyThenPopulated(): () => Promise<string[]> {
  let calls = 0
  return async () => {
    calls++
    return calls === 1 ? [] : [...SKILL_PATHS]
  }
}

/**
 * Whether any PATCH persisted the per-project `settings.skillsLoadedAnnounced`
 * marker.
 *
 * @param spy - The PATCH spy.
 * @returns True if a PATCH carried `settings.skillsLoadedAnnounced === true`.
 */
function announcedMarkerPatched(spy: PatchSpy): boolean {
  return spy.mock.calls.some((call) => {
    const body = call[1] as { settings?: Record<string, unknown> } | undefined
    return body?.settings?.skillsLoadedAnnounced === true
  })
}

/**
 * A fresh PATCH spy.
 *
 * @returns The spy.
 */
function makePatchSpy(): PatchSpy {
  return vi.fn(async () => ok({}))
}

/**
 * Waits for the panel's composer to render.
 *
 * @param container - The mount container.
 * @returns A promise resolved once the composer is up.
 */
async function ready(container: HTMLElement): Promise<void> {
  await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [{ d: 'x' }], viewBox: '0 0 16 16' }) }))
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
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel /skills default set — toggle math + reset (P3-11)', () => {
  it('toggling one default OFF from the implicit all-default state PATCHes all-minus-one (not a bogus singleton)', async () => {
    const patchSpy = makePatchSpy()
    const container = mountChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]))

    await ready(container)
    submit(container, '/skills')

    // The seeded all-default state: every skill shows a "Default" badge with no click.
    let authToggle: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-default-auth"]')
      expect(el, 'the auth row + default toggle must render').not.toBeNull()
      expect(
        container.querySelector('[data-mol-id="skill-default-badge-deploy"]'),
        'every skill must be a seeded default (unset → all)',
      ).not.toBeNull()
      authToggle = el as HTMLButtonElement
    })
    // It reads as a default (filled / pressed) before any interaction.
    expect(authToggle!.getAttribute('aria-pressed')).toBe('true')

    // Turn auth OFF — from the implicit all-default base, this is "all-minus-one".
    authToggle!.click()

    await waitFor(() => {
      const persisted = lastDefaultSkillsPatch(patchSpy)
      expect(Array.isArray(persisted), 'a defaultSkills array must be persisted').toBe(true)
      const arr = persisted as string[]
      // The corrected math: the OTHER two skills remain, auth is dropped — NOT
      // the old bug's bogus singleton [".../auth/SKILL.md"].
      expect(arr).toHaveLength(2)
      expect(arr).toContain('.agents/skills/caching/SKILL.md')
      expect(arr).toContain('.agents/skills/deploy/SKILL.md')
      expect(arr).not.toContain('.agents/skills/auth/SKILL.md')
    })
  })

  it('reset ("Load all by default") appears once explicit and PATCHes defaultSkills: null', async () => {
    const patchSpy = makePatchSpy()
    const container = mountChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]))

    await ready(container)
    submit(container, '/skills')

    let authToggle: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-default-auth"]')
      expect(el).not.toBeNull()
      authToggle = el as HTMLButtonElement
    })

    // While implicit all-default, there's nothing to reset → no control yet.
    expect(container.querySelector('[data-mol-id="skill-reset-defaults"]')).toBeNull()

    // Make the set explicit by toggling one off → the reset control appears.
    authToggle!.click()
    let reset: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-reset-defaults"]')
      expect(el, 'the reset control must appear once the set is explicit').not.toBeNull()
      reset = el as HTMLButtonElement
    })
    expect(reset!.textContent).toContain('Load all by default')

    reset!.click()
    await waitFor(() => {
      // Resetting persists null so the backend treats it as unset → all again.
      expect(lastDefaultSkillsPatch(patchSpy)).toBeNull()
    })
  })

  it('a star click BEFORE the panel finishes loading skills persists NOTHING (the race guard)', async () => {
    const patchSpy = makePatchSpy()
    // Defer each `…/files-list` GET so the test controls resolution order. The
    // panel's own skills load fires first (deferred[0]); the /skills card's load
    // fires second (deferred[1]).
    const deferred: Array<(files: string[]) => void> = []
    const filesList = (): Promise<string[]> =>
      new Promise<string[]>((resolve) => deferred.push(resolve))

    const container = mountChatPanel(buildHttpClient({}, patchSpy, filesList))

    await ready(container)
    submit(container, '/skills')

    // Resolve ONLY the /skills card's list (the 2nd caller), leaving the panel's
    // own load (the 1st caller) pending → projectSkills stays empty.
    await waitFor(() => expect(deferred.length).toBeGreaterThanOrEqual(2))
    deferred[1]?.([...SKILL_PATHS])

    // The card renders its rows (its own load resolved), but the panel hasn't
    // seeded its default set yet, so NO "Default" badge shows.
    let authToggle: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-default-auth"]')
      expect(el, 'the card row must render from its own load').not.toBeNull()
      authToggle = el as HTMLButtonElement
    })
    expect(
      container.querySelector('[data-mol-id="skill-default-badge-auth"]'),
      'the panel has not seeded defaults yet, so no Default badge',
    ).toBeNull()

    // Click while the panel is still loading — the guard must drop it.
    authToggle!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(lastDefaultSkillsPatch(patchSpy)).toBe('none')

    // Now let the panel's own load resolve → it seeds all-default; the same click
    // now persists the correct all-minus-one set.
    deferred[0]?.([...SKILL_PATHS])
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull(),
    )
    authToggle!.click()
    await waitFor(() => {
      const persisted = lastDefaultSkillsPatch(patchSpy)
      expect(Array.isArray(persisted)).toBe(true)
      const arr = persisted as string[]
      expect(arr).toHaveLength(2)
      expect(arr).not.toContain('.agents/skills/auth/SKILL.md')
    })
  })
})

describe('ChatPanel /skills default seed — hardened retry + "Loaded N skills" card (SYN)', () => {
  it('empty first load → bounded retry eventually seeds ALL skills as default (no hollow stars)', async () => {
    const patchSpy = makePatchSpy()
    const container = mountChatPanel(buildHttpClient({}, patchSpy, emptyThenPopulated()))

    await ready(container)
    submit(container, '/skills')

    // The /skills card renders its rows from its OWN (2nd, populated) load, but
    // the panel's first seed load came back EMPTY — no Default badge yet.
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-default-auth"]')).not.toBeNull(),
    )
    expect(
      container.querySelector('[data-mol-id="skill-default-badge-auth"]'),
      'the empty first load must NOT have latched/seeded defaults yet',
    ).toBeNull()

    // The hardened seed retries (~1.5s): the retry's non-empty load finally seeds
    // the full default set, so every star fills.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="skill-default-badge-deploy"]')).not.toBeNull()
    }, 5000)
  })

  it('renders the "Loaded N skills" card from a server card event (kind:skills)', async () => {
    // The card is SERVER-driven now: the server emits a `card` event carrying
    // { kind:'skills', count } with an id + timestamp; the session appends it as
    // a card-message and the timeline renders it from `cardEvent`.
    const provider = buildEmitChatProvider((onEvent) => {
      onEvent({
        type: 'card',
        id: 'card-skills-1',
        timestamp: 1000,
        card: { kind: 'skills', count: 3 },
      })
      onEvent({ type: 'done' })
    })
    const container = mountChatPanel(
      buildHttpClient({}, makePatchSpy(), async () => [...SKILL_PATHS]),
      provider,
    )

    await ready(container)
    // Sending a message drives the server stream, which emits the skills card.
    submit(container, 'build me an app')

    let card: HTMLElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-skills-loaded"]')
      expect(el, 'the "Loaded N skills" card must render from the server card event').not.toBeNull()
      card = el as HTMLElement
    })
    expect(card!.textContent).toContain('Loaded 3 skills')
    // Exactly one — never duplicated.
    expect(container.querySelectorAll('[data-mol-id="chat-skills-loaded"]')).toHaveLength(1)
  })

  it('does NOT announce the skills card client-side (it is server-driven now)', async () => {
    const patchSpy = makePatchSpy()
    const container = mountChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]))

    await ready(container)
    // Open /skills and wait for the LOCAL seed to finish (Default badges prove it ran)…
    submit(container, '/skills')
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull(),
    )
    // …yet the client never announces the card on its own, and never PATCHes the
    // per-project marker — the server owns it.
    expect(container.querySelector('[data-mol-id="chat-skills-loaded"]')).toBeNull()
    expect(announcedMarkerPatched(patchSpy)).toBe(false)
  })

  it('clicking the "Loaded N skills" card (from a skills_loaded event) opens the /skills overlay', async () => {
    const provider = buildEmitChatProvider((onEvent) => {
      onEvent({
        type: 'card',
        id: 'card-skills-1',
        timestamp: 1000,
        card: { kind: 'skills', count: 3 },
      })
      onEvent({ type: 'done' })
    })
    const container = mountChatPanel(
      buildHttpClient({}, makePatchSpy(), async () => [...SKILL_PATHS]),
      provider,
    )

    await ready(container)
    submit(container, 'build me an app')
    let card: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-skills-loaded"]')
      expect(el).not.toBeNull()
      card = el as HTMLButtonElement
    })

    // Neither the skills browser nor its closeable overlay is open yet.
    expect(container.querySelector('[data-mol-id="skills-card"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()

    card!.click()

    // Clicking opens the closeable overlay — the exact same path as typing /skills.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="skills-card"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).not.toBeNull()
    })
  })

  it('invoking /skills opens the closeable overlay and the ✕ closes it', async () => {
    const patchSpy = makePatchSpy()
    const container = mountChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]))

    await ready(container)

    // Not an inline timeline card — the overlay shell (✕) is what opens.
    expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()

    submit(container, '/skills')

    // The overlay opens with the SkillsCard mounted inside it + a ✕ close button.
    let close: HTMLButtonElement | null = null
    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="panel-overlay-close"]')
      expect(el, 'the /skills overlay must open with a ✕ close button').not.toBeNull()
      expect(container.querySelector('[data-mol-id="skills-card"]')).not.toBeNull()
      close = el as HTMLButtonElement
    })

    // Clicking ✕ closes the overlay — both the shell and the card unmount.
    close!.click()
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()
      expect(container.querySelector('[data-mol-id="skills-card"]')).toBeNull()
    })
  })
})

describe('ChatPanel activity slot — always reserved, opacity-toggled (no jump, no gaps)', () => {
  /**
   * The HTTP stub the activity tests mount over.
   *
   * @returns The stub client.
   */
  const http = (): HttpClient => buildHttpClient({}, makePatchSpy(), async () => [...SKILL_PATHS])

  it('keeps the activity slot in the layout but invisible when idle', async () => {
    const container = mountChatPanel(http())
    await ready(container)
    const slot = container.querySelector<HTMLElement>('[data-mol-id="chat-activity-slot"]')
    // Reserved in the layout (so showing/hiding the indicator never shifts the list height)…
    expect(slot).not.toBeNull()
    // …but invisible + inert while idle.
    expect(slot!.style.opacity).toBe('0')
    expect(slot!.getAttribute('aria-hidden')).toBe('true')
  })

  it('shows the SAME slot (opacity 1) while waiting for the sandbox to boot', async () => {
    const container = mountChatPanel(http(), buildEmitChatProvider(), {
      awaitingSandboxBoot: true,
    })
    await ready(container)
    const slot = container.querySelector<HTMLElement>('[data-mol-id="chat-activity-slot"]')
    expect(slot).not.toBeNull()
    expect(slot!.style.opacity).toBe('1')
    expect(slot!.getAttribute('aria-hidden')).toBe('false')
    // The labeled wait copy renders inside the same reserved slot.
    expect(slot!.textContent).toContain('development environment')
  })

  it('shows streaming activity — never the sandbox-boot copy — during a REMOTE turn', async () => {
    // A viewer (or second tab) watching a teammate's turn: no local send, so
    // isLoading is false and only remoteStreaming is true.
    let push: ((conversationId: string, event: ChatStreamEvent) => void) | null | undefined
    const container = mountChatPanel(http(), buildEmitChatProvider(), {
      endpoint: `/projects/${PROJECT_ID}/chat?conversationId=conv-1`,
      onRegisterPushHandler: (
        handler: ((conversationId: string, event: ChatStreamEvent) => void) | null,
      ) => {
        push = handler
      },
    })
    await ready(container)
    expect(push).toBeDefined()
    await waitFor(() => {
      push?.('conv-1', {
        type: 'message_start',
        id: 'remote-msg-1',
        timestamp: Date.now(),
      })
      // React's external store re-renders synchronously on a store write
      // (useSyncExternalStore forces the sync refresh), so the assertion sees
      // the pushed frame before the 0 ms remote-stream poll retires it. Svelte
      // schedules that render, so flush it here to read the same frame.
      flushSync()
      const slot = container.querySelector<HTMLElement>('[data-mol-id="chat-activity-slot"]')
      expect(slot).not.toBeNull()
      expect(slot!.style.opacity).toBe('1')
    })
    const slot = container.querySelector<HTMLElement>('[data-mol-id="chat-activity-slot"]')
    expect(slot!.textContent).not.toContain('development environment')
  })
})
