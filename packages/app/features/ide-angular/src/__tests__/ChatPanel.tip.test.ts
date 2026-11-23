// @vitest-environment jsdom
/**
 * SYN12 / team-message integration guard — the Angular port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.tip.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through the real
 * `ChatPanel` (`chat-panel-harness.ts`).
 *
 * The auto-tip gating used to be so conservative that new users saw ZERO tips;
 * the fix surfaces one onboarding tip the moment a fresh conversation opens. A
 * read-only viewer additionally gets the GOLD orientation tip. And the panel has
 * three message states the tests pin: a private viewer keeps the team composer
 * and the side channel, an editor with team messages disabled gets an honest
 * refusal, and a public transcript hides the composer and everything actionable.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { CommandDef } from '@molecule/app-ide-panel-logic'
import { TIP_IDLE_MS, TIP_MIN_MESSAGES } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
  settle,
} from './chat-panel-harness.js'

/** What the stub provider observed: the message and whether it was a side channel. */
const sent: { message: string; sideChannel: boolean }[] = []
let holdNextSend = false
let finishHeldSend: (() => void) | undefined

/**
 * A chat provider whose history resolves to `history`, recording every send.
 *
 * @param history - The messages `loadHistory` resolves with.
 * @returns The stub chat provider.
 */
function buildProvider(history: ChatMessage[] = []): ChatProvider {
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

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the real panel on a fresh conversation.
 *
 * @param props - Extra panel props.
 * @param history - The transcript the stub provider replays.
 * @returns The mounted panel.
 */
async function mountChat(
  props: Record<string, unknown> = {},
  history: ChatMessage[] = [],
): Promise<PanelMount> {
  mounted?.unmount()
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildProvider(history),
    projectId: 'proj-syn12',
    props: { agentName: 'Synthase', ...props },
  })
  return mounted
}

/**
 * Every tip card on screen.
 *
 * @param container - The mounted container.
 * @returns The tip card elements.
 */
function tipCards(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-mol-id="chat-tip-card"]'))
}

/**
 * Finds an accessible textbox by name the way React Testing Library's
 * `queryByRole('textbox', { name })` does — hidden elements are not reachable.
 *
 * @param container - The mounted container.
 * @param name - The accessible name.
 * @returns The textbox, or null.
 */
function queryTextboxByName(container: HTMLElement, name: string): HTMLTextAreaElement | null {
  const boxes = Array.from(
    container.querySelectorAll<HTMLTextAreaElement>('textarea, [role="textbox"]'),
  )
  return (
    boxes.find(
      (box) =>
        box.closest('[hidden]') === null &&
        (box.getAttribute('aria-label') ?? box.getAttribute('placeholder') ?? '') === name,
    ) ?? null
  )
}

/**
 * Types a value into the composer, the way `fireEvent.change` does.
 *
 * @param container - The mounted container.
 * @param text - The exact text.
 */
function changeInput(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Clicks the composer's send button.
 *
 * @param container - The mounted container.
 */
function clickSend(container: HTMLElement): void {
  const button = container.querySelector<HTMLElement>('[data-mol-id="chat-send-button"]')
  if (!button) throw new Error('send button not found')
  button.click()
}

/**
 * Lets pending promises resolve and ticks the host, WITHOUT setTimeout (safe
 * under fake timers).
 *
 * @param mount - The live mount.
 */
async function settleMicro(mount: PanelMount | null): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve()
  mount?.tick()
  for (let i = 0; i < 12; i++) await Promise.resolve()
  mount?.tick()
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

beforeEach(() => {
  sent.length = 0
  holdNextSend = false
  finishHeldSend = undefined
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(
    new Proxy(
      {},
      {
        get: () => ({ paths: [], viewBox: '0 0 16 16' }),
      },
    ),
  )
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
})

describe('ChatPanel auto-tips (SYN12 — entry tip on a fresh conversation)', () => {
  it(
    'surfaces the onboarding entry tip immediately, with no idle wait',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat()
      await settle(mounted)

      const tip = container.querySelector('[data-mol-id="chat-tip-card"]')
      expect(tip, 'a fresh conversation must show the onboarding entry tip').not.toBeNull()

      // It is the high-value getStarted hint, personalised with the agent name and
      // pointing at the two interactions that unlock everything else (/ and @).
      const text = tip?.textContent ?? ''
      expect(text).toContain('type /')
      expect(text).toContain('Synthase')
      expect(text).toContain('to work from')
      // The interpolation token is resolved, never shown raw.
      expect(text).not.toContain('{{agentName}}')

      // A dismiss affordance is present so the tip is non-interrupting.
      expect(container.querySelector('[data-mol-id="chat-tip-dismiss"]')).not.toBeNull()
    },
  )
})

describe('ChatPanel viewer tip (read-only member orientation)', () => {
  it(
    'shows the GOLD viewer tip explaining /teamsay + the team-only icon for canEdit={false}',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat({ canEdit: false })
      await settle(mounted)

      const viewerTip = tipCards(container).find((el) =>
        /View-only access/.test(el.textContent ?? ''),
      )
      expect(viewerTip, 'a read-only viewer must see the orientation tip').toBeTruthy()

      const text = viewerTip?.textContent ?? ''
      // Explains the side channel AND the icon the team notes carry.
      expect(text).toContain('/teamsay')
      expect(text).toContain('gold icon')
      // The interpolation token is resolved, never shown raw.
      expect(text).toContain('Synthase ignores')
      expect(text).not.toContain('{{agentName}}')
      // Gold accent — the SAME colour as the team-only message treatment (#e0a100;
      // jsdom normalizes hex to rgb), not the neutral primary tint of other tips.
      expect(viewerTip?.getAttribute('style') ?? '').toMatch(/#e0a100|rgb\(224,\s*161,\s*0\)/)
      // Dismissable like every other tip.
      expect(viewerTip!.querySelector('[data-mol-id="chat-tip-dismiss"]')).not.toBeNull()
    },
  )

  it(
    'never shows the viewer tip when the member can edit',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat({ canEdit: true })
      await settle(mounted)

      // The entry tip still appears (fresh conversation) — but no viewer tip.
      expect(container.querySelector('[data-mol-id="chat-tip-card"]')).not.toBeNull()
      expect(tipCards(container).some((el) => /View-only access/.test(el.textContent ?? ''))).toBe(
        false,
      )
    },
  )
})

