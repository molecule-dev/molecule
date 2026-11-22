// @vitest-environment jsdom

/**
 * SYN12 — auto-tip entry-tip integration guard, a port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.tip.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through the shared
 * chat-panel harness (which sets the chat/HTTP/theme context the way React's
 * providers do and re-renders with new props the way `rerender` does).
 *
 * A real jsdom render of the actual `ChatPanel` (not a grep or a pure-function
 * test — the API-only/pure-function anti-pattern is exactly how UI gaps ship
 * green). With an empty history and no conversation id, the panel is a fresh
 * conversation, so the entry tip card must appear without any idle wait. It
 * would fail if anyone reverted the entry-tip wiring or went back to idle-only
 * tips that leave a new conversation empty.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { CommandDef } from '@molecule/app-ide-panel-logic'
import { TIP_IDLE_MS, TIP_MIN_MESSAGES } from '@molecule/app-ide-panel-logic/panels'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatPanelProps } from '../types.js'
import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

/** Every message the stub provider was asked to send, and on which channel. */
const sent: { message: string; sideChannel: boolean }[] = []
let holdNextSend = false
let finishHeldSend: (() => void) | undefined

/**
 * A chat provider with both send paths, so the panel's side-channel dispatch is
 * observable; `holdNextSend` keeps one turn streaming so a pending message is
 * deferred.
 *
 * @param history - The transcript `loadHistory` replays.
 * @returns The stub provider.
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
    loadHistory: async (): Promise<ChatMessage[]> => history,
  }
}

/** The team-note command a host supplies (the React fixture, verbatim). */
const TEAM_COMMAND: CommandDef = {
  id: 'teamsay',
  label: '/teamsay',
  description: 'Send a team note',
  category: 'collaborate',
  aliases: ['t'],
  sideChannel: true,
  viewerSafe: true,
}

/** The props a fresh-conversation test may vary. */
type FreshProps = Pick<
  ChatPanelProps,
  | 'canEdit'
  | 'canSendTeamMessages'
  | 'extraCommands'
  | 'initialMessage'
  | 'pendingMessage'
  | 'pendingMessageKey'
>

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the real panel on a fresh conversation.
 *
 * @param props - The panel props the test varies.
 * @param history - The transcript the stub provider replays.
 * @returns The mount (its container and prop setter).
 */
function renderFreshChatPanel(props: FreshProps = {}, history: ChatMessage[] = []): PanelMount {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(history),
    projectId: 'proj-syn12',
    props: { agentName: 'Synthase', ...props },
  })
  return mounted
}

/**
 * The accessible name a textbox would expose from its attributes (the Svelte
 * stand-in for React's `getByRole('textbox', { name })`).
 *
 * @param el - The candidate element.
 * @returns Its name, or ''.
 */
function textboxName(el: Element): string {
  // `getByRole` ignores anything in a hidden subtree, and that is the whole
  // point of the public-transcript assertion: the composer stays in the DOM
  // (React renders it `hidden`, the panel's test asserts that explicitly) but
  // is not a reachable textbox. A raw attribute read would count it.
  if (el.closest('[hidden]') || el.closest('[aria-hidden="true"]')) return ''
  return el.getAttribute('aria-label') ?? el.getAttribute('title') ?? ''
}

/**
 * Whether the tree holds a textbox with the given accessible name.
 *
 * @param container - The mount container.
 * @param name - The accessible name to look for.
 * @returns True when one exists.
 */
function hasNamedTextbox(container: HTMLElement, name: string): boolean {
  return Array.from(container.querySelectorAll('textarea, [role="textbox"]')).some(
    (el) => textboxName(el) === name,
  )
}

/**
 * Types a value into the composer (React's `fireEvent.change`).
 *
 * @param textarea - The composer input.
 * @param value - The text to type.
 */
function typeInto(textarea: HTMLTextAreaElement, value: string): void {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  // React's `fireEvent.change` renders before the next click; flush so the
  // send button is enabled by the state the keystroke just committed.
  flushSync()
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
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  vi.useRealTimers()
  vi.restoreAllMocks()
  setProvider(createSimpleI18nProvider('en'))
})

