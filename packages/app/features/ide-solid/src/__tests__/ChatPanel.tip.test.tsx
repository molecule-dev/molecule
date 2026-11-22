// @vitest-environment jsdom

/**
 * SYN12 — auto-tip entry-tip integration guard, plus the team-message
 * permission boundary.
 *
 * The MVP intent audit (SYN12) found the auto-tip gating so conservative that
 * new users realistically saw ZERO tips. The fix surfaces one high-value
 * onboarding tip the moment a fresh conversation opens, so a brand-new user
 * always learns how to drive the agent; a read-only member additionally gets
 * the GOLD viewer tip explaining `/teamsay` and the team-only badge.
 *
 * A real jsdom render of the actual {@link ChatPanel}: an empty history and no
 * conversation id is a fresh conversation, so the entry tip card must appear
 * without any idle wait. A public transcript (read-only AND no team messaging)
 * carries no composer, no prefill and no tips, and refuses every programmatic
 * send.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ChatPanel.tip.test.tsx` with
 * the same test names and the same behavioral assertions, including the
 * `it.each` case over raw side-channel initial messages (the panel's
 * `initialMessage` prop refuses a disabled team command at the send boundary,
 * exactly as the composer does).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { CommandDef } from '@molecule/app-ide-panel-logic'
import { TIP_IDLE_MS, TIP_MIN_MESSAGES } from '@molecule/app-ide-panel-logic/panels'
import {
  ChatContext,
  HttpContext,
  resetAIModelsCache,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** A chat side-channel send, as the stub provider observed it. */
interface SentRecord {
  /** The raw message text. */
  message: string
  /** Whether it went out on the team side channel. */
  sideChannel: boolean
}

const sent: SentRecord[] = []
let holdNextSend = false
let finishHeldSend: (() => void) | undefined

/**
 * A chat provider whose history resolves empty → a fresh, deterministic mount.
 *
 * @param history - Messages `loadHistory` should resolve with.
 * @returns A stub chat provider.
 */
function buildChatProvider(history: ChatMessage[] = []): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (message, _config, onEvent): Promise<void> => {
      sent.push({ message, sideChannel: false })
      if (holdNextSend) {
        holdNextSend = false
        await new Promise<void>((resolve) => {
          finishHeldSend = () => {
            finishHeldSend = undefined
            onEvent({ type: 'done' })
            resolve()
          }
        })
      } else onEvent({ type: 'done' })
    },
    sendSideMessage: async (message, _config, onEvent): Promise<void> => {
      sent.push({ message, sideChannel: true })
      onEvent({ type: 'done' })
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/**
 * An HTTP client whose every request rejects; the mounted callers catch their own.
 *
 * @returns A stub HTTP client.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: reject,
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
 * A working in-memory Storage (Node's experimental web-storage shadows jsdom's).
 *
 * @returns A fresh, empty storage.
 */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
}

/** The panel props the suite varies, as the signals that drive them. */
interface PanelProps {
  /** The viewer's edit capability (`undefined` = editor). */
  canEdit?: boolean
  /** Whether team messages are allowed (undefined = the panel's true default). */
  canSendTeamMessages?: boolean
  /** Host-provided slash commands. */
  extraCommands?: readonly CommandDef[]
  /** A raw opener auto-sent on mount when no conversation exists. */
  initialMessage?: string
  /** A platform-composed pending message. */
  pendingMessage?: string
  /** The key that dispatches it. */
  pendingMessageKey?: number
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

/** A mounted panel plus the setters that stand in for React's `rerender`. */
interface MountedPanel {
  /** The element the panel mounted into. */
  container: HTMLElement
  /** Replaces the panel props, as React's `rerender` does. */
  setProps: (next: Partial<PanelProps>) => void
}

/**
 * Renders {@link ChatPanel} inside the contexts it needs, on a fresh
 * conversation, over signals for the props the suite changes.
 *
 * @param initial - The starting props.
 * @param history - The conversation the stub provider returns.
 * @returns The container and the props setter.
 */
function renderFreshChatPanel(
  initial: Partial<PanelProps> = {},
  history: ChatMessage[] = [],
): MountedPanel {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const props = {
    canEdit: createSignal(initial.canEdit),
    canSendTeamMessages: createSignal(initial.canSendTeamMessages),
    extraCommands: createSignal(initial.extraCommands),
    initialMessage: createSignal(initial.initialMessage),
    pendingMessage: createSignal(initial.pendingMessage),
    pendingMessageKey: createSignal(initial.pendingMessageKey),
  }
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(history)}>
            <ChatPanel
              projectId="proj-syn12"
              agentName="Synthase"
              canEdit={props.canEdit[0]()}
              canSendTeamMessages={props.canSendTeamMessages[0]()}
              extraCommands={props.extraCommands[0]()}
              initialMessage={props.initialMessage[0]()}
              pendingMessage={props.pendingMessage[0]()}
              pendingMessageKey={props.pendingMessageKey[0]()}
            />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  const setProps = (next: Partial<PanelProps>): void => {
    if ('canEdit' in next) props.canEdit[1](next.canEdit)
    if ('canSendTeamMessages' in next) props.canSendTeamMessages[1](next.canSendTeamMessages)
    if ('extraCommands' in next) props.extraCommands[1](next.extraCommands)
    if ('initialMessage' in next) props.initialMessage[1](next.initialMessage)
    if ('pendingMessage' in next) props.pendingMessage[1](next.pendingMessage)
    if ('pendingMessageKey' in next) props.pendingMessageKey[1](next.pendingMessageKey)
  }
  return { container, setProps }
}

