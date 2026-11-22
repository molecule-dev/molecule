// @vitest-environment jsdom
/**
 * One limit, one statement: the recorded card steps aside while the live banner
 * states the same limit.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.limit-card-dedupe.test.tsx`
 * with the same test names and the same assertions: a card whose `coversLimitType`
 * matches the live error banner's `limitType` is suppressed (kept out, banner in),
 * a card covering a DIFFERENT limit survives, and the host receives the
 * backend's `limitType`, `billingAction` and `upgradeTier` verbatim.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { type ChatEventCardAction, registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import type { UpgradeCtaContext } from '../parts/MessageItem.js'
import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
  submit,
} from './chat-panel-harness.js'

const CARD_TEXT = "You've used today's free AI budget for guests. It refreshes tomorrow."
const BANNER_TEXT =
  "You've used today's free AI budget for guests. It refreshes in about 23 hours — or create a free account for more."
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
      onEvent({
        type: 'error',
        message: BANNER_TEXT,
        status: 429,
        limitType: 'ai_cost',
        requiresSignup: true,
        billingAction: 'sign_up',
        upgradeTier: 'pro',
      })
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** An HTTP client whose every request rejects; mounted callers catch their own. */
function buildHttpClient(): HttpClient {
  const client = buildRejectingHttpClient()
  return { ...client, patch: async () => responseOf({}) }
}

/** The CTA-builder contract the panel calls — the host's, forwarded verbatim. */
type BuildUpgradeCta = (context: UpgradeCtaContext) => ChatEventCardAction[] | null

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel over the seeded provider.
 *
 * @param buildUpgradeCta - Host CTA builder, when the test asserts on it.
 * @returns The mount container.
 */
function renderPanel(buildUpgradeCta?: BuildUpgradeCta): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildHttpClient(),
    chat: buildChatProvider(),
    props: { projectId: 'proj-limit', agentName: 'Synthase', buildUpgradeCta },
  })
  return mounted.container
}

describe('ChatPanel limit-card dedupe', () => {
  it('drops a card whose limit the live banner is already stating, keeping the banner', async () => {
    const container = renderPanel()

    // Before any send there is no error, so BOTH recorded cards render.
    await vi.waitFor(() => {
      expect(container.textContent).toContain(CARD_TEXT)
      expect(container.textContent).toContain(OTHER_CARD_TEXT)
    })

    submit(container, 'keep going')

    await vi.waitFor(() => {
      // The live banner states the limit…
      expect(container.textContent).toContain(BANNER_TEXT)
    })
    // …and the card that covers that same limit stepped aside, so the limit is
    // stated ONCE. A card covering a DIFFERENT limit is untouched.
    expect(container.textContent).not.toContain(CARD_TEXT)
    expect(container.textContent).toContain(OTHER_CARD_TEXT)
  })

  it('hands the host the backend’s limitType, billingAction and upgradeTier', async () => {
    const buildUpgradeCta = vi.fn<BuildUpgradeCta>((context) => [
      { label: `cta:${context.billingAction ?? 'unknown'}`, href: '/signup' },
    ])
    const container = renderPanel(buildUpgradeCta)

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
    expect(container.textContent).toContain('cta:sign_up')
  })
})
