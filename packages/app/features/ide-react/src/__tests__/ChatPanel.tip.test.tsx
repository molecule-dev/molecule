// @vitest-environment jsdom

/**
 * SYN12 — auto-tip entry-tip integration guard.
 *
 * The MVP intent audit (`docs/mvp-intent-findings.md`, SYN12) found the auto-tip
 * gating so conservative (≥4 messages + 60s idle + a 40% roll, never on a fresh
 * conversation) that new users — the target — realistically saw ZERO tips. The
 * fix surfaces one high-value onboarding tip the moment a fresh conversation
 * opens, so a brand-new user always learns how to drive the agent.
 *
 * This is a real jsdom render of the actual {@link ChatPanel} (not a grep or a
 * pure-function test — the API-only/pure-function anti-pattern is exactly how UI
 * gaps ship green). With an empty history and no conversation id, the panel is a
 * fresh conversation, so the entry tip card must appear without any idle wait. It
 * would fail if anyone reverted the entry-tip wiring or went back to idle-only
 * tips that leave a new conversation empty.
 *
 * @module
 */

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
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

import { TIP_IDLE_MS, TIP_MIN_MESSAGES } from '../components/chat-tips-utilities.js'
import { ChatPanel } from '../components/ChatPanel.js'
import type { ChatPanelProps } from '../types.js'

/** A chat provider whose history resolves empty → a fresh, deterministic mount. */
const sent: { message: string; sideChannel: boolean }[] = []
let holdNextSend = false
let finishHeldSend: (() => void) | undefined

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

/** An HTTP client whose every request rejects; the mounted callers catch their own. */
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

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear(): void {
      store.clear()
    },
    getItem(key: string): string | null {
      const value = store.get(key)
      return value === undefined ? null : value
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value))
    },
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

/** Renders {@link ChatPanel} inside the contexts it needs, on a fresh conversation. */
function renderFreshChatPanel(
  extraProps: Pick<
    ChatPanelProps,
    | 'canEdit'
    | 'canSendTeamMessages'
    | 'extraCommands'
    | 'initialMessage'
    | 'pendingMessage'
    | 'pendingMessageKey'
  > = {},
  history: ChatMessage[] = [],
): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider(history)}>
            {children}
          </ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(<ChatPanel projectId="proj-syn12" agentName="Synthase" {...extraProps} />)
}

beforeEach(() => {
  sent.length = 0
  holdNextSend = false
  finishHeldSend = undefined
  setClassMap(classMap)
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
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  finishHeldSend?.()
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ChatPanel auto-tips (SYN12 — entry tip on a fresh conversation)', () => {
  it('surfaces the onboarding entry tip immediately, with no idle wait', async () => {
    const { container } = render(renderFreshChatPanel())

    const tip = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-tip-card"]')
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
    expect(container.querySelector('[data-mol-id="chat-tip-dismiss"]')).not.toBeNull()
  })
})

describe('ChatPanel viewer tip (read-only member orientation)', () => {
  it('shows the GOLD viewer tip explaining /teamsay + the team-only icon for canEdit={false}', async () => {
    const { container } = render(renderFreshChatPanel({ canEdit: false }))

    const viewerTip = await waitFor(() => {
      const els = Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
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
    const { container } = render(renderFreshChatPanel({ canEdit: true }))

    // The entry tip still appears (fresh conversation) — but no viewer tip.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-tip-card"]')).not.toBeNull()
    })
    const els = Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
    expect(els.some((e) => /View-only access/.test(e.textContent ?? ''))).toBe(false)
  })
})

const TEAM_COMMAND = {
  id: 'teamsay',
  label: '/teamsay',
  description: 'Send a team note',
  category: 'collaborate' as const,
  aliases: ['t'],
  sideChannel: true,
  viewerSafe: true,
}