describe('ChatPanel team-message permission', () => {
  it(
    'renders a public transcript without composer, team prefill or actionable onboarding and refuses programmatic sends',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat({
        canEdit: false,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
      })
      await settle(mounted)

      const composer = container.querySelector('[data-mol-id="chat-composer"]')
      expect(composer?.hasAttribute('hidden')).toBe(true)
      expect(queryTextboxByName(container, 'Write a message')).toBeNull()
      expect(container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
      expect(container.querySelector('[data-mol-id="chat-empty-hint"]')).toBeNull()
      expect(container.textContent).not.toContain('View-only access')
      expect(container.textContent).not.toContain('/teamsay')
      const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
      expect(textarea?.value).toBe('')
      // Hidden controls are not reachable to a user. Calling their event directly
      // still cannot bypass the capability when another integration triggers it.
      changeInput(container, '/t private team note')
      await settle(mounted)
      clickSend(container)
      await settle(mounted)
      expect(sent).toEqual([])
    },
  )

  it(
    'keeps the existing private viewer team composer and side-channel dispatch by default',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat({ canEdit: false, extraCommands: [TEAM_COMMAND] })
      await settle(mounted)

      const textarea = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
      expect(textarea?.value).toBe('/teamsay ')
      expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
        false,
      )
      expect(container.textContent).toContain('View-only access')

      changeInput(container, '/t hello team')
      await settle(mounted)
      clickSend(container)
      await settle(mounted)
      expect(sent).toContainEqual({ message: '/t hello team', sideChannel: true })
    },
  )

  it(
    'preserves assistant sending for editors while omitting disabled side-channel commands',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat({
        canEdit: true,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
      })
      await settle(mounted)

      expect(container.querySelector('[data-mol-id="chat-composer"]')?.hasAttribute('hidden')).toBe(
        false,
      )
      changeInput(container, '/t')
      await settle(mounted)
      expect(container.textContent).not.toContain('/teamsay')

      changeInput(container, '/t Do not send this team note')
      await settle(mounted)
      clickSend(container)
      await settle(mounted)
      expect(container.textContent).toContain('Team messaging is unavailable')
      expect(sent).toEqual([])

      changeInput(container, 'Summarize this cookbook')
      await settle(mounted)
      clickSend(container)
      await settle(mounted)
      expect(sent).toContainEqual({ message: 'Summarize this cookbook', sideChannel: false })
    },
  )

  it.each(['/teamsay Keep this out of chat', '/t Keep this out of chat'])(
    'refuses disabled raw side-channel initial messages: %s',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async (initialMessage) => {
      const mount = await mountChat({
        canEdit: true,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
        initialMessage,
      })
      await settle(mount)
      expect(mount.container.textContent).toContain('Team messaging is unavailable')
      expect(sent).toEqual([])
    },
  )

  it(
    'refuses disabled side-channel programmatic pending messages',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const mount = await mountChat({
        canEdit: true,
        canSendTeamMessages: false,
        extraCommands: [TEAM_COMMAND],
        pendingMessage: '/t Do not dispatch this',
        pendingMessageKey: 0,
      })
      await settle(mount)
      mount.props['pendingMessageKey'] = 1
      await settle(mount)
      await settle(mount)
      expect(mount.container.textContent).toContain('Team messaging is unavailable')
      expect(sent).toEqual([])
    },
  )

  it(
    'rechecks the permission before dispatching an already-deferred programmatic team message',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      holdNextSend = true
      const mount = await mountChat({
        canEdit: true,
        canSendTeamMessages: true,
        extraCommands: [TEAM_COMMAND],
        pendingMessage: '/t deferred team note',
        pendingMessageKey: 0,
      })
      await settle(mount)

      changeInput(mount.container, 'Summarize the cookbook')
      await settle(mount)
      clickSend(mount.container)
      await settle(mount)
      expect(sent).toHaveLength(1)

      mount.props['pendingMessageKey'] = 1
      await settle(mount)
      mount.props['canSendTeamMessages'] = false
      await settle(mount)

      finishHeldSend?.()
      for (let i = 0; i < 8; i++) await settle(mount)
      expect(mount.container.textContent).toContain('Team messaging is unavailable')
      expect(sent).toEqual([{ message: 'Summarize the cookbook', sideChannel: false }])
    },
  )

  it(
    'never schedules actionable idle tips for a read-only public conversation',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const history: ChatMessage[] = Array.from({ length: TIP_MIN_MESSAGES }, (_, i) => ({
        id: `public-${i}`,
        role: i % 2 ? 'assistant' : 'user',
        content: `Published message ${i}`,
        timestamp: i + 1,
      }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const mount = await mountChat({ canEdit: false, canSendTeamMessages: false }, history)
      await settle(mount)

      vi.useFakeTimers()
      vi.advanceTimersByTime(10)
      await settleMicro(mount)
      vi.advanceTimersByTime(TIP_IDLE_MS + 1000)
      await settleMicro(mount)

      expect(mount.container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
      expect(mount.container.textContent).toContain('Published message')
    },
  )
})