/**
 * The visible textbox with this accessible name, or null when it is not in the
 * accessibility tree (React's `queryByRole('textbox', …)`; a `hidden` subtree is
 * excluded). Solid's package carries no testing-library, so the role query is
 * expressed over the same DOM rule.
 *
 * @param container - The mounted container.
 * @param name - The accessible name.
 * @returns The visible textbox, or null.
 */
function queryVisibleTextboxByName(container: HTMLElement, name: string): HTMLElement | null {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>('textarea, input, [role="textbox"]'),
  )
  return (
    candidates.find(
      (element) => element.getAttribute('aria-label') === name && !element.closest('[hidden]'),
    ) ?? null
  )
}

const TEAM_COMMAND: CommandDef = {
  id: 'teamsay',
  label: '/teamsay',
  description: 'Send a team note',
  category: 'collaborate',
  aliases: ['t'],
  sideChannel: true,
  viewerSafe: true,
}

/**
 * Types into the composer the way a person does (Solid's delegated `input`).
 *
 * @param textarea - The composer's textarea.
 * @param value - The text to type.
 */
function typeInto(textarea: HTMLTextAreaElement, value: string): void {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  sent.length = 0
  holdNextSend = false
  finishHeldSend = undefined
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
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
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  finishHeldSend?.()
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  resetAIModelsCache()
  vi.useRealTimers()
  vi.restoreAllMocks()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel auto-tips (SYN12 — entry tip on a fresh conversation)', () => {
  it('surfaces the onboarding entry tip immediately, with no idle wait', async () => {
    const panel = renderFreshChatPanel()

    const tip = await vi.waitFor(() => {
      const el = panel.container.querySelector('[data-mol-id="chat-tip-card"]')
      expect(el, 'a fresh conversation must show the onboarding entry tip').not.toBeNull()
      return el as HTMLElement
    })

    // It is the high-value getStarted hint, personalised with the agent name and
    // pointing at the two interactions that unlock everything else (/ and @).
    const text = tip.textContent ?? ''
    expect(text).toContain('type /')
    expect(text).toContain('Synthase')
    expect(text).toContain('to work from')
    // The interpolation token is resolved, never shown raw.
    expect(text).not.toContain('{{agentName}}')

    // A dismiss affordance is present so the tip is non-interrupting.
    expect(panel.container.querySelector('[data-mol-id="chat-tip-dismiss"]')).not.toBeNull()
  })
})