describe('ChatPanel team-message permission', () => {
  it('renders a public transcript without composer, team prefill or actionable onboarding and refuses programmatic sends', async () => {
    const { container, queryByRole } = render(
      renderFreshChatPanel({
        canEdit: false,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
      }),
    )
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
        true,
      ),
    )
    expect(queryByRole('textbox', { name: 'Write a message' })).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-empty-hint"]')).toBeNull()
    expect(container.textContent).not.toContain('View-only access')
    expect(container.textContent).not.toContain('/teamsay')
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    expect(textarea.value).toBe('')
    // Hidden controls are not reachable to a user. Calling their event directly
    // still cannot bypass the capability when another integration triggers it.
    fireEvent.change(textarea, { target: { value: '/t private team note' } })
    fireEvent.click(container.querySelector('[data-mol-id="chat-send-button"]')!)
    await act(async () => {
      await Promise.resolve()
    })
    expect(sent).toEqual([])
  })

  it('keeps the existing private viewer team composer and side-channel dispatch by default', async () => {
    const { container } = render(
      renderFreshChatPanel({ canEdit: false, extraCommands: [TEAM_COMMAND] }),
    )
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    await waitFor(() => expect(textarea.value).toBe('/teamsay '))
    expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
      false,
    )
    expect(container.textContent).toContain('View-only access')
    fireEvent.change(textarea, { target: { value: '/t hello team' } })
    fireEvent.click(container.querySelector('[data-mol-id="chat-send-button"]')!)
    await waitFor(() =>
      expect(sent).toContainEqual({ message: '/t hello team', sideChannel: true }),
    )
  })

  it('preserves assistant sending for editors while omitting disabled side-channel commands', async () => {
    const { container } = render(
      renderFreshChatPanel({
        canEdit: true,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
      }),
    )
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
      false,
    )
    fireEvent.change(textarea, { target: { value: '/t' } })
    expect(container.textContent).not.toContain('/teamsay')
    fireEvent.change(textarea, { target: { value: '/t Do not send this team note' } })
    fireEvent.click(container.querySelector('[data-mol-id="chat-send-button"]')!)
    await waitFor(() => expect(container.textContent).toContain('Team messaging is unavailable'))
    expect(sent).toEqual([])
    fireEvent.change(textarea, { target: { value: 'Summarize this cookbook' } })
    fireEvent.click(container.querySelector('[data-mol-id="chat-send-button"]')!)
    await waitFor(() =>
      expect(sent).toContainEqual({ message: 'Summarize this cookbook', sideChannel: false }),
    )
  })

  it.each(['/teamsay Keep this out of chat', '/t Keep this out of chat'])(
    'refuses disabled raw side-channel initial messages: %s',
    async (initialMessage) => {
      const { container } = render(
        renderFreshChatPanel({
          canEdit: true,
          canSendTeamMessages: false,
          extraCommands: [TEAM_COMMAND],
          initialMessage,
        }),
      )
      await waitFor(() => expect(container.textContent).toContain('Team messaging is unavailable'))
      expect(sent).toEqual([])
    },
  )

  it('refuses disabled side-channel programmatic pending messages', async () => {
    const props = {
      canEdit: true,
      canSendTeamMessages: false,
      extraCommands: [TEAM_COMMAND],
      pendingMessage: '/t Do not dispatch this',
      pendingMessageKey: 0,
    }
    const { container, rerender } = render(renderFreshChatPanel(props))
    rerender(renderFreshChatPanel({ ...props, pendingMessageKey: 1 }))
    await waitFor(() => expect(container.textContent).toContain('Team messaging is unavailable'))
    expect(sent).toEqual([])
  })

  it('rechecks the permission before dispatching an already-deferred programmatic team message', async () => {
    holdNextSend = true
    const props = {
      canEdit: true,
      canSendTeamMessages: true,
      extraCommands: [TEAM_COMMAND],
      pendingMessage: '/t deferred team note',
      pendingMessageKey: 0,
    }
    const { container, rerender } = render(renderFreshChatPanel(props))
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')!
    fireEvent.change(textarea, { target: { value: 'Summarize the cookbook' } })
    fireEvent.click(container.querySelector('[data-mol-id="chat-send-button"]')!)
    await waitFor(() => expect(sent).toHaveLength(1))
    rerender(renderFreshChatPanel({ ...props, pendingMessageKey: 1 }))
    rerender(renderFreshChatPanel({ ...props, pendingMessageKey: 1, canSendTeamMessages: false }))
    await act(async () => {
      finishHeldSend?.()
      await Promise.resolve()
    })
    await waitFor(() => expect(container.textContent).toContain('Team messaging is unavailable'))
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
    let container: HTMLElement | undefined
    await act(async () => {
      container = render(
        renderFreshChatPanel({ canEdit: false, canSendTeamMessages: false }, history),
      ).container
      await vi.advanceTimersByTimeAsync(10)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TIP_IDLE_MS + 1000)
    })
    expect(container?.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    expect(container?.textContent).toContain('Published message')
  })
})