describe('ChatPanel auto-tips (SYN12 — entry tip on a fresh conversation)', () => {
  it('surfaces the onboarding entry tip immediately, with no idle wait', async () => {
    const { container } = renderFreshChatPanel()

    const tip = await vi.waitFor(() => {
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
    const { container } = renderFreshChatPanel({ canEdit: false })

    const viewerTip = await vi.waitFor(() => {
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
    const { container } = renderFreshChatPanel({ canEdit: true })

    // The entry tip still appears (fresh conversation) — but no viewer tip.
    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-tip-card"]')).not.toBeNull()
    })
    const els = Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
    expect(els.some((e) => /View-only access/.test(e.textContent ?? ''))).toBe(false)
  })
})

describe('ChatPanel team-message permission', () => {
  it('renders a public transcript without composer, team prefill or actionable onboarding and refuses programmatic sends', async () => {
    const { container } = renderFreshChatPanel({
      canEdit: false,
      canSendTeamMessages: false,
      extraCommands: [TEAM_COMMAND],
    })
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
        true,
      ),
    )
    expect(hasNamedTextbox(container, 'Write a message')).toBe(false)
    expect(container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-empty-hint"]')).toBeNull()
    expect(container.textContent).not.toContain('View-only access')
    expect(container.textContent).not.toContain('/teamsay')
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
    if (!textarea) throw new Error('composer input not found')
    expect(textarea.value).toBe('')
    // Hidden controls are not reachable to a user. Calling their event directly
    // still cannot bypass the capability when another integration triggers it.
    typeInto(textarea, '/t private team note')
    container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')?.click()
    await Promise.resolve()
    expect(sent).toEqual([])
  })

  it('keeps the existing private viewer team composer and side-channel dispatch by default', async () => {
    const { container } = renderFreshChatPanel({ canEdit: false, extraCommands: [TEAM_COMMAND] })
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
    if (!textarea) throw new Error('composer input not found')
    await vi.waitFor(() => expect(textarea.value).toBe('/teamsay '))
    expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
      false,
    )
    expect(container.textContent).toContain('View-only access')
    typeInto(textarea, '/t hello team')
    container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')?.click()
    await vi.waitFor(() =>
      expect(sent).toContainEqual({ message: '/t hello team', sideChannel: true }),
    )
  })

  it('preserves assistant sending for editors while omitting disabled side-channel commands', async () => {
    const { container } = renderFreshChatPanel({
      canEdit: true,
      canSendTeamMessages: false,
      extraCommands: [TEAM_COMMAND],
    })
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
    if (!textarea) throw new Error('composer input not found')
    expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
      false,
    )
    typeInto(textarea, '/t')
    expect(container.textContent).not.toContain('/teamsay')
    typeInto(textarea, '/t Do not send this team note')
    container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')?.click()
    await vi.waitFor(() => expect(container.textContent).toContain('Team messaging is unavailable'))
    expect(sent).toEqual([])
    typeInto(textarea, 'Summarize this cookbook')
    container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')?.click()
    await vi.waitFor(() =>
      expect(sent).toContainEqual({ message: 'Summarize this cookbook', sideChannel: false }),
    )
  })

  it.each(['/teamsay Keep this out of chat', '/t Keep this out of chat'])(
    'refuses disabled raw side-channel initial messages: %s',
    async (initialMessage) => {
      const mount = renderFreshChatPanel({
        canEdit: true,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
        initialMessage,
      })
      await vi.waitFor(() =>
        expect(mount.container.textContent).toContain('Team messaging is unavailable'),
      )
      expect(sent).toEqual([])
    },
  )

  it('refuses disabled side-channel programmatic pending messages', async () => {
    const props: FreshProps = {
      canEdit: true,
      canSendTeamMessages: false,
      extraCommands: [TEAM_COMMAND],
      pendingMessage: '/t Do not dispatch this',
      pendingMessageKey: 0,
    }
    const mount = renderFreshChatPanel(props)
    mount.setProps({ pendingMessageKey: 1 })
    await vi.waitFor(() =>
      expect(mount.container.textContent).toContain('Team messaging is unavailable'),
    )
    expect(sent).toEqual([])
  })

  it('rechecks the permission before dispatching an already-deferred programmatic team message', async () => {
    holdNextSend = true
    const props: FreshProps = {
      canEdit: true,
      canSendTeamMessages: true,
      extraCommands: [TEAM_COMMAND],
      pendingMessage: '/t deferred team note',
      pendingMessageKey: 0,
    }
    const mount = renderFreshChatPanel(props)
    const textarea = mount.container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
    if (!textarea) throw new Error('composer input not found')
    typeInto(textarea, 'Summarize the cookbook')
    mount.container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')?.click()
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    mount.setProps({ pendingMessageKey: 1 })
    await Promise.resolve()
    mount.setProps({ pendingMessageKey: 1, canSendTeamMessages: false })
    await Promise.resolve()
    finishHeldSend?.()
    await vi.waitFor(() =>
      expect(mount.container.textContent).toContain('Team messaging is unavailable'),
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
    const container = renderFreshChatPanel(
      { canEdit: false, canSendTeamMessages: false },
      history,
    ).container
    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(TIP_IDLE_MS + 1000)
    expect(container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    expect(container.textContent).toContain('Published message')
  })
})
