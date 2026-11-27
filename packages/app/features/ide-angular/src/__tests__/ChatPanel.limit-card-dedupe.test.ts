// @vitest-environment jsdom
/**
 * One limit, one surface.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.limit-card-dedupe.test.tsx`
 * with the same test names and the same assertions: a recorded card that
 * declares `coversLimitType` steps aside while the live error banner states the
 * same limit (the banner is never the one suppressed), a card covering a
 * different limit is untouched, and the panel forwards the backend's whole
 * description of the refusal — `limitType`, `billingAction`, `upgradeTier` — to
 * the host's `buildUpgradeCta`.
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

import type { ChatPanelProps } from '../components/chat-panel.component.js'
import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
} from './chat-panel-harness.js'

/** The card the interrupted turn recorded (the host's copy). */
const CARD_TEXT = "You've used today's free AI budget for guests. It refreshes tomorrow."
/** The live banner the refused NEXT send gets (the backend's copy for the same limit). */
const BANNER_TEXT =
  "You've used today's free AI budget for guests. It refreshes in about 23 hours — or create a free account for more."
/** A card for an unrelated limit — must survive the dedupe. */
const OTHER_CARD_TEXT = 'Your usage balance is empty. Add funds in Billing to keep building.'

/** History with both limit cards; every send is refused with the `ai_cost` limit. */
function buildChatProvider(): ChatProvider {
  const history: ChatMessage[] = [
    {
      id: 'card-budget',
      role: 'system',
      content: '',
      timestamp: 1000,
      cardEvent: { kind: 'custom', name: 'lim_budget' },
    },
    {
      id: 'card-balance',
      role: 'system',
      content: '',
      timestamp: 1001,
      cardEvent: { kind: 'custom', name: 'lim_balance' },
    },
  ]
  return {
    name: 'stub',
    sendMessage: async (
      _message: string,
      _config: ChatConfig,
      onEvent: (event: ChatStreamEvent) => void,
    ): Promise<void> => {
      const refused: ChatStreamEvent = {
        type: 'error',
        message: BANNER_TEXT,
        status: 429,
        limitType: 'ai_cost',
        requiresSignup: true,
        // The backend's own answer to "what can this user do about it", alongside
        // the rule that fired and the plan an upgrade would move to.
        billingAction: 'sign_up',
        upgradeTier: 'pro',
      }
      onEvent(refused)
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** The CTA-builder contract the panel calls — the host's, forwarded verbatim. */
type BuildUpgradeCta = NonNullable<ChatPanelProps['buildUpgradeCta']>

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
  registerCustomEventCard('lim_budget', () => ({
    text: CARD_TEXT,
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  }))
  registerCustomEventCard('lim_balance', () => ({
    text: OTHER_CARD_TEXT,
    tone: 'info',
    action: [{ label: 'Add funds', href: '/billing' }],
    coversLimitType: 'usage_balance',
  }))
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
})

/**
 * Renders the panel against the seeded provider.
 * @param buildUpgradeCta - Host CTA builder, when the test asserts on it.
 * @returns The mount container.
 */
async function renderPanel(buildUpgradeCta?: BuildUpgradeCta): Promise<HTMLElement> {
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(),
    props: {
      projectId: 'proj-limit',
      agentName: 'Synthase',
      ...(buildUpgradeCta ? { buildUpgradeCta } : {}),
    },
  })
  return mounted.container
}

/**
 * Types a value into the composer and submits it with Enter.
 * @param container - The mount container.
 * @param text - The text.
 */
function submit(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

describe('ChatPanel limit-card dedupe', () => {
  it(
    'drops a card whose limit the live banner is already stating, keeping the banner',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderPanel()

      // Before any send there is no error, so BOTH recorded cards render.
      await vi.waitFor(() => {
        expect(container.textContent).toContain(CARD_TEXT)
        expect(container.textContent).toContain(OTHER_CARD_TEXT)
      })

      // Send — the backend refuses it with the SAME limit the budget card covers.
      submit(container, 'keep going')

      await vi.waitFor(() => {
        // The live banner states the limit…
        expect(container.textContent).toContain(BANNER_TEXT)
      })
      // …and the card that covers that same limit stepped aside, so the limit is stated
      // ONCE. This is the bug: both used to render, one above the other.
      expect(container.textContent).not.toContain(CARD_TEXT)
      // A card covering a DIFFERENT limit is untouched.
      expect(container.textContent).toContain(OTHER_CARD_TEXT)
    },
  )

  it(
    'hands the host the backend’s limitType, billingAction and upgradeTier',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // The host can only pick the right button from what the panel passes it. This
      // is the whole fix: the banner used to receive `requiresSignup` alone, so
      // "Upgrade" was the only answer any host could give — while the card it hid
      // said "Add funds".
      const buildUpgradeCta = vi.fn<BuildUpgradeCta>((context) => [
        { label: `cta:${context.billingAction ?? 'unknown'}`, href: '/signup' },
      ])
      const container = await renderPanel(buildUpgradeCta)

      submit(container, 'keep going')

      await vi.waitFor(() => {
        expect(container.textContent).toContain(BANNER_TEXT)
      })

      const contexts = buildUpgradeCta.mock.calls.map(([context]) => context)
      expect(contexts).toContainEqual({
        requiresSignup: true,
        limitType: 'ai_cost',
        billingAction: 'sign_up',
        upgradeTier: 'pro',
      })
      // …and the button the host built from it is the one actually rendered, so the
      // banner and the card it suppressed now say the same thing.
      expect(container.textContent).toContain('cta:sign_up')
    },
  )
})
