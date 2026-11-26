// @vitest-environment jsdom
/**
 * P3-11 — the `/skills` default-loaded set's toggle math + reset are REAL,
 * end-to-end, through the actual {@link ChatPanel}.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.skills-default.test.tsx`
 * with the same test names and the same assertions: toggling one default OFF
 * from the implicit all-default state PATCHes all-minus-one (never a bogus
 * singleton), the "Load all by default" reset appears once explicit and
 * PATCHes `defaultSkills: null`, a star click before the panel's skills load
 * persists nothing (the race guard), an empty first load retries and seeds every
 * skill, the "Loaded N skills" card is server-driven, clicking it opens the
 * `/skills` overlay, and the activity slot stays reserved but invisible when
 * idle.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
import type { HttpClient } from '@molecule/app-http'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
  responseOf,
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
 * @returns The file content.
 */
function skillContent(name: string): string {
  return ['---', `name: ${name}`, `description: The ${name} skill.`, '---', '', `# ${name}`].join(
    '\n',
  )
}

/**
 * Maps a `/files/<rel>` URL to its skill name (the dir under .agents/skills/).
 *
 * @param url - The file URL.
 * @returns The skill name.
 */
function nameForFilesUrl(url: string): string {
  const match = url.match(/\.agents\/skills\/([^/]+)\/SKILL\.md$/)
  return match ? match[1] : 'unknown'
}

/**
 * A chat provider whose history resolves empty. `emit` (optional) lets a test
 * drive server stream events through the live send path.
 *
 * @param emit - Optional: emit stream events on send.
 * @returns The stub provider.
 */
function buildChatProvider(
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
 * An {@link HttpClient} stub serving the project settings + a fixed skill list.
 * `filesList` is invoked for each `…/files-list` GET so a test can defer one
 * caller's resolution (the race), or resolve immediately (the happy path).
 *
 * @param settings - The settings the project GET resolves.
 * @param patchSpy - The PATCH spy.
 * @param filesList - Returns the file list for a `…/files-list` GET.
 * @returns The stub client.
 */
function buildHttpClient(
  settings: Record<string, unknown>,
  patchSpy: (url: string, data?: unknown) => Promise<unknown>,
  filesList: () => Promise<string[]>,
): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get: HttpClient['get'] = async (url: string) => {
    if (url === `/projects/${PROJECT_ID}`) return responseOf({ settings })
    if (url.endsWith('/files-list')) return responseOf({ files: await filesList() })
    if (url.includes('/files/')) return responseOf({ content: skillContent(nameForFilesUrl(url)) })
    return reject()
  }
  const patch: HttpClient['patch'] = async (url: string, data?: unknown) => {
    await patchSpy(url, data)
    return responseOf({})
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
    post: reject,
    put: reject,
    patch,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
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
})

/**
 * Mounts {@link ChatPanel} inside every provider it needs.
 *
 * @param http - The HTTP client stub.
 * @param provider - The chat provider.
 * @param extraProps - Additional panel props.
 * @returns The mount container.
 */
async function renderChatPanel(
  http: HttpClient,
  provider: ChatProvider = buildChatProvider(),
  extraProps: Record<string, unknown> = {},
): Promise<HTMLElement> {
  mounted?.unmount()
  mounted = null
  mounted = await mountPanel({
    http,
    chat: provider,
    props: { projectId: PROJECT_ID, ...extraProps },
  })
  return mounted.container.ownerDocument.body
}

/**
 * Submits a slash command through the real composer.
 *
 * @param container - The rendered ChatPanel container.
 * @param text - The exact command text to type and submit.
 */
function submitCommand(container: HTMLElement, text: string): void {
  const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement | null
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  mounted?.tick()
}

/**
 * Pulls the `defaultSkills` value from the last PATCH that carried one.
 *
 * @param patchSpy - The PATCH spy.
 * @returns The persisted value, `'none'` when no PATCH carried one.
 */
