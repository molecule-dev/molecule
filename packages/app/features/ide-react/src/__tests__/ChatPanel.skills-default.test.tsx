// @vitest-environment jsdom

/**
 * P3-11 — the `/skills` default-loaded set's toggle math + reset are REAL,
 * end-to-end, through the actual {@link ChatPanel}.
 *
 * BACKGROUND: when `settings.defaultSkills` is unset, ALL discovered skills are
 * default (their bodies injected by the backend). `defaultSkillPaths` is seeded
 * to every loaded skill only AFTER `loadProjectSkills` resolves. Two bugs lived
 * in `toggleDefaultSkill`:
 *
 *  1. **The toggle race** — a star click BEFORE the load resolved read the empty
 *     initial set as the base and persisted a bogus 1-element explicit array
 *     (`defaultSkills: ["…one…"]`) + locked the explicit flag, a one-way door out
 *     of unset→all. The fix ignores clicks until skills exist AND, while implicit,
 *     computes the base from EVERY loaded skill — so toggling one OFF persists
 *     "all-minus-one", never "[just-this-one]".
 *  2. **The one-way door** — there was no UI back to unset→all. The fix adds a
 *     reset that PATCHes `defaultSkills: null`.
 *
 * This renders the real panel, opens the `/skills` browser, and proves:
 *  - toggling one default OFF from the implicit all-default state PATCHes the
 *    OTHER skills (all-minus-one), not a bogus singleton;
 *  - a click while the panel's skills are still loading persists NOTHING (the
 *    race guard) — the assertion that distinguishes the fix from the old bug;
 *  - the "Load all by default" reset PATCHes `defaultSkills: null`.
 *
 * @module
 */

import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  ChatProvider as ChatContextProvider,
  HttpProvider,
  I18nProvider,
  resetChatStoresForTests,
  ThemeProvider,
} from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'

const PROJECT_ID = 'proj-skills'

const SKILL_PATHS = [
  '.agents/skills/auth/SKILL.md',
  '.agents/skills/caching/SKILL.md',
  '.agents/skills/deploy/SKILL.md',
] as const

/** Frontmatter content for one skill so `parseSkillMeta` yields its name. */
function skillContent(name: string): string {
  return ['---', `name: ${name}`, `description: The ${name} skill.`, '---', '', `# ${name}`].join(
    '\n',
  )
}

/** Maps a `/files/<rel>` URL to its skill name (the dir under .agents/skills/). */
function nameForFilesUrl(url: string): string {
  const match = url.match(/\.agents\/skills\/([^/]+)\/SKILL\.md$/)
  return match ? match[1] : 'unknown'
}

/**
 * A chat provider whose history resolves empty, so the panel mounts with no network.
 * `emit` (optional) lets a test drive server stream events (e.g. a `skills_loaded` custom
 * event) through the live send path: it's invoked with the onEvent callback when a message
 * is sent.
 *
 * @param emit - Optional: emit stream events on send (receives the onEvent callback).
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

/** A typed HTTP success envelope. */
function ok(data: unknown): unknown {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} }
}

/**
 * An {@link HttpClient} stub serving the project settings + a fixed skill list.
 * `filesList` is invoked for each `…/files-list` GET so a test can defer one
 * caller's resolution (the race), or resolve immediately (the happy path).
 *
 * @param settings - The settings the project GET resolves.
 * @param patchSpy - The PATCH spy.
 * @param filesList - Returns the file list for a `…/files-list` GET (sync or a
 *   pending promise the test resolves later).
 * @returns The stub client.
 */
function buildHttpClient(
  settings: Record<string, unknown>,
  patchSpy: (url: string, data?: unknown) => Promise<unknown>,
  filesList: () => Promise<string[]>,
): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = async (url: string): Promise<unknown> => {
    if (url === `/projects/${PROJECT_ID}`) return ok({ settings })
    if (url.endsWith('/files-list')) return ok({ files: await filesList() })
    if (url.includes('/files/')) return ok({ content: skillContent(nameForFilesUrl(url)) })
    return reject()
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: get as HttpClient['get'],
    post: reject,
    put: reject,
    patch: patchSpy as unknown as HttpClient['patch'],
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** An in-memory {@link Storage} (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => store.delete(key) as unknown as void,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  }
}

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

/**
 * Renders {@link ChatPanel} inside every context it needs.
 *
 * @param http - The HTTP client stub.
 * @returns The wrapped element.
 */
function renderChatPanel(
  http: HttpClient,
  provider: ChatProvider = buildChatProvider(),
  extraProps: Partial<ComponentProps<typeof ChatPanel>> = {},
): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={http}>
          <ChatContextProvider provider={provider}>
            <ChatPanel projectId={PROJECT_ID} {...extraProps} />
          </ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}

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
  document.body.innerHTML = ''
})

/**
 * Submits a slash command through the real composer (the space closes the
 * command menu, so Enter submits the raw text rather than picking a menu item).
 *
 * @param container - The rendered ChatPanel container.
 * @param text - The exact command text to type and submit.
 */
