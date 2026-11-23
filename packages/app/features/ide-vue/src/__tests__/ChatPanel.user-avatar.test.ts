// @vitest-environment jsdom
/**
 * SOC1 / C5 — user-avatar-in-chat wiring guard, the Vue port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.user-avatar.test.tsx` with
 * the same test names and the same behavioral assertions.
 *
 * The real `ChatPanel` mounts with a seeded history, so this exercises the full
 * prop chain (`ChatPanel → MessageItem → UserAvatar`): the signed-in user's real
 * avatar on their own messages (gated by `resolveUserAvatar`), the generic-icon /
 * team-initial fallback, and the profile click. React only renders a clickable
 * avatar or author name when `onProfileClick` is supplied; the same holds here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import type { ChatPanelProps } from '../components/ChatPanel.js'
import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

const USER_MESSAGE_TEXT = 'Add a dark mode toggle'

/** A 1×1 transparent PNG data-URI — a safe, renderable avatar source. */
const AVATAR_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/**
 * A chat provider whose `loadHistory` replays a fixed transcript.
 *
 * @param history - Messages `loadHistory` resolves with.
 * @returns A stub chat provider.
 */
function buildProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (): Promise<ChatMessage[]> => history,
  }
}

/**
 * The seeded conversation the stub provider returns.
 *
 * @returns A two-message history (one user, one assistant).
 */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: USER_MESSAGE_TEXT, timestamp: 1000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 2000 },
  ]
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the real panel with a seeded history.
 *
 * @param props - Extra panel props.
 * @param history - The transcript to replay (defaults to the seeded one).
 * @returns The mounted panel.
 */