function lastDefaultSkillsPatch(
  patchSpy: ReturnType<typeof vi.fn>,
): unknown[] | null | undefined | 'none' {
  for (let i = patchSpy.mock.calls.length - 1; i >= 0; i--) {
    const body = patchSpy.mock.calls[i]![1] as { settings?: Record<string, unknown> } | undefined
    if (body?.settings && 'defaultSkills' in body.settings) {
      return body.settings['defaultSkills'] as unknown[] | null
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
 * Whether any PATCH persisted the per-project `settings.skillsLoadedAnnounced` marker.
 *
 * @param patchSpy - The PATCH spy.
 * @returns True if a PATCH carried `settings.skillsLoadedAnnounced === true`.
 */
function announcedMarkerPatched(patchSpy: ReturnType<typeof vi.fn>): boolean {
  return patchSpy.mock.calls.some((call) => {
    const body = call[1] as { settings?: Record<string, unknown> } | undefined
    return body?.settings?.['skillsLoadedAnnounced'] === true
  })
}

describe('ChatPanel /skills default set — toggle math + reset (P3-11)', () => {
  it(
    'toggling one default OFF from the implicit all-default state PATCHes all-minus-one (not a bogus singleton)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const patchSpy = vi.fn(async () => ({}))
      const container = await renderChatPanel(
        buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]),
      )

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      submitCommand(container, '/skills')

      // The seeded all-default state: every skill shows a "Default" badge with no click.
      const authToggle = (await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="skill-default-auth"]')
        expect(el, 'the auth row + default toggle must render').not.toBeNull()
        expect(
          container.querySelector('[data-mol-id="skill-default-badge-deploy"]'),
          'every skill must be a seeded default (unset → all)',
        ).not.toBeNull()
        return el as HTMLElement
      })) as HTMLButtonElement
      // It reads as a default (filled / pressed) before any interaction.
      expect(authToggle.getAttribute('aria-pressed')).toBe('true')

      // Turn auth OFF — from the implicit all-default base, this is "all-minus-one".
      authToggle.click()
      mounted?.tick()

      await vi.waitFor(() => {
        const persisted = lastDefaultSkillsPatch(patchSpy)
        expect(Array.isArray(persisted), 'a defaultSkills array must be persisted').toBe(true)
        const arr = persisted as string[]
        // The corrected math: the OTHER two skills remain, auth is dropped — NOT the
        // old bug's bogus singleton [".../auth/SKILL.md"].
        expect(arr).toHaveLength(2)
        expect(arr).toContain('.agents/skills/caching/SKILL.md')
        expect(arr).toContain('.agents/skills/deploy/SKILL.md')
        expect(arr).not.toContain('.agents/skills/auth/SKILL.md')
      })
    },
  )

  it(
    'reset ("Load all by default") appears once explicit and PATCHes defaultSkills: null',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const patchSpy = vi.fn(async () => ({}))
      const container = await renderChatPanel(
        buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]),
      )

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      submitCommand(container, '/skills')

      const authToggle = (await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="skill-default-auth"]')
        expect(el).not.toBeNull()
        return el as HTMLElement
      })) as HTMLButtonElement

      // While implicit all-default, there's nothing to reset → no control yet.
      expect(container.querySelector('[data-mol-id="skill-reset-defaults"]')).toBeNull()

      // Make the set explicit by toggling one off → the reset control appears.
      authToggle.click()
      mounted?.tick()
      const reset = (await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="skill-reset-defaults"]')
        expect(el, 'the reset control must appear once the set is explicit').not.toBeNull()
        return el as HTMLElement
      })) as HTMLButtonElement
      expect(reset.textContent).toContain('Load all by default')

      reset.click()
      mounted?.tick()
      await vi.waitFor(() => {
        // Resetting persists null so the backend treats it as unset → all again.
        expect(lastDefaultSkillsPatch(patchSpy)).toBeNull()
      })
    },
  )

  it(
    'a star click BEFORE the panel finishes loading skills persists NOTHING (the race guard)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const patchSpy = vi.fn(async () => ({}))
      // Defer each `…/files-list` GET so the test controls resolution order. The
      // panel's own skills load fires first (deferred[0]); the /skills card's load
      // fires second (deferred[1]).
      const deferred: Array<(files: string[]) => void> = []
      const filesList = (): Promise<string[]> =>
        new Promise<string[]>((resolve) => deferred.push(resolve))

      const container = await renderChatPanel(buildHttpClient({}, patchSpy, filesList))

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      submitCommand(container, '/skills')

      // Resolve ONLY the /skills card's list (the 2nd caller), leaving the panel's
      // own load (the 1st caller) pending → the panel's projectSkills stays empty.
      await vi.waitFor(() => expect(deferred.length).toBeGreaterThanOrEqual(2))
      deferred[1]!([...SKILL_PATHS])

      // The card renders its rows (its own load resolved), but the panel hasn't
      // seeded its default set yet, so NO "Default" badge shows.
      const authToggle = (await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="skill-default-auth"]')
        expect(el, 'the card row must render from its own load').not.toBeNull()
        return el as HTMLElement
      })) as HTMLButtonElement
      expect(
        container.querySelector('[data-mol-id="skill-default-badge-auth"]'),
        'the panel has not seeded defaults yet, so no Default badge',
      ).toBeNull()

      // Click while the panel is still loading — the guard must drop it.
      authToggle.click()
      await Promise.resolve()
      expect(lastDefaultSkillsPatch(patchSpy)).toBe('none')

      // Now let the panel's own load resolve → it seeds all-default; the same click
      // now persists the correct all-minus-one set.
      deferred[0]!([...SKILL_PATHS])
      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull(),
      )
      authToggle.click()
      mounted?.tick()
      await vi.waitFor(() => {
        const persisted = lastDefaultSkillsPatch(patchSpy)
        expect(Array.isArray(persisted)).toBe(true)
        const arr = persisted as string[]
        expect(arr).toHaveLength(2)
        expect(arr).not.toContain('.agents/skills/auth/SKILL.md')
      })
    },
  )
})

