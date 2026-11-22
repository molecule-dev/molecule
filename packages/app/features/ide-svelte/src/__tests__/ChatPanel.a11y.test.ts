// @vitest-environment jsdom
/**
 * ChatPanel's keyboard and dialog semantics.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.a11y.test.tsx` with
 * the same test names and the same assertions: the queued-message editor takes
 * focus when it opens and is named with an `aria-label`, the team-only badge is
 * an image with a name, the conversation picker moves focus into its search
 * field, and the panel overlay is a non-modal dialog named from its heading and
 * closable with Escape from anywhere inside it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
  submit,
} from './chat-panel-harness.js'

/** A user message still waiting for delivery — the queued-message row. */
const QUEUED_MESSAGE: ChatMessage = {
  id: 'queued-1',
  role: 'user',
  content: 'queued message',
  timestamp: 1,
  queued: true,
}

/** A human side-channel note — the gold team-only badge marks it. */
const TEAM_NOTE_MESSAGE: ChatMessage = {
  id: 'team-1',
  role: 'user',
  content: 'note for the team',
  timestamp: 2,
  teamOnly: true,
}

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
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders the panel with the given history and waits for the composer.
 *
 * @param history - The transcript the stub provider replays.
 * @returns The mount container.
 */
async function renderChatPanel(history: ChatMessage[] = []): Promise<HTMLElement> {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(history),
    props: { projectId: 'proj-a11y', agentName: 'Synthase' },
  })
  await vi.waitFor(() =>
    expect(mounted?.container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
  )
  return mounted.container
}

/**
 * The queued-message editor textarea (the one that is NOT the composer).
 *
 * @param container - The mount container.
 * @returns The editor, or undefined before it opens.
 */
function queuedEditor(container: HTMLElement): HTMLTextAreaElement | undefined {
  return Array.from(container.querySelectorAll('textarea')).find(
    (candidate) => candidate.getAttribute('data-mol-chat-input') === null,
  )
}

describe('ChatPanel — accessibility', () => {
  it('moves focus into the queued-message editor when it opens', async () => {
    const container = await renderChatPanel([QUEUED_MESSAGE])
    const edit = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>('button[title="Edit"]')
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })
    edit.click()

    const editor = await vi.waitFor(() => {
      const element = queuedEditor(container)
      expect(element).not.toBeUndefined()
      return element as HTMLTextAreaElement
    })
    expect(editor.defaultValue).toBe('queued message')
    await vi.waitFor(() => expect(document.activeElement).toBe(editor))
  })

  it('names the queued-message editor textarea with an aria-label', async () => {
    const container = await renderChatPanel([QUEUED_MESSAGE])
    const edit = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>('button[title="Edit"]')
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })
    edit.click()

    const editor = await vi.waitFor(() => {
      const element = queuedEditor(container)
      expect(element).not.toBeUndefined()
      return element as HTMLTextAreaElement
    })
    expect(editor.getAttribute('aria-label')).toBe('Edit queued message')
  })

  it('names the team-only badge as an image', async () => {
    const container = await renderChatPanel([TEAM_NOTE_MESSAGE])
    const badge = await vi.waitFor(() => {
      const element = container.querySelector<HTMLElement>('[data-mol-id="chat-team-only-badge"]')
      expect(element).not.toBeNull()
      return element as HTMLElement
    })
    expect(badge.getAttribute('role')).toBe('img')
    expect(badge.getAttribute('aria-label')).toBe(
      'Team only — visible to your team; Synthase will ignore it',
    )
    expect(badge.getAttribute('title')).toBe(
      'Team only — visible to your team; Synthase will ignore it',
    )
  })

  it('focuses the conversation search field when the picker opens', async () => {
    const container = await renderChatPanel()
    const picker = await vi.waitFor(() => {
      const element = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Chat history'),
      )
      expect(element).not.toBeUndefined()
      return element as HTMLButtonElement
    })
    picker.click()

    const search = await vi.waitFor(() => {
      const element = container.querySelector<HTMLInputElement>(
        'input[placeholder="Search conversations…"]',
      )
      expect(element).not.toBeNull()
      return element as HTMLInputElement
    })
    await vi.waitFor(() => expect(document.activeElement).toBe(search))
  })

  it('names the panel overlay as a dialog and closes it on Escape from inside', async () => {
    const container = await renderChatPanel()
    submit(container, '/settings')

    await vi.waitFor(() => {
      expect(container.querySelector('[role="dialog"][aria-label="Settings"]')).not.toBeNull()
    })
    // Escape from a field INSIDE the overlay (not the overlay itself) closes it.
    const escapeTarget = container.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="Settings"] input, [role="dialog"][aria-label="Settings"] button',
    )
    const target = escapeTarget ?? document.body
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await vi.waitFor(() => {
      expect(container.querySelector('[role="dialog"][aria-label="Settings"]')).toBeNull()
    })
  })
})
