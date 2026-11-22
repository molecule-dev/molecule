// @vitest-environment jsdom
/**
 * Voice-dictation badge on a user message.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.dictated-message.test.tsx`
 * with the same test names and the same assertions: a message composed through
 * dictation carries a red mic badge that is an image with an accessible name, a
 * filled mic capsule, and a hand-typed message carries no badge at all.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

const DICTATED_TEXT = 'add a login page to the app'
const TYPED_TEXT = 'now make it dark mode'

/** The seeded conversation: a dictated message, a reply, a typed message. */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: DICTATED_TEXT, viaDictation: true, timestamp: 1000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 2000 },
    { id: 'u2', role: 'user', content: TYPED_TEXT, timestamp: 3000 },
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
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel with the seeded history.
 *
 * @returns The mount container.
 */
function mountChatPanel(): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(seededHistory()),
    props: { projectId: 'proj-dictated', userAvatar: null },
  })
  return mounted.container
}

describe('ChatPanel dictated messages (voice-dictation badge)', () => {
  it('renders the mic badge on a viaDictation user message, with an accessible name', async () => {
    const container = mountChatPanel()
    await vi.waitFor(() => expect(container.textContent).toContain(DICTATED_TEXT))

    const userCard = container.querySelector<HTMLElement>('[data-mol-id="chat-user-message"]')
    expect(userCard).not.toBeNull()
    expect(userCard?.textContent).toContain(DICTATED_TEXT)

    const badge = userCard?.querySelector<HTMLElement>('[data-mol-id="chat-dictated-badge"]')
    expect(badge, 'the dictated badge should render on the dictated message').not.toBeNull()
    const svg = badge?.querySelector('svg')
    expect(svg, 'the mic glyph should render').not.toBeNull()
    expect(svg?.getAttribute('width')).toBe('16')
    expect(badge?.getAttribute('title')).toBe('Dictated by voice')
    expect(badge?.getAttribute('aria-label')).toBe('Dictated by voice')
    // An icon-only badge is an image with a name.
    expect(badge?.getAttribute('role')).toBe('img')
    // Filled capsule (the listening mic shape, bolder than the idle outline).
    const capsule = svg?.querySelector('rect')
    expect(capsule, 'the mic capsule should render').not.toBeNull()
    expect(capsule?.getAttribute('fill')).toBe('currentColor')
  })

  it('renders NO badge on a hand-typed user message', async () => {
    const container = mountChatPanel()
    await vi.waitFor(() => expect(container.textContent).toContain(TYPED_TEXT))

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>('[data-mol-id="chat-user-message"]'),
    )
    expect(cards.length).toBe(2)
    const typedCard = cards.find((card) => card.textContent?.includes(TYPED_TEXT))
    expect(typedCard, 'the typed message should render').toBeTruthy()
    expect(typedCard?.querySelector('[data-mol-id="chat-dictated-badge"]')).toBeNull()
  })
})
