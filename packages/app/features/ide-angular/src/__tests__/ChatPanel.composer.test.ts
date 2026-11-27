// @vitest-environment jsdom
/**
 * Unit P4 of the ChatPanel port: the composer core (`chat:composer`), the
 * textarea's input handling (`chat:input`) and the input container with its
 * hint row and icon buttons.
 *
 * The tests mount the real panel through `chat-panel-harness.ts` and pin what
 * React's own composer tests pin: the draft session storage restores, the
 * debounced persist and the drop-on-empty, the send flag React derives from the
 * text, the host's prefill, the viewer's `/teamsay ` prefill that never lights
 * send, the container click that focuses the textarea, the mode toggle's PATCH
 * and the imperative hover affordances the buttons write straight to
 * `style.opacity`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetChatStoresForTests } from '@molecule/app-angular/chat'
import type { HttpClient } from '@molecule/app-http'
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
  responseOf,
  settle,
} from './chat-panel-harness.js'

/** One request the recording client saw. */
interface RecordedRequest {
  /** The HTTP method. */
  method: string
  /** The request URL. */
  url: string
  /** The request body. */
  body: unknown
}

/** The requests the recording client has seen in the current test. */
let requests: RecordedRequest[] = []

/** The project every test mounts. */
const PROJECT = 'proj-composer'

/** The draft key the composer persists under (`chatDraftStorageKey(PROJECT)`). */
const DRAFT_KEY = `mol-chat-draft:${PROJECT}`

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * An HTTP client that records each request and rejects it, the way the
 * rejecting harness client does (mounted callers catch their own).
 *
 * @returns The recording client.
 */
function buildRecordingHttpClient(): HttpClient {
  const base = buildRejectingHttpClient()
  const patch: HttpClient['patch'] = (url, data) => {
    requests.push({ method: 'PATCH', url, body: data })
    return Promise.reject(new Error('http disabled in test'))
  }
  return { ...base, patch }
}

/**
 * An HTTP client whose `PATCH` succeeds (it records the request), so a toggle
 * that persists its state keeps it instead of reverting on failure.
 *
 * @returns The accepting client.
 */
function buildAcceptingHttpClient(): HttpClient {
  const base = buildRejectingHttpClient()
  const patch: HttpClient['patch'] = (url, data) => {
    requests.push({ method: 'PATCH', url, body: data })
    return Promise.resolve(responseOf({}))
  }
  return { ...base, patch }
}

/**
 * Mounts the real panel for this suite.
 *
 * @param props - Extra panel props.
 * @returns The mounted panel.
 */
async function mountChat(props: Record<string, unknown> = {}): Promise<PanelMount> {
  mounted?.unmount()
  mounted = await mountPanel({
    http: buildRecordingHttpClient(),
    chat: buildChatProvider([]),
    projectId: PROJECT,
    props,
  })
  return mounted
}

/**
 * The composer's textarea.
 *
 * @param container - The mounted container.
 * @returns The textarea element.
 */
function textareaOf(container: HTMLElement): HTMLTextAreaElement {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer textarea not found')
  return input
}

/**
 * The composer's send button.
 *
 * @param container - The mounted container.
 * @returns The button element.
 */
function sendButtonOf(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('[data-mol-id="chat-send-button"]')
  if (!button) throw new Error('send button not found')
  return button
}

/**
 * Types a value into the composer, the way `fireEvent.change` does.
 *
 * @param container - The mounted container.
 * @param text - The exact text.
 */
