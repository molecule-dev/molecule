// @vitest-environment jsdom
/**
 * C2 + C3 — auto-sent message styling + hidden-message guard.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.automatic-message.test.tsx`
 * with the same test names and the same assertions: a message sent
 * automatically on the user's behalf renders as a green (success) tinted card
 * with a `sync` icon and no user avatar, while a real user message keeps its
 * classic card with the user's avatar and the animated gradient accent; a
 * `hidden` driver message never reaches the DOM; and a pending message
 * dispatched by the host renders as an auto-sent bubble (or not at all when
 * suppressed).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular/chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
} from './chat-panel-harness.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_TEXT = 'Build me a todo app'
const AUTO_TEXT = 'Fix these issues:\n\nsrc/app.ts(1,1): error'
const HIDDEN_TEXT = 'The development environment is now fully ready ... ACTIVE again'

/**
 * The seeded conversation: a user message, a hidden driver message, an
 * auto-sent message, and an assistant message.
 * @returns The seeded history for `loadHistory`.
 */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: USER_TEXT, timestamp: 1000 },
    // A driver message the user must never see (C3).
    { id: 'h1', role: 'user', content: HIDDEN_TEXT, hidden: true, timestamp: 1500 },
    // Auto-sent on the user's behalf — visible but distinctly styled (C2).
    { id: 'auto1', role: 'user', content: AUTO_TEXT, automatic: true, timestamp: 2000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 3000 },
  ]
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
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
 * Renders the panel with the seeded transcript.
 * @returns The mount container.
 */
async function renderChatPanel(): Promise<HTMLElement> {
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(seededHistory()),
    props: { projectId: 'proj-c2c3', userAvatar: null },
  })
  return mounted.container
}

describe('ChatPanel auto-sent + hidden messages (C2 + C3)', () => {
  it(
    'renders an automatic message as a green card with a sync icon, no user avatar, no heading (C2)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel()

      // The auto-sent message text mounts (timeline rendered).
      await vi.waitFor(() => {
        expect(container.textContent).toContain('Fix these issues:')
      })

      // It is the auto-sent card, NOT a plain user card.
      const autoCard = container.querySelector<HTMLElement>(
        '[data-mol-id="chat-automatic-message"]',
      )
      expect(autoCard).not.toBeNull()

      // Green (success) tinted card chrome — the whole 1px frame, not the brand tint.
      expect(autoCard!.style.border).toContain('--mol-color-success')
      expect(autoCard!.style.border).not.toContain('--mol-color-primary')

      // A `sync` "automatic" icon renders, and NOT the user's avatar.
      expect(autoCard!.querySelector('svg')).not.toBeNull()
      expect(autoCard!.querySelector('[data-mol-id="chat-user-avatar"]')).toBeNull()
      expect(autoCard!.querySelector('[data-mol-id="chat-automatic-avatar"]')).toBeNull()

      // The old "Sent automatically" heading is gone — just the message text.
      expect(autoCard!.textContent).not.toContain('Sent automatically')
    },
  )

  it(
    'renders a real user message with the user avatar + animated gradient accent (not auto-sent)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel()

      await vi.waitFor(() => {
        expect(container.textContent).toContain(USER_TEXT)
      })

      const userCard = container.querySelector<HTMLElement>('[data-mol-id="chat-user-message"]')
      expect(userCard).not.toBeNull()
      // A real user message keeps its classic look — its left edge is an ANIMATED blue
      // gradient stripe, drawn by a `::before` whose rule is injected once and gated on
      // this row's data-mol-id. So it must NOT have the auto-sent green border, and the
      // animated primary-blue gradient rule must be present + wired.
      expect(userCard!.style.borderLeft).not.toContain('--mol-color-success')
      const accentStyle = document.getElementById('mol-chat-user-accent-style')
      expect(accentStyle).not.toBeNull()
      expect(accentStyle!.textContent).toContain('[data-mol-id="chat-user-message"]::before')
      expect(accentStyle!.textContent).toContain('--mol-color-primary')
      expect(accentStyle!.textContent).toContain('mol-chat-accent-flow')
      expect(userCard!.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
      expect(userCard!.textContent).not.toContain('Sent automatically')
    },
  )

  it('never renders a hidden driver message (C3)', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const container = await renderChatPanel()

    // Wait for the timeline to mount via a message that DOES render.
    await vi.waitFor(() => {
      expect(container.textContent).toContain('On it.')
    })

    // The hidden message content must not be anywhere in the DOM.
    expect(container.textContent).not.toContain('ACTIVE again')
  })
})

describe('ChatPanel pending auto-sent messages render as Synthase, not the user', () => {
  /**
   * Renders the panel, then DISPATCHES a pending message by bumping
   * `pendingMessageKey` 0 → 1 — exactly how the Workspace dispatches an auto-fix
   * / preview-failure message (the send fires on the key CHANGE).
   *
   * @param props - The pending message's props.
   * @returns The mount container.
   */
  async function dispatchPending(props: {
    pendingMessage: string
    pendingMessageSuppressUser?: boolean
  }): Promise<HTMLElement> {
    mounted?.unmount()
    mounted = await mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      props: { projectId: 'proj-pending', userAvatar: null, pendingMessageKey: 0 },
    })
    mounted.props['pendingMessageKey'] = 1
    mounted.props['pendingMessage'] = props.pendingMessage
    if (props.pendingMessageSuppressUser)
      mounted.props['pendingMessageSuppressUser'] = props.pendingMessageSuppressUser
    mounted.tick()
    return mounted.container
  }

  it(
    'renders a non-suppressed pending message as a "Sent automatically" bubble, never a user bubble',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // This is the preview-failure / Fix-with-AI path: the message is composed by
      // the system and sent on the user's behalf — it must be flagged `automatic`.
      const container = await dispatchPending({
        pendingMessage: 'Investigate the broken preview',
      })
      await vi.waitFor(() => {
        expect(container.querySelector('[data-mol-id="chat-automatic-message"]')).not.toBeNull()
      })
      const auto = container.querySelector('[data-mol-id="chat-automatic-message"]')!
      expect(auto.textContent).toContain('Investigate the broken preview')
      // It must NOT render as a real (typed-by-the-user) message.
      expect(container.querySelector('[data-mol-id="chat-user-message"]')).toBeNull()
    },
  )

  it(
    'still hides a SUPPRESSED pending message entirely (build kickoff)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await dispatchPending({
        pendingMessage: 'hidden build kickoff prompt',
        pendingMessageSuppressUser: true,
      })
      // Let the send run; a suppressed message must never surface as a bubble of either kind.
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(container.textContent).not.toContain('hidden build kickoff prompt')
      expect(container.querySelector('[data-mol-id="chat-automatic-message"]')).toBeNull()
    },
  )
})
