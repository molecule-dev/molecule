// @vitest-environment jsdom
/**
 * History restore on refresh, the verification advisory, and the resource-limit
 * upgrade banner.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.history-restore.test.tsx`
 * with the same test names and the same assertions: the persisted conversation
 * loads on mount even with a stale `initialInputValue` and no conversation id, a
 * discovery turn whose only block is a resolved `tool_call` restores, the stored
 * render-check advisory renders in the real success badge through the ClassMap's
 * warning token (no inline colour), a clean pass carries no advisory, and the
 * host's upgrade buttons render through the shared notice card.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import type { UpgradeCtaContext } from '../parts/MessageItem.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

const USER_PROMPT = 'An e-learning platform with quizzes and certificates'
const ASSISTANT_TEXT = 'Saved the plan — building it now.'

/** A persisted discovery conversation: prompt, ask_user turn, closing reply. */
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
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts a panel over the given transcript.
 *
 * @param history - The transcript the stub provider replays.
 * @param props - Extra panel props (a stale composer seed, a CTA builder).
 * @returns The mount container.
 */
function mountChatPanel(
  history: ChatMessage[],
  props: {
    initialInputValue?: string
    buildUpgradeCta?: (
      context: UpgradeCtaContext,
    ) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
    projectId?: string
  } = {},
): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(history),
    props: {
      projectId: props.projectId ?? 'proj-refresh',
      userAvatar: null,
      initialInputValue: props.initialInputValue,
      buildUpgradeCta: props.buildUpgradeCta,
    },
  })
  return mounted.container
}

/**
 * A transcript whose only message is a verification block.
 *
 * @param renderCheckUnavailable - Whether the render check was inconclusive.
 * @returns The transcript.
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

describe('ChatPanel history restore on refresh (loadOnMount)', () => {
  it('loads the persisted conversation on mount even when initialInputValue is set and the endpoint has no conversation id', async () => {
    const container = mountChatPanel(seededHistory(), { initialInputValue: USER_PROMPT })
    await vi.waitFor(() => expect(container.textContent).toContain(USER_PROMPT))
    expect(container.textContent).toContain(ASSISTANT_TEXT)
  })

  it('restores a discovery turn whose only block is a resolved tool_call (empty content)', async () => {
    const container = mountChatPanel(seededHistory(), { initialInputValue: USER_PROMPT })
    await vi.waitFor(() =>
      expect(container.textContent).toContain('What quiz question types do you need?'),
    )
  })
})

describe('ChatPanel verification render advisory', () => {
  it('renders the stored unavailable advisory in the actual success badge', async () => {
    const container = mountChatPanel(verificationHistory(true))
    await vi.waitFor(() => expect(container.textContent).toContain('Checks passed'))
    expect(container.textContent).toContain('Render check unavailable')
  })

  it('uses the registered ClassMap warning token without an inline color', async () => {
    setClassMap({ ...classMap, textWarning: 'review-warning-token' })
    try {
      const container = mountChatPanel(verificationHistory(true))
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
  })

  it('renders no advisory for a clean pass', async () => {
    const container = mountChatPanel(verificationHistory())
    await vi.waitFor(() => expect(container.textContent).toContain('Checks passed'))
    expect(container.textContent).not.toContain('Render check unavailable')
  })
})

describe('ChatPanel resource-limit (OOM) upgrade banner', () => {
  /** A transcript whose reply reports a memory resource limit. */
  const oomHistory = (): ChatMessage[] => [
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

  it('renders the host upgrade buttons through the shared notice card (no bespoke svg)', async () => {
    const container = mountChatPanel(oomHistory(), {
      projectId: 'proj-oom',
      buildUpgradeCta: () => [
        { label: 'Sign up', href: '/signup' },
        { label: 'Log in', href: '/login' },
      ],
    })
    await vi.waitFor(() => expect(container.textContent).toContain('ran out of memory'))
    const card = container.querySelector('[data-mol-id="chat-notice-card"]')
    expect(card).toBeTruthy()
    expect(card?.querySelector('a[href="/signup"]')).toBeTruthy()
    expect(card?.querySelector('a[href="/login"]')).toBeTruthy()
    // NOT the old bespoke raw warning triangle.
    expect(card?.querySelector('svg path[d^="M8.485"]')).toBeNull()
  })
})