describe('ChatPanel /skills default seed — hardened retry + "Loaded N skills" card (SYN)', () => {
  it(
    'empty first load → bounded retry eventually seeds ALL skills as default (no hollow stars)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const patchSpy = vi.fn(async () => ({}))
      const container = await renderChatPanel(buildHttpClient({}, patchSpy, emptyThenPopulated()))

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      submitCommand(container, '/skills')

      // The /skills card renders its rows from its OWN (2nd, populated) load, but the
      // panel's first seed load came back EMPTY — so no Default badge has seeded yet.
      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-id="skill-default-auth"]')).not.toBeNull(),
      )
      expect(
        container.querySelector('[data-mol-id="skill-default-badge-auth"]'),
        'the empty first load must NOT have latched/seeded defaults yet',
      ).toBeNull()

      // The hardened seed retries (~1.5s): the retry's non-empty load finally seeds
      // the full default set, so every star fills.
      await vi.waitFor(
        () => {
          expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull()
          expect(
            container.querySelector('[data-mol-id="skill-default-badge-deploy"]'),
          ).not.toBeNull()
        },
        { timeout: 4000 },
      )
    },
  )

  it(
    'renders the "Loaded N skills" card from a server card event (kind:skills)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // The card is SERVER-driven: the server emits a `card` event carrying
      // { kind:'skills', count }; the timeline renders it from `cardEvent`.
      const provider = buildChatProvider((onEvent) => {
        onEvent({
          type: 'card',
          id: 'card-skills-1',
          timestamp: 1000,
          card: { kind: 'skills', count: 3 },
        })
        onEvent({ type: 'done' })
      })
      const container = await renderChatPanel(
        buildHttpClient(
          {},
          vi.fn(async () => ({})),
          async () => [...SKILL_PATHS],
        ),
        provider,
      )

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      // Sending a message drives the server stream, which emits skills_loaded.
      submitCommand(container, 'build me an app')

      const card = await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="chat-skills-loaded"]')
        expect(
          el,
          'the "Loaded N skills" card must render from the skills_loaded event',
        ).not.toBeNull()
        return el as HTMLElement
      })
      expect(card.textContent).toContain('Loaded 3 skills')
      // Exactly one — never duplicated.
      expect(container.querySelectorAll('[data-mol-id="chat-skills-loaded"]')).toHaveLength(1)
    },
  )

  it(
    'does NOT announce the skills card client-side (it is server-driven now)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const patchSpy = vi.fn(async () => ({}))
      const container = await renderChatPanel(
        buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]),
      )

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      // Open /skills and wait for the LOCAL seed to finish (Default badges prove it ran)…
      submitCommand(container, '/skills')
      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull(),
      )
      // …yet the client never announces the card on its own (no server skills_loaded
      // event was emitted here), and it no longer PATCHes the per-project marker —
      // the server owns it.
      expect(container.querySelector('[data-mol-id="chat-skills-loaded"]')).toBeNull()
      expect(announcedMarkerPatched(patchSpy)).toBe(false)
    },
  )

  it(
    'clicking the "Loaded N skills" card (from a skills_loaded event) opens the /skills overlay',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const provider = buildChatProvider((onEvent) => {
        onEvent({
          type: 'card',
          id: 'card-skills-1',
          timestamp: 1000,
          card: { kind: 'skills', count: 3 },
        })
        onEvent({ type: 'done' })
      })
      const container = await renderChatPanel(
        buildHttpClient(
          {},
          vi.fn(async () => ({})),
          async () => [...SKILL_PATHS],
        ),
        provider,
      )

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      submitCommand(container, 'build me an app')
      const card = (await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="chat-skills-loaded"]')
        expect(el).not.toBeNull()
        return el as HTMLElement
      })) as HTMLButtonElement

      // Neither the skills browser nor its closeable overlay is open yet.
      expect(container.querySelector('[data-mol-id="skills-card"]')).toBeNull()
      expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()

      card.click()
      mounted?.tick()

      // Clicking opens the closeable overlay — the exact same path as typing /skills.
      // The SkillsCard mounts INSIDE the overlay, which carries a ✕ close button.
      await vi.waitFor(() => {
        expect(container.querySelector('[data-mol-id="skills-card"]')).not.toBeNull()
        expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).not.toBeNull()
      })
    },
  )

  it(
    'invoking /skills opens the closeable overlay and the ✕ closes it',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const patchSpy = vi.fn(async () => ({}))
      const container = await renderChatPanel(
        buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS]),
      )

      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )

      // Not an inline timeline card — the overlay shell (✕) is what opens.
      expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()

      submitCommand(container, '/skills')

      // The overlay opens with the SkillsCard mounted inside it + a ✕ close button.
      const close = (await vi.waitFor(() => {
        const el = container.querySelector('[data-mol-id="panel-overlay-close"]')
        expect(el, 'the /skills overlay must open with a ✕ close button').not.toBeNull()
        expect(container.querySelector('[data-mol-id="skills-card"]')).not.toBeNull()
        return el as HTMLElement
      })) as HTMLButtonElement

      // Clicking ✕ closes the overlay — both the shell and the card unmount.
      close.click()
      mounted?.tick()
      await vi.waitFor(() => {
        expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()
        expect(container.querySelector('[data-mol-id="skills-card"]')).toBeNull()
      })
    },
  )
})

