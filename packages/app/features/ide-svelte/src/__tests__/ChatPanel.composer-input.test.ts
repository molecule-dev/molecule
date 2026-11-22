// @vitest-environment jsdom
/**
 * The chat composer's core and its input handling: the draft it mounts with
 * and persists, the send button's gate, the viewer's `/teamsay ` prefill, and
 * the input container's hint row (which icon buttons a viewer sees, the
 * plan/execute toggle's persisted request, and the container's focus target).
 *
 * The Svelte counterparts of React's `chat:composer` and `chat:input` regions
 * and its input-container section render inside the real `ChatPanel`; cases
 * that parse the composer text into a picker (`/model`, `/effort`, `/`, `@`)
 * need the picker sections another unit ports, so they are out of scope here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatPanelProps } from '../props.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

/** The panel's project, and the draft key it derives. */
const PROJECT_ID = 'proj-test'
const DRAFT_KEY = `mol-chat-draft:${PROJECT_ID}`

/** The composer selectors. */
const COMPOSER = '[data-mol-id="chat-composer"]'
const INPUT = 'textarea[data-mol-chat-input]'
const SEND = '[data-mol-id="chat-send-button"]'
const MIC = '[data-mol-id="chat-mic-button"]'
const ATTACH = '[title="Attach file"]'
const MENTION = '[title="Reference a file"]'
const SLASH = '[title="Slash commands"]'
/** The plan/execute toggle, titled for the mode a click would switch TO (the session opens in execute). */
const PLAN_TOGGLE = '[title="Switch to plan mode"]'

/** One recorded HTTP request. */
interface RecordedRequest {
  /** The method, uppercased. */
  method: string
  /** The requested path. */
  url: string
  /** The request body, when the method carries one. */
  body?: unknown
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * An HTTP client that rejects every request except the ones a test records.
 *
 * @param requests - Receives every recorded request.
 * @returns The client.
 */
function recordingHttp(requests: RecordedRequest[]): HttpClient {
  const base = buildRejectingHttpClient()
  return {
    ...base,
    patch: async <T = unknown>(url: string, body?: unknown): Promise<HttpResponse<T>> => {
      requests.push({ method: 'PATCH', url, body })
      return responseOf({}) as HttpResponse<T>
    },
  }
}

/**
 * Installs a fresh sessionStorage, optionally seeded with the composer draft.
 *
 * @param draft - The persisted draft to start from, when any.
 */
function installStorage(draft?: string): void {
  const storage = makeStorage()
  if (draft !== undefined) storage.setItem(DRAFT_KEY, draft)
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: storage,
    configurable: true,
    writable: true,
  })
}

/**
 * Types a value into the composer the way a keystroke does.
 *
 * @param container - The mount container.
 * @param value - The composer's new text.
 * @returns The textarea.
 */
function typeInto(container: HTMLElement, value: string): HTMLTextAreaElement {
  const input = container.querySelector<HTMLTextAreaElement>(INPUT)
  if (!input) throw new Error('composer input not found')
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
  return input
}

/**
 * Mounts the panel.
 *
 * @param props - The panel props that differ from the defaults.
 * @param requests - Receives every recorded request.
 * @returns The mount container.
 */