function submitCommand(container: HTMLElement, text: string): void {
  const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement | null
  if (!input) throw new Error('composer input not found')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

/** Pulls the `defaultSkills` value from the last PATCH that carried one. */
function lastDefaultSkillsPatch(
  patchSpy: ReturnType<typeof vi.fn>,
): unknown[] | null | undefined | 'none' {
  for (let i = patchSpy.mock.calls.length - 1; i >= 0; i--) {
    const body = patchSpy.mock.calls[i][1] as { settings?: Record<string, unknown> } | undefined
    if (body?.settings && 'defaultSkills' in body.settings) {
      return body.settings.defaultSkills as unknown[] | null
    }
  }
  return 'none'
}

/**
 * A `filesList` that returns EMPTY on its first invocation and the full skill set
 * thereafter — models the sandbox file API not serving `.agents` yet at mount
 * (the real cause of hollow stars the hardened seed must retry through).
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
    return body?.settings?.skillsLoadedAnnounced === true
  })
}

describe('ChatPanel /skills default set — toggle math + reset (P3-11)', () => {
  it('toggling one default OFF from the implicit all-default state PATCHes all-minus-one (not a bogus singleton)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS])),
    )

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    submitCommand(container, '/skills')

    // The seeded all-default state: every skill shows a "Default" badge with no click.
    const authToggle = (await waitFor(() => {
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
    fireEvent.click(authToggle)

    await waitFor(() => {
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
  })

  it('reset ("Load all by default") appears once explicit and PATCHes defaultSkills: null', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS])),
    )

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    submitCommand(container, '/skills')

    const authToggle = (await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-default-auth"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    // While implicit all-default, there's nothing to reset → no control yet.
    expect(container.querySelector('[data-mol-id="skill-reset-defaults"]')).toBeNull()

    // Make the set explicit by toggling one off → the reset control appears.
    fireEvent.click(authToggle)
    const reset = (await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-reset-defaults"]')
      expect(el, 'the reset control must appear once the set is explicit').not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement
    expect(reset.textContent).toContain('Load all by default')

    fireEvent.click(reset)
    await waitFor(() => {
      // Resetting persists null so the backend treats it as unset → all again.
      expect(lastDefaultSkillsPatch(patchSpy)).toBeNull()
    })
  })

  it('a star click BEFORE the panel finishes loading skills persists NOTHING (the race guard)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    // Defer each `…/files-list` GET so the test controls resolution order. The
    // panel's own skills load fires first (deferred[0]); the /skills card's load
    // fires second (deferred[1]).
    const deferred: Array<(files: string[]) => void> = []
    const filesList = (): Promise<string[]> =>
      new Promise<string[]>((resolve) => deferred.push(resolve))

    const { container } = render(renderChatPanel(buildHttpClient({}, patchSpy, filesList)))

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    submitCommand(container, '/skills')

    // Resolve ONLY the /skills card's list (the 2nd caller), leaving the panel's
    // own load (the 1st caller) pending → the panel's projectSkills stays empty.
    await waitFor(() => expect(deferred.length).toBeGreaterThanOrEqual(2))
    deferred[1]([...SKILL_PATHS])

    // The card renders its rows (its own load resolved), but the panel hasn't
    // seeded its default set yet, so NO "Default" badge shows.
    const authToggle = (await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-default-auth"]')
      expect(el, 'the card row must render from its own load').not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement
    expect(
      container.querySelector('[data-mol-id="skill-default-badge-auth"]'),
      'the panel has not seeded defaults yet, so no Default badge',
    ).toBeNull()

    // Click while the panel is still loading — the guard must drop it (old bug:
    // this persisted a bogus [".../auth/SKILL.md"] singleton + locked explicit).
    fireEvent.click(authToggle)
    await Promise.resolve()
    expect(lastDefaultSkillsPatch(patchSpy)).toBe('none')

    // Now let the panel's own load resolve → it seeds all-default; the same click
    // now persists the correct all-minus-one set.
    deferred[0]([...SKILL_PATHS])
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull(),
    )
    fireEvent.click(authToggle)
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
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({}, patchSpy, emptyThenPopulated())),
    )

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    submitCommand(container, '/skills')

    // The /skills card renders its rows from its OWN (2nd, populated) load, but the
    // panel's first seed load came back EMPTY — so no Default badge has seeded yet.
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-default-auth"]')).not.toBeNull(),
    )
    expect(
      container.querySelector('[data-mol-id="skill-default-badge-auth"]'),
      'the empty first load must NOT have latched/seeded defaults yet',
    ).toBeNull()

    // The hardened seed retries (~1.5s): the retry's non-empty load finally seeds the
    // full default set, so every star fills — proving the guard was NOT latched on the
    // empty first load (the old bug latched immediately → defaults stayed empty forever).
    await waitFor(
      () => {
        expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull()
        expect(container.querySelector('[data-mol-id="skill-default-badge-deploy"]')).not.toBeNull()
      },
      { timeout: 4000 },
    )
  })

  it('renders the "Loaded N skills" card from a server card event (kind:skills)', async () => {
    // The card is SERVER-driven now (recorded into the ONE transcript via recordCard): the
    // server emits a `card` event carrying { kind:'skills', count } with a monotonic id +
    // timestamp; useChat appends it as a card-message and the timeline renders it from
    // `cardEvent`. It is no longer announced from the client-side skill load.
    const provider = buildChatProvider((onEvent) => {
      onEvent({
        type: 'card',
        id: 'card-skills-1',
        timestamp: 1000,
        card: { kind: 'skills', count: 3 },
      })
      onEvent({ type: 'done' })
    })
    const { container } = render(
      renderChatPanel(
        buildHttpClient(
          {},
          vi.fn(async () => ({})),
          async () => [...SKILL_PATHS],
        ),
        provider,
      ),
    )

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    // Sending a message drives the server stream, which emits skills_loaded.
    submitCommand(container, 'build me an app')

    const card = await waitFor(() => {
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
  })

  it('does NOT announce the skills card client-side (it is server-driven now)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS])),
    )

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    // Open /skills and wait for the LOCAL seed to finish (Default badges prove it ran)…
    submitCommand(container, '/skills')
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull(),
    )
    // …yet the client never announces the card on its own (no server skills_loaded event was
    // emitted here), and it no longer PATCHes the per-project marker — the server owns it.
    expect(container.querySelector('[data-mol-id="chat-skills-loaded"]')).toBeNull()
    expect(announcedMarkerPatched(patchSpy)).toBe(false)
  })

  it('clicking the "Loaded N skills" card (from a skills_loaded event) opens the /skills overlay', async () => {
    const provider = buildChatProvider((onEvent) => {
      onEvent({
        type: 'card',
        id: 'card-skills-1',
        timestamp: 1000,
        card: { kind: 'skills', count: 3 },
      })
      onEvent({ type: 'done' })
    })
    const { container } = render(
      renderChatPanel(
        buildHttpClient(
          {},
          vi.fn(async () => ({})),
          async () => [...SKILL_PATHS],
        ),
        provider,
      ),
    )

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    submitCommand(container, 'build me an app')
    const card = (await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-skills-loaded"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    // Neither the skills browser nor its closeable overlay is open yet.
    expect(container.querySelector('[data-mol-id="skills-card"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()

    fireEvent.click(card)

    // Clicking opens the closeable overlay — the exact same path as typing /skills.
    // The SkillsCard mounts INSIDE the overlay, which carries a ✕ close button.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="skills-card"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).not.toBeNull()
    })
  })

  it('invoking /skills opens the closeable overlay and the ✕ closes it', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({}, patchSpy, async () => [...SKILL_PATHS])),
    )

    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())

    // Not an inline timeline card — the overlay shell (✕) is what opens.
    expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()

    submitCommand(container, '/skills')

    // The overlay opens with the SkillsCard mounted inside it + a ✕ close button.
    const close = (await waitFor(() => {
      const el = container.querySelector('[data-mol-id="panel-overlay-close"]')
      expect(el, 'the /skills overlay must open with a ✕ close button').not.toBeNull()
      expect(container.querySelector('[data-mol-id="skills-card"]')).not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    // Clicking ✕ closes the overlay — both the shell and the card unmount.
    fireEvent.click(close)
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="panel-overlay-close"]')).toBeNull()
      expect(container.querySelector('[data-mol-id="skills-card"]')).toBeNull()
    })
  })
})

describe('ChatPanel activity slot — always reserved, opacity-toggled (no jump, no gaps)', () => {
  const http = (): HttpClient =>
    buildHttpClient(
      {},
      vi.fn(async () => ({})),
      async () => [...SKILL_PATHS],
    )

  it('keeps the activity slot in the layout but invisible when idle', async () => {
    const { container } = render(renderChatPanel(http()))
    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    const slot = container.querySelector('[data-mol-id="chat-activity-slot"]') as HTMLElement | null
    // Reserved in the layout (so showing/hiding the indicator never shifts the list height)…
    expect(slot).not.toBeNull()
    // …but invisible + inert while idle.
    expect(slot!.style.opacity).toBe('0')
    expect(slot!.getAttribute('aria-hidden')).toBe('true')
  })

  it('shows the SAME slot (opacity 1) while waiting for the sandbox to boot', async () => {
    const { container } = render(
      renderChatPanel(http(), buildChatProvider(), { awaitingSandboxBoot: true }),
    )
    await waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
    const slot = container.querySelector('[data-mol-id="chat-activity-slot"]') as HTMLElement | null
    expect(slot).not.toBeNull()
    expect(slot!.style.opacity).toBe('1')
    expect(slot!.getAttribute('aria-hidden')).toBe('false')
    // The labeled wait copy renders inside the same reserved slot.
    expect(slot!.textContent).toContain('development environment')
  })
})
