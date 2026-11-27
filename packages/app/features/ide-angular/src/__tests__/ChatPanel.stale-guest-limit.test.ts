// @vitest-environment jsdom
/**
 * A guest limit is stale the moment the guest signs in.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.stale-guest-limit.test.tsx`
 * with the same test names and the same assertions: the in-IDE auth modal never
 * navigates, so the panel keeps running across the login with the refused
 * send's error still in state. `isAnonymous={false}` + `requiresSignup` is the
 * whole signal — the banner goes, and the `coversLimitType` card it was
 * suppressing comes back. A real jsdom render of {@link ChatPanel} driving a
 * real send.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular/chat'
import { setIconSet } from '@molecule/app-icons'
import { registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
  submit,
} from './chat-panel-harness.js'

/** The live banner the refused send gets — the backend's guest-tier copy. */
const BANNER_TEXT =
  "You've used today's free AI budget for guests. It refreshes in about 17 hours — or create a free account for more."
/** The card the interrupted turn recorded, declaring it covers the same limit. */
const CARD_TEXT = "You've used today's free AI budget for guests. It refreshes tomorrow."

/**
 * History with the budget card; every send is refused with the guest `ai_cost`
 * limit.
 *
 * @returns The stub provider.
 */
function buildChatProvider(): ChatProvider {
  const history: ChatMessage[] = [
    {
      id: 'card-budget',
      role: 'system',
      content: '',
      timestamp: 1000,
      cardEvent: { kind: 'custom', name: 'guest_budget' },
    },
  ]
  return {
    name: 'stub',
    sendMessage: async (
      _message: string,
      _config: ChatConfig,
      onEvent: (event: ChatStreamEvent) => void,
    ): Promise<void> => {
      onEvent({
        type: 'error',
        message: BANNER_TEXT,
        status: 429,
        limitType: 'ai_cost',
        requiresSignup: true,
      } as ChatStreamEvent)
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
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
  registerCustomEventCard('guest_budget', () => ({
    text: CARD_TEXT,
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  }))
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
})

describe('ChatPanel stale guest limit', () => {
  it(
    'drops a requiresSignup limit banner once the viewer is no longer anonymous',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      mounted = await mountPanel({
        http: buildRejectingHttpClient(),
        chat: buildChatProvider(),
        props: { projectId: 'proj-guest', agentName: 'Synthase', isAnonymous: true },
      })
      const container = mounted.container

      // The recorded budget card is in the restored history.
      await vi.waitFor(() => {
        expect(container.textContent).toContain(CARD_TEXT)
      })

      // Guest hits the budget: the refused send raises the guest-tier limit banner,
      // and the card covering that same limit steps aside for it.
      submit(container, 'keep going')

      await vi.waitFor(() => {
        expect(container.textContent).toContain(BANNER_TEXT)
      })
      expect(container.textContent).not.toContain(CARD_TEXT)

      // They sign up in the in-IDE modal — nothing navigates, the panel keeps
      // running, and the error is still in useChat state. The host flips isAnonymous.
      mounted.props['isAnonymous'] = false
      mounted.tick()

      await vi.waitFor(() => {
        expect(container.textContent).not.toContain(BANNER_TEXT)
      })
      // The banner is gone, so it no longer suppresses the card it was covering —
      // whether THAT card still shows is its own factory's call (the host's drops it
      // for a signed-in viewer), not the banner's.
      expect(container.textContent).toContain(CARD_TEXT)
    },
  )

  it(
    'keeps the banner up while the viewer is still a guest',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      mounted = await mountPanel({
        http: buildRejectingHttpClient(),
        chat: buildChatProvider(),
        props: { projectId: 'proj-guest-2', agentName: 'Synthase', isAnonymous: true },
      })
      const container = mounted.container

      await vi.waitFor(() => {
        expect(container.textContent).toContain(CARD_TEXT)
      })
      submit(container, 'keep going')

      await vi.waitFor(() => {
        expect(container.textContent).toContain(BANNER_TEXT)
      })
      expect(container.textContent).not.toContain(CARD_TEXT)
    },
  )
})