function changeInput(container: HTMLElement, text: string): void {
  const input = textareaOf(container)
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  requests = []
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
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('ChatPanel composer (P4)', () => {
  it(
    'restores a persisted draft into the textarea and lights send',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      sessionStorage.setItem(DRAFT_KEY, 'Half a plan from yesterday')
      const { container } = await mountChat()
      await settle(mounted)

      expect(textareaOf(container).value).toBe('Half a plan from yesterday')
      expect(sendButtonOf(container).disabled).toBe(false)
    },
  )

  it(
    "seeds the textarea from the host's initial value",
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat({ initialInputValue: 'Build the header first' })
      await settle(mounted)

      expect(textareaOf(container).value).toBe('Build the header first')
      expect(sendButtonOf(container).disabled).toBe(false)
    },
  )

  it(
    'persists the draft to session storage half a second after typing',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat()
      await settle(mounted)

      changeInput(container, 'Build the header first')
      await settle(mounted)
      expect(sendButtonOf(container).disabled).toBe(false)
      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull()

      await new Promise<void>((resolve) => setTimeout(resolve, 550))
      expect(sessionStorage.getItem(DRAFT_KEY)).toBe('Build the header first')
    },
  )

  it(
    'drops the persisted draft when the composer is cleared',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat()
      await settle(mounted)

      changeInput(container, 'Draft to drop')
      await new Promise<void>((resolve) => setTimeout(resolve, 550))
      expect(sessionStorage.getItem(DRAFT_KEY)).toBe('Draft to drop')

      changeInput(container, '')
      await settle(mounted)
      expect(sendButtonOf(container).disabled).toBe(true)
      await new Promise<void>((resolve) => setTimeout(resolve, 550))
      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull()
    },
  )

  it(
    'focuses the textarea when the composer body is clicked',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat()
      await settle(mounted)

      const textarea = textareaOf(container)
      textarea.blur()
      expect(document.activeElement).not.toBe(textarea)

      const composer = container.querySelector<HTMLElement>('[data-mol-id="chat-composer"]')
      if (!composer) throw new Error('composer container not found')
      composer.click()
      expect(document.activeElement).toBe(textarea)
    },
  )

  it(
    "prefills a viewer's composer with /teamsay and keeps send dark",
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat({ canEdit: false })
      await settle(mounted)

      expect(textareaOf(container).value).toBe('/teamsay ')
      expect(sendButtonOf(container).disabled).toBe(true)
      expect(
        container.querySelector('[data-mol-id="chat-composer"]')?.getAttribute('data-mol-viewer'),
      ).toBe('')
    },
  )

  it('hides the composer for a public transcript', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const { container } = await mountChat({ canEdit: false, canSendTeamMessages: false })
    await settle(mounted)

    const composer = container.querySelector('[data-mol-id="chat-composer"]')
    expect(composer?.hasAttribute('hidden')).toBe(true)
    expect(textareaOf(container).value).toBe('')
  })

  it(
    'persists the mode toggle with the open conversation',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat()
      await settle(mounted)

      const modeButton = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-composer"] button',
      )
      if (!modeButton) throw new Error('mode toggle not found')
      expect(modeButton.getAttribute('title')).toBe('Switch to plan mode')
      modeButton.click()
      await settle(mounted)

      expect(requests).toContainEqual({
        method: 'PATCH',
        url: `/projects/${PROJECT}/chat-mode`,
        body: { mode: 'plan', conversationId: null },
      })
    },
  )

  it(
    'brightens the mic button on hover and restores it on leave',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat()
      await settle(mounted)

      const mic = container.querySelector<HTMLElement>('[data-mol-id="chat-mic-button"]')
      if (!mic) throw new Error('mic button not found')
      expect(mic.style.opacity).toBe('0.4')
      mic.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
      expect(mic.style.opacity).toBe('0.85')
      mic.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
      expect(mic.style.opacity).toBe('0.4')
    },
  )

  it(
    'renders the React composer shell and textarea attributes',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const { container } = await mountChat()
      await settle(mounted)

      const composer = container.querySelector('[data-mol-id="chat-composer"]')
      expect(composer?.getAttribute('role')).toBe('presentation')
      expect(composer?.hasAttribute('hidden')).toBe(false)
      expect(composer?.hasAttribute('data-mol-viewer')).toBe(false)

      const textarea = textareaOf(container)
      expect(textarea.getAttribute('aria-label')).toBe('Write a message')
      expect(textarea.getAttribute('placeholder')).toBe('Send a message...')
      expect(textarea.getAttribute('autocomplete')).toBe('off')
      expect(textarea.getAttribute('rows')).toBe('1')
      expect(textarea.getAttribute('class')).toBe(classMap.textSize('sm'))
    },
  )

  it(
    'paints the amber plan chip once the mode switch persists',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      mounted?.unmount()
      mounted = await mountPanel({
        http: buildAcceptingHttpClient(),
        chat: buildChatProvider([]),
        projectId: PROJECT,
      })
      await settle(mounted)

      const modeButton = mounted.container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-composer"] button',
      )
      if (!modeButton) throw new Error('mode toggle not found')
      modeButton.click()
      await settle(mounted)

      expect(modeButton.getAttribute('title')).toBe('Switch to execute mode')
      expect(modeButton.style.background).toBe('rgba(217, 119, 6, 0.14)')
      expect(modeButton.style.border).toContain('1px solid rgba(217, 119, 6, 0.55)')
      expect(modeButton.style.color).toBe('rgb(217, 119, 6)')
      expect(modeButton.style.opacity).toBe('1')
    },
  )
})