function mountChat(
  props: Partial<ChatPanelProps> = {},
  history: ChatMessage[] = seededHistory(),
): PanelMount {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildProvider(history),
    projectId: 'proj-soc1',
    props,
  })
  return mounted
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(
    new Proxy(
      {},
      {
        get: () => ({ paths: [] }),
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
  // jsdom does not implement scrollIntoView; the chat scrolls to the latest
  // message after history loads.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
})

describe('ChatPanel user avatar (SOC1)', () => {
  it('renders the real avatar image beside a user message when userAvatar is supplied', async () => {
    const { container } = mountChat({ userAvatar: AVATAR_DATA_URI })
    // The seeded user message must mount (proves the timeline rendered).
    await vi.waitFor(() => expect(container.textContent).toContain(USER_MESSAGE_TEXT))

    const avatar = container.querySelector<HTMLElement>('[data-mol-id="chat-user-avatar"]')
    expect(avatar, 'a user-avatar element should render for the user message').not.toBeNull()

    // The wiring the audit found missing: a real <img> with the safe src.
    expect(avatar?.tagName).toBe('IMG')
    expect(avatar?.getAttribute('src')).toBe(AVATAR_DATA_URI)
    expect(avatar?.getAttribute('alt')).toBe('You')
  })

  it('keeps the glyph decorative for a whitespace-only author name', async () => {
    // A whitespace-only name initials to nothing, so the generic glyph shows —
    // and with no name to announce, the glyph is decorative chrome (axe
    // `role-img-alt`): no image role, no label, hidden from assistive tech.
    const history: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'hello from a blank author',
        timestamp: 1000,
        author: { id: 'u-blank', name: '   ', avatar: null },
      },
    ]
    const { container } = mountChat({}, history)
    await vi.waitFor(() => expect(container.textContent).toContain('hello from a blank author'))
    const avatar = container.querySelector<HTMLElement>('[data-mol-id="chat-user-avatar"]')
    expect(avatar).not.toBeNull()

    expect(avatar!.tagName).not.toBe('IMG')
    // The glyph renders (not an initial)…
    expect(avatar!.querySelector('svg')).not.toBeNull()
    expect(avatar?.textContent).toBe('')
    // …as decoration: no name to announce, so no image role and no label.
    expect(avatar?.getAttribute('role')).toBeNull()
    expect(avatar?.getAttribute('aria-label')).toBeNull()
    expect(avatar?.getAttribute('aria-hidden')).toBe('true')
  })

  it('never places an unsafe avatar value into an <img src> (safety gate is applied in render)', async () => {
    const { container } = mountChat({ userAvatar: 'javascript:alert(1)' })
    await vi.waitFor(() => expect(container.textContent).toContain(USER_MESSAGE_TEXT))
    expect(container.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()

    // The unsafe scheme must be rejected → icon fallback, never an <img>.
    expect(container.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
    const avatar = container.querySelector<HTMLElement>('[data-mol-id="chat-user-avatar"]')
    expect(avatar).not.toBeNull()
    expect(avatar!.tagName).not.toBe('IMG')
    expect(avatar!.querySelector('svg')).not.toBeNull()
  })
})

describe('ChatPanel user avatar clickability (C5)', () => {
  it('is NOT interactive when no onProfileClick is supplied (backward-compatible)', async () => {
    const { container } = mountChat({ userAvatar: AVATAR_DATA_URI })
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull(),
    )

    // No button wrappers — the avatar renders as the bare image and the author
    // name as the plain bold span, exactly as before.
    expect(container.querySelector('[data-mol-id="chat-user-avatar-button"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-user-name-button"]')).toBeNull()
  })

  it('opens the profile (fires onProfileClick with the clicked identity) when the avatar is clicked', async () => {
    const onProfileClick = vi.fn()
    const { container } = mountChat({ userAvatar: AVATAR_DATA_URI, onProfileClick })
    const button = await vi.waitFor(() => {
      const el = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-user-avatar-button"]',
      )
      expect(el, 'a clickable avatar button should render for the user message').not.toBeNull()
      return el
    })

    // Real button — keyboard-focusable and screen-reader-labelled.
    expect(button?.tagName).toBe('BUTTON')
    expect(button?.getAttribute('aria-label')).toBe('View profile')
    // It still renders the real avatar image inside.
    expect(button).not.toBeNull()
    expect(button!.querySelector('img[data-mol-id="chat-user-avatar"]')).not.toBeNull()

    button?.click()
    expect(onProfileClick).toHaveBeenCalledTimes(1)
    expect(onProfileClick).toHaveBeenCalledWith({ avatar: AVATAR_DATA_URI })
  })

  it("fires with the clicked AUTHOR's identity — a teammate's avatar opens THEIR profile, never the viewer's", async () => {
    const onProfileClick = vi.fn()
    // Two authored messages: the signed-in user's own (Luke) and a teammate's
    // (Test). BOTH avatars are clickable now; each click carries that message's
    // own author identity so the host can show teammate=view-only, own=editable.
    const history: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'mine',
        timestamp: 1000,
        author: { id: 'u-luke', name: 'Luke', avatar: AVATAR_DATA_URI },
      },
      {
        id: 'u2',
        role: 'user',
        content: 'theirs',
        timestamp: 2000,
        author: { id: 'u-test', name: 'Test', avatar: null },
      },
    ]
    const { container } = mountChat(
      { userAvatar: AVATAR_DATA_URI, currentUserId: 'u-luke', onProfileClick },
      history,
    )
    await vi.waitFor(() => expect(container.textContent).toContain('theirs'))
    // BOTH avatars are clickable — the viewer's own AND the teammate's.
    const buttons = container.querySelectorAll<HTMLElement>(
      '[data-mol-id="chat-user-avatar-button"]',
    )
    expect(buttons.length).toBe(2)
    // Luke's (first message) wraps the real avatar image; Test's is the initial tile.
    expect(buttons[0].querySelector('img')).not.toBeNull()
    expect(buttons[1].querySelector('img')).toBeNull()

    // Clicking the teammate's avatar carries the TEAMMATE's identity.
    buttons[1].click()
    expect(onProfileClick).toHaveBeenLastCalledWith({ id: 'u-test', name: 'Test', avatar: null })
    // Clicking the viewer's own avatar carries their own.
    buttons[0].click()
    expect(onProfileClick).toHaveBeenLastCalledWith({
      id: 'u-luke',
      name: 'Luke',
      avatar: AVATAR_DATA_URI,
    })
  })

  it("opens the author's profile from their NAME too (clickable header username)", async () => {
    const onProfileClick = vi.fn()
    const history: ChatMessage[] = [
      {
        id: 'u2',
        role: 'user',
        content: 'from a teammate',
        timestamp: 1000,
        author: { id: 'u-test', name: 'Test', avatar: null },
      },
    ]
    const { container } = mountChat(
      { userAvatar: AVATAR_DATA_URI, currentUserId: 'u-luke', onProfileClick },
      history,
    )
    const nameButton = await vi.waitFor(() => {
      const el = container.querySelector<HTMLButtonElement>('[data-mol-id="chat-user-name-button"]')
      expect(el, 'the author name should render as a clickable button').not.toBeNull()
      return el
    })

    // A real button whose visible text IS the author's name (its accessible name).
    expect(nameButton?.tagName).toBe('BUTTON')
    expect(nameButton?.textContent).toBe('Test')

    nameButton?.click()
    expect(onProfileClick).toHaveBeenCalledTimes(1)
    expect(onProfileClick).toHaveBeenCalledWith({ id: 'u-test', name: 'Test', avatar: null })
  })
})
