// @vitest-environment jsdom
/**
 * History-restore-on-refresh regression guard, plus the verification advisory
 * and the resource-limit banner.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.history-restore.test.tsx`
 * with the same test names and the same assertions: the persisted conversation
 * renders even with a stale `initialInputValue` and no conversation id in the
 * endpoint, a discovery turn whose only block is a resolved `ask_user` call
 * renders its question, the stored render-check advisory renders in the theme's
 * warning token, and a resource-limit block renders through the shared notice
 * card with the host's upgrade buttons.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
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

// ── Fixtures ────────────────────────────────────────────────────────────────

const USER_PROMPT = 'An e-learning platform with quizzes and certificates'
const ASSISTANT_TEXT = 'Saved the plan — building it now.'

/**
 * A persisted discovery conversation: the opening user prompt, a discovery
 * `ask_user` turn whose ONLY block is a resolved tool_call (empty text content),
 * and a closing assistant message.
 * @returns The seeded history for `loadHistory`.
 */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: USER_PROMPT, timestamp: 1000 },
    {
      id: 'a-ask',
      role: 'assistant',
      content: '',
      timestamp: 2000,
      blocks: [{ type: 'tool_call', id: 'tc-ask' }],
      toolCalls: [
        {
          id: 'tc-ask',
          name: 'ask_user',
          input: { question: 'What quiz question types do you need?' },
          output: 'Multiple choice + true/false',
          status: 'done',
        },
      ],
    },
    { id: 'a-final', role: 'assistant', content: ASSISTANT_TEXT, timestamp: 3000 },
  ]
}

/**
 * The verification history: one assistant turn carrying the given block.
 * @param renderCheckUnavailable - Whether the stored render check could not run.
 * @returns The history for `loadHistory`.
 */
function verificationHistory(renderCheckUnavailable?: boolean): ChatMessage[] {
  return [
    {
      id: 'a-verification',
      role: 'assistant',
      content: '',
      timestamp: 2000,
      blocks: [
        {
          type: 'verification',
          status: 'ok',
          workspaces: ['app'],
          ...(renderCheckUnavailable ? { renderCheckUnavailable } : {}),
        },
      ],
    },
  ]
}

/** The resource-limit (OOM) history. */
function oomHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: 'add 2fa', timestamp: 1000 },
    {
      id: 'a-oom',
      role: 'assistant',
      content: '',
      timestamp: 2000,
      blocks: [
        {
          type: 'resource_limit',
          resource: 'memory',
          message: 'A process ran out of memory. Upgrade for more sandbox resources.',
        },
      ],
    },
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
  setClassMap(classMap)
})

/**
 * Renders the panel over the given history and props.
 * @param history - The transcript the stub provider replays.
 * @param props - Extra panel props.
 * @returns The mount container.
 */
async function renderPanel(
  history: ChatMessage[],
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(history),
    props: { projectId: 'proj-refresh', userAvatar: null, ...props },
  })
  return mounted.container
}

describe('ChatPanel history restore on refresh (loadOnMount)', () => {
  it(
    'loads the persisted conversation on mount even when initialInputValue is set and the endpoint has no conversation id',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderPanel(seededHistory(), {
        // initialInputValue set + no conversationId in the endpoint = the refresh
        // case where the old `loadOnMount` was false and the conversation never loaded.
        initialInputValue: USER_PROMPT,
      })

      // The persisted user prompt AND the closing assistant message both render —
      // proving the on-mount history load ran despite the stale initialInputValue.
      await vi.waitFor(() => {
        expect(container.textContent).toContain(USER_PROMPT)
      })
      expect(container.textContent).toContain(ASSISTANT_TEXT)
    },
  )

  it(
    'restores a discovery turn whose only block is a resolved tool_call (empty content)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderPanel(seededHistory(), { initialInputValue: USER_PROMPT })

      // The ask_user turn carried no text — just a tool_call block. It is exactly
      // the message shape that disappeared on refresh; it must render its question.
      await vi.waitFor(() => {
        expect(container.textContent).toContain('What quiz question types do you need?')
      })
    },
  )
})

describe('ChatPanel verification render advisory', () => {
  it(
    'renders the stored unavailable advisory in the actual success badge',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderPanel(verificationHistory(true), {
        projectId: 'proj-verification',
      })

      await vi.waitFor(() => expect(container.textContent).toContain('Checks passed'))
      expect(container.textContent).toContain('Render check unavailable')
    },
  )

  it(
    'uses the registered ClassMap warning token without an inline color',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      setClassMap({ ...classMap, textWarning: 'review-warning-token' })
      try {
        const container = await renderPanel(verificationHistory(true), {
          projectId: 'proj-verification',
        })

        await vi.waitFor(() => expect(container.textContent).toContain('Render check unavailable'))
        const advisory = container.querySelector<HTMLElement>(
          '[data-mol-id="render-check-unavailable"]',
        )
        expect(advisory).not.toBeNull()
        expect(advisory?.className).toBe('review-warning-token')
        expect(advisory?.getAttribute('style')).toBeNull()
      } finally {
        setClassMap(classMap)
      }
    },
  )

  it('renders no advisory for a clean pass', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const container = await renderPanel(verificationHistory(), { projectId: 'proj-verification' })

    await vi.waitFor(() => expect(container.textContent).toContain('Checks passed'))
    expect(container.textContent).not.toContain('Render check unavailable')
  })
})

describe('ChatPanel resource-limit (OOM) upgrade banner', () => {
  it(
    'renders the host upgrade buttons through the shared notice card (no bespoke svg)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderPanel(oomHistory(), {
        projectId: 'proj-oom',
        buildUpgradeCta: () => [
          { label: 'Sign up', href: '/signup' },
          { label: 'Log in', href: '/login' },
        ],
      })

      await vi.waitFor(() => expect(container.textContent).toContain('ran out of memory'))
      // The OOM block renders through the SAME notice-card structure as every other
      // upgrade notice — not a one-off banner.
      const card = container.querySelector('[data-mol-id="chat-notice-card"]')
      expect(card).toBeTruthy()
      // It now carries the host's sign-in/upgrade BUTTONS (previously it had none).
      expect(card?.querySelector('a[href="/signup"]')).toBeTruthy()
      expect(card?.querySelector('a[href="/login"]')).toBeTruthy()
      // And NOT the old bespoke raw <svg> warning triangle (the inconsistent icon).
      expect(card?.querySelector('svg path[d^="M8.485"]')).toBeNull()
    },
  )
})