describe('ChatPanel activity slot — always reserved, opacity-toggled (no jump, no gaps)', () => {
  const http = (): HttpClient =>
    buildHttpClient(
      {},
      vi.fn(async () => ({})),
      async () => [...SKILL_PATHS],
    )

  it(
    'keeps the activity slot in the layout but invisible when idle',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel(http())
      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      const slot = container.querySelector(
        '[data-mol-id="chat-activity-slot"]',
      ) as HTMLElement | null
      // Reserved in the layout (so showing/hiding the indicator never shifts the list height)…
      expect(slot).not.toBeNull()
      // …but invisible + inert while idle.
      expect(slot!.style.opacity).toBe('0')
      expect(slot!.getAttribute('aria-hidden')).toBe('true')
    },
  )

  it(
    'shows the SAME slot (opacity 1) while waiting for the sandbox to boot',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel(http(), buildChatProvider(), {
        awaitingSandboxBoot: true,
      })
      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      const slot = container.querySelector(
        '[data-mol-id="chat-activity-slot"]',
      ) as HTMLElement | null
      expect(slot).not.toBeNull()
      expect(slot!.style.opacity).toBe('1')
      expect(slot!.getAttribute('aria-hidden')).toBe('false')
      // The labeled wait copy renders inside the same reserved slot.
      expect(slot!.textContent).toContain('development environment')
    },
  )

  it(
    'shows streaming activity — never the sandbox-boot copy — during a REMOTE turn',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // A viewer (or second tab) watching a teammate's turn: no local send, so
      // isLoading is false and only remoteStreaming is true.
      let push: ((conversationId: string, event: ChatStreamEvent) => void) | null | undefined
      const container = await renderChatPanel(http(), buildChatProvider(), {
        endpoint: `/projects/${PROJECT_ID}/chat?conversationId=conv-1`,
        onRegisterPushHandler: (
          handler: ((conversationId: string, event: ChatStreamEvent) => void) | null,
        ) => {
          push = handler
        },
      })
      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
      )
      expect(push).toBeDefined()
      await vi.waitFor(() => {
        push!('conv-1', {
          type: 'message_start',
          id: 'remote-msg-1',
          timestamp: Date.now(),
        } as ChatStreamEvent)
        mounted?.tick()
        const slot = container.querySelector(
          '[data-mol-id="chat-activity-slot"]',
        ) as HTMLElement | null
        expect(slot).not.toBeNull()
        expect(slot!.style.opacity).toBe('1')
      })
      const slot = container.querySelector('[data-mol-id="chat-activity-slot"]') as HTMLElement
      expect(slot.textContent).not.toContain('development environment')
    },
  )
})