function mountChatPanel(
  props: Partial<ChatPanelProps> = {},
  requests: RecordedRequest[] = [],
): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: recordingHttp(requests),
    chat: buildChatProvider([]),
    props: { projectId: PROJECT_ID, ...props },
  })
  return mounted.container
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  resetChatStoresForTests()
  installStorage()
  Object.defineProperty(globalThis, 'localStorage', {
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

describe('ChatPanel composer core', () => {
  it('restores a draft saved in session storage and lights send', () => {
    installStorage('a half-written message')
    const container = mountChatPanel()

    const input = container.querySelector<HTMLTextAreaElement>(INPUT)
    expect(input?.value).toBe('a half-written message')
    expect(container.querySelector<HTMLButtonElement>(SEND)?.disabled).toBe(false)
  })

  it("prefers the host's initial value over the persisted draft", () => {
    installStorage('stale draft')
    const container = mountChatPanel({ initialInputValue: 'from the hero' })

    expect(container.querySelector<HTMLTextAreaElement>(INPUT)?.value).toBe('from the hero')
    expect(container.querySelector<HTMLButtonElement>(SEND)?.disabled).toBe(false)
  })

  it('keeps send disabled while the composer is blank', () => {
    const container = mountChatPanel()

    expect(container.querySelector<HTMLTextAreaElement>(INPUT)?.value).toBe('')
    expect(container.querySelector<HTMLButtonElement>(SEND)?.disabled).toBe(true)
  })

  it('persists a typed draft after the debounce and drops it when cleared', async () => {
    const container = mountChatPanel()

    typeInto(container, 'draft text')
    await vi.waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).toBe('draft text'))

    typeInto(container, '')
    await vi.waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull())
  })

  it('gates send on non-blank text, so whitespace alone does not light it', () => {
    const container = mountChatPanel()

    typeInto(container, '   ')
    expect(container.querySelector<HTMLButtonElement>(SEND)?.disabled).toBe(true)

    typeInto(container, 'x')
    expect(container.querySelector<HTMLButtonElement>(SEND)?.disabled).toBe(false)
  })

  it('focuses the input on mount and puts the caret at the end of the draft', () => {
    installStorage('hello world')
    const container = mountChatPanel()

    const input = container.querySelector<HTMLTextAreaElement>(INPUT)
    if (!input) throw new Error('composer input not found')
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe('hello world'.length)
    expect(input.selectionEnd).toBe('hello world'.length)
  })

  it('focuses the textarea when the container body is clicked', () => {
    const container = mountChatPanel()
    const composer = container.querySelector<HTMLElement>(COMPOSER)
    if (!composer) throw new Error('composer not found')

    composer.click()
    expect(document.activeElement).toBe(container.querySelector(INPUT))
  })

  it('does not steal focus when one of the hint-row buttons is clicked', () => {
    const container = mountChatPanel()
    const input = container.querySelector<HTMLTextAreaElement>(INPUT)
    if (!input) throw new Error('composer input not found')
    input.blur()

    container.querySelector<HTMLButtonElement>(MIC)?.click()
    expect(document.activeElement).not.toBe(input)
  })
})

describe('ChatPanel composer — viewers', () => {
  it("prefills '/teamsay ' and keeps send disabled for the bare prefill", () => {
    const container = mountChatPanel({ canEdit: false })

    const input = container.querySelector<HTMLTextAreaElement>(INPUT)
    expect(input?.value).toBe('/teamsay ')
    expect(container.querySelector<HTMLButtonElement>(SEND)?.disabled).toBe(true)
  })

  it('marks the composer as a viewer box and hides the editor-only affordances', () => {
    const container = mountChatPanel({ canEdit: false })

    const composer = container.querySelector<HTMLElement>(COMPOSER)
    expect(composer?.hasAttribute('data-mol-viewer')).toBe(true)
    expect(container.querySelector(PLAN_TOGGLE)).toBeNull()
    expect(container.querySelector(ATTACH)).toBeNull()
    expect(container.querySelector(MENTION)).toBeNull()
    // Viewers keep the slash shortcut.
    expect(container.querySelector(SLASH)).not.toBeNull()
  })

  it('uses the viewer placeholder', () => {
    mountChatPanel({ canEdit: false })

    const input = document.querySelector<HTMLTextAreaElement>(INPUT)
    expect(input?.getAttribute('placeholder')).toBe('Message your team')
    expect(input?.getAttribute('aria-label')).toBe('Write a message')
  })
})

describe('ChatPanel composer — editor affordances', () => {
  it('shows every composer affordance and the editor placeholder', () => {
    const container = mountChatPanel()

    expect(container.querySelector(PLAN_TOGGLE)).not.toBeNull()
    expect(container.querySelector(MIC)).not.toBeNull()
    expect(container.querySelector(ATTACH)).not.toBeNull()
    expect(container.querySelector(MENTION)).not.toBeNull()
    expect(container.querySelector(SLASH)).not.toBeNull()
    expect(container.querySelector<HTMLElement>(COMPOSER)?.hasAttribute('data-mol-viewer')).toBe(
      false,
    )
    expect(container.querySelector<HTMLTextAreaElement>(INPUT)?.getAttribute('placeholder')).toBe(
      'Send a message...',
    )
  })

  it('persists the plan/execute toggle and flips the composer mode', () => {
    const requests: RecordedRequest[] = []
    const container = mountChatPanel({}, requests)

    container.querySelector<HTMLButtonElement>(PLAN_TOGGLE)?.click()
    flushSync()

    const patch = requests.find((request) => request.method === 'PATCH')
    expect(patch?.url).toBe(`/projects/${PROJECT_ID}/chat-mode`)
    expect(patch?.body).toEqual({ mode: 'plan', conversationId: null })
    // The button now offers the way back: the mode the chat store holds changed.
    expect(container.querySelector('[title="Switch to execute mode"]')).not.toBeNull()
  })
})

describe('ChatPanel composer — transcript-only', () => {
  it('hides the composer for a viewer who cannot send team messages', () => {
    const container = mountChatPanel({ canEdit: false, canSendTeamMessages: false })

    expect(container.querySelector<HTMLElement>(COMPOSER)?.hidden).toBe(true)
  })
})