describe('ChatPanel viewer tip (read-only member orientation)', () => {
  it('shows the GOLD viewer tip explaining /teamsay + the team-only icon for canEdit={false}', async () => {
    const panel = renderFreshChatPanel({ canEdit: false })

    const viewerTip = await vi.waitFor(() => {
      const els = Array.from(panel.container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
      const el = els.find((e) => /View-only access/.test(e.textContent ?? ''))
      expect(el, 'a read-only viewer must see the orientation tip').toBeTruthy()
      return el as HTMLElement
    })

    const text = viewerTip.textContent ?? ''
    // Explains the side channel AND the icon the team notes carry.
    expect(text).toContain('/teamsay')
    expect(text).toContain('gold icon')
    // The interpolation token is resolved, never shown raw.
    expect(text).toContain('Synthase ignores')
    expect(text).not.toContain('{{agentName}}')
    // Gold accent — the SAME colour as the team-only message treatment (#e0a100;
    // jsdom normalizes hex to rgb), not the neutral primary tint of other tips.
    expect(viewerTip.getAttribute('style') ?? '').toMatch(/#e0a100|rgb\(224,\s*161,\s*0\)/)
    // Dismissable like every other tip.
    expect(viewerTip.querySelector('[data-mol-id="chat-tip-dismiss"]')).not.toBeNull()
  })

  it('never shows the viewer tip when the member can edit', async () => {
    const panel = renderFreshChatPanel({ canEdit: true })

    // The entry tip still appears (fresh conversation) — but no viewer tip.
    await vi.waitFor(() => {
      expect(panel.container.querySelector('[data-mol-id="chat-tip-card"]')).not.toBeNull()
    })
    const els = Array.from(panel.container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
    expect(els.some((e) => /View-only access/.test(e.textContent ?? ''))).toBe(false)
  })
})

describe('ChatPanel team-message permission', () => {
  it('renders a public transcript without composer, team prefill or actionable onboarding and refuses programmatic sends', async () => {
    const panel = renderFreshChatPanel({
      canEdit: false,
      canSendTeamMessages: false,
      extraCommands: [TEAM_COMMAND],
    })
    await vi.waitFor(() =>
      expect(
        panel.container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden'),
      ).toBe(true),
    )
    expect(queryVisibleTextboxByName(panel.container, 'Write a message')).toBeNull()
    expect(panel.container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    expect(panel.container.querySelector('[data-mol-id="chat-empty-hint"]')).toBeNull()
    expect(panel.container.textContent).not.toContain('View-only access')
    expect(panel.container.textContent).not.toContain('/teamsay')
    const textarea = panel.container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    expect(textarea.value).toBe('')
    // Hidden controls are not reachable to a user. Calling their event directly
    // still cannot bypass the capability when another integration triggers it.
    typeInto(textarea, '/t private team note')
    panel.container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')!.click()
    await Promise.resolve()
    expect(sent).toEqual([])
  })

  it('keeps the existing private viewer team composer and side-channel dispatch by default', async () => {
    const panel = renderFreshChatPanel({ canEdit: false, extraCommands: [TEAM_COMMAND] })
    const textarea = panel.container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    await vi.waitFor(() => expect(textarea.value).toBe('/teamsay '))
    expect(
      panel.container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden'),
    ).toBe(false)
    expect(panel.container.textContent).toContain('View-only access')
    typeInto(textarea, '/t hello team')
    panel.container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')!.click()
    await vi.waitFor(() =>
      expect(sent).toContainEqual({ message: '/t hello team', sideChannel: true }),
    )
  })

  it('preserves assistant sending for editors while omitting disabled side-channel commands', async () => {
    const panel = renderFreshChatPanel({
      canEdit: true,
      canSendTeamMessages: false,
      extraCommands: [TEAM_COMMAND],
    })
    const textarea = panel.container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    expect(
      panel.container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden'),
    ).toBe(false)
    typeInto(textarea, '/t')
    expect(panel.container.textContent).not.toContain('/teamsay')
    typeInto(textarea, '/t Do not send this team note')
    panel.container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')!.click()
    await vi.waitFor(() =>
      expect(panel.container.textContent).toContain('Team messaging is unavailable'),
    )
    expect(sent).toEqual([])
    typeInto(textarea, 'Summarize this cookbook')
    panel.container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')!.click()
    await vi.waitFor(() =>
      expect(sent).toContainEqual({ message: 'Summarize this cookbook', sideChannel: false }),
    )
  })

  it.each(['/teamsay Keep this out of chat', '/t Keep this out of chat'])(
    'refuses disabled raw side-channel initial messages: %s',
    async (initialMessage) => {
      const panel = renderFreshChatPanel({
        canEdit: true,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
        initialMessage,
      })
      await vi.waitFor(() =>
        expect(panel.container.textContent).toContain('Team messaging is unavailable'),
      )
      expect(sent).toEqual([])
    },
  )

  it('refuses disabled side-channel programmatic pending messages', async () => {
    const panel = renderFreshChatPanel({
      canEdit: true,
      canSendTeamMessages: false,
      extraCommands: [TEAM_COMMAND],
      pendingMessage: '/t Do not dispatch this',
      pendingMessageKey: 0,
    })
    panel.setProps({ pendingMessageKey: 1 })
    await vi.waitFor(() =>
      expect(panel.container.textContent).toContain('Team messaging is unavailable'),
    )
    expect(sent).toEqual([])
  })

  it('rechecks the permission before dispatching an already-deferred programmatic team message', async () => {
    holdNextSend = true
    const panel = renderFreshChatPanel({
      canEdit: true,
      canSendTeamMessages: true,
      extraCommands: [TEAM_COMMAND],
      pendingMessage: '/t deferred team note',
      pendingMessageKey: 0,
    })
    const textarea = panel.container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    typeInto(textarea, 'Summarize the cookbook')
    panel.container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')!.click()
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    panel.setProps({ pendingMessageKey: 1 })
    panel.setProps({ pendingMessageKey: 1, canSendTeamMessages: false })
    finishHeldSend?.()
    await vi.waitFor(() =>
      expect(panel.container.textContent).toContain('Team messaging is unavailable'),
    )
    expect(sent).toEqual([{ message: 'Summarize the cookbook', sideChannel: false }])
  })

  it('never schedules actionable idle tips for a read-only public conversation', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const history: ChatMessage[] = Array.from({ length: TIP_MIN_MESSAGES }, (_, i) => ({
      id: `public-${i}`,
      role: i % 2 ? 'assistant' : 'user',
      content: `Published message ${i}`,
      timestamp: i + 1,
    }))
    const panel = renderFreshChatPanel({ canEdit: false, canSendTeamMessages: false }, history)
    // Flush the history load and any microtasks, then run past the idle window.
    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(TIP_IDLE_MS + 1000)
    expect(panel.container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    expect(panel.container.textContent).toContain('Published message')
  })
})
