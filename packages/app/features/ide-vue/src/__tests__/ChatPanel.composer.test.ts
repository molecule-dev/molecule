// @vitest-environment jsdom
/**
 * The composer core — `chat:composer`, `chat:input` and the input container
 * section of the Vue ChatPanel port.
 *
 * The React panel's textarea is uncontrolled: `inputRef` holds the live text,
 * `defaultValue` only seeds the element, and the send button's `disabled` flag
 * follows whether the composer holds sendable content. These cases exercise
 * that contract through the real mounted panel (the same harness the other
 * ChatPanel ports' tests use), plus the draft persistence and the viewer
 * composer's `/teamsay ` prefill.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue/chat'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

/**
 * A style value as this DOM serializes it once React's style object writes it (jsdom 31 writes
 * `8px 8px 0 0` as `8px 8px 0px 0px`, and a bare `background: transparent` as `none`).
 *
 * @param property - The CSS property, kebab-case.
 * @param value - The value React writes.
 * @returns The serialized value.
 */
function asDom(property: string, value: string): string {
  const probe = document.createElement('div')
  probe.style.setProperty(property, value)
  return probe.style.getPropertyValue(property)
}

/** One recorded PATCH call. */
interface PatchCall {
  /** The requested path. */
  path: string
  /** The request body. */
  body: unknown
}

/**
 * An {@link HttpClient} whose PATCHes are recorded and whose other requests
 * reject.
 *
 * @param patchCalls - Sink for recorded PATCH calls.
 * @returns The client.
 */
function buildRecordingHttpClient(patchCalls: PatchCall[]): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: async (path: string, body: unknown): Promise<HttpResponse<never>> => {
      patchCalls.push({ path, body })
      return responseOf({})
    },
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Waits for the panel's composer textarea to mount.
 *
 * @param container - The mount container.
 * @returns The textarea.
 */
async function waitForTextarea(container: HTMLElement): Promise<HTMLTextAreaElement> {
  return (await vi.waitFor(() => {
    const el = container.querySelector('[data-mol-chat-input]')
    if (!el) throw new Error('composer textarea not mounted')
    return el
  })) as HTMLTextAreaElement
}

/**
 * Types a value into the textarea the way a keystroke does (the native `input`
 * event React's `onChange` is wired to).
 *
 * @param textarea - The mounted textarea.
 * @param value - The value to write.
 */
function typeInto(textarea: HTMLTextAreaElement, value: string): void {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * The composer container.
 *
 * @param container - The mount container.
 * @returns The container element.
 */
function composerOf(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-mol-id="chat-composer"]')
  if (!el) throw new Error('composer container not mounted')
  return el
}

/**
 * The send button.
 *
 * @param container - The mount container.
 * @returns The button element.
 */
function sendButton(container: HTMLElement): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>('[data-mol-id="chat-send-button"]')
  if (!el) throw new Error('send button not mounted')
  return el
}

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

describe('ChatPanel composer — the uncontrolled textarea and its container', () => {
  it("renders the container and textarea with React's attributes and styles", async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-1',
    })
    const container = mounted.container
    const textarea = await waitForTextarea(container)
    const composer = composerOf(container)
    const cm = getClassMap()

    // The container is the user-message card surface, a presentation element
    // (it only forwards clicks to its textarea), flush at the panel's bottom.
    expect(composer.className).toBe(cm.surfaceSecondary)
    expect(composer.getAttribute('role')).toBe('presentation')
    expect(composer.hasAttribute('data-mol-viewer')).toBe(false)
    expect(composer.hasAttribute('hidden')).toBe(false)
    expect(composer.style.borderRadius).toBe(asDom('border-radius', '8px 8px 0 0'))
    expect(composer.style.padding).toBe('8px 10px')
    expect(composer.style.cursor).toBe('text')

    // The textarea: React's own attributes, an uncontrolled value, and the
    // inline styles React writes (Vue needs the explicit px units).
    expect(textarea.className).toBe(cm.textSize('sm'))
    expect(textarea.getAttribute('data-mol-chat-input')).toBe('')
    expect(textarea.getAttribute('aria-label')).toBe('Write a message')
    expect(textarea.getAttribute('placeholder')).toBe('Send a message...')
    expect(textarea.getAttribute('autocomplete')).toBe('off')
    expect(textarea.getAttribute('rows')).toBe('1')
    expect(textarea.rows).toBe(1)
    expect(textarea.style.width).toBe('100%')
    expect(textarea.style.display).toBe('block')
    expect(textarea.style.padding).toBe('0px')
    expect(textarea.style.resize).toBe('none')
    expect(textarea.style.outline).toBe(asDom('outline', 'none'))
    // jsdom serializes the `border: none` shorthand as `border: medium`, so
    // assert the longhand the shorthand sets (both frameworks write the same
    // declaration through the same CSSStyleDeclaration).
    expect(textarea.style.borderStyle).toBe('none')
    expect(textarea.style.background).toBe(asDom('background', 'transparent'))
    expect(textarea.style.overflowY).toBe('auto')
    expect(textarea.style.boxSizing).toBe('border-box')
    // Fine pointer, wide viewport: no iOS-zoom override.
    expect(textarea.style.fontSize).toBe('')
  })

  it('seeds the textarea from the persisted draft and from initialInputValue', async () => {
    sessionStorage.setItem('mol-chat-draft:proj-composer-2', 'restored draft')
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-2',
    })
    let textarea = await waitForTextarea(mounted.container)
    expect(textarea.value).toBe('restored draft')
    // The persisted draft is sendable content, so Send is live at mount.
    expect(sendButton(mounted.container).disabled).toBe(false)
    mounted.unmount()

    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-2b',
      props: { initialInputValue: 'from the prompt' },
    })
    textarea = await waitForTextarea(mounted.container)
    expect(textarea.value).toBe('from the prompt')
  })

  it('enables Send only while the composer holds text, and clears the draft when emptied', async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-3',
    })
    const container = mounted.container
    const textarea = await waitForTextarea(container)
    expect(textarea.value).toBe('')
    expect(sendButton(container).disabled).toBe(true)

    typeInto(textarea, 'hello')
    await flush()
    // The live text is the ref's, not a controlled binding: the element keeps
    // what the keystroke wrote and the ref carries the same value.
    expect(textarea.value).toBe('hello')
    expect(sendButton(container).disabled).toBe(false)

    // Whitespace-only is not sendable content.
    typeInto(textarea, '   ')
    await flush()
    expect(sendButton(container).disabled).toBe(true)

    typeInto(textarea, '')
    await flush()
    expect(sendButton(container).disabled).toBe(true)
  })

  it('drives the handler from a native change, but not twice for the value it already saw', () => {
    vi.useFakeTimers()
    try {
      mounted = mountPanel({
        http: buildRejectingHttpClient(),
        chat: buildChatProvider([]),
        projectId: 'proj-composer-3b',
      })
      const textarea = mounted.container.querySelector('[data-mol-chat-input]')
      expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
      const field = textarea as HTMLTextAreaElement
      const key = 'mol-chat-draft:proj-composer-3b'

      // A native `change` React's onChange also answers (its tracker had not
      // seen the value): the draft debounce starts.
      field.value = 'first'
      field.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(300)
      // The same value again on `change` is a no-op — React's tracker skips it,
      // so the 500 ms debounce is NOT restarted.
      field.dispatchEvent(new Event('change', { bubbles: true }))
      vi.advanceTimersByTime(250)
      expect(sessionStorage.getItem(key)).toBe('first')

      // A change the tracker has not seen runs the handler and defers the write.
      field.value = 'second'
      field.dispatchEvent(new Event('change', { bubbles: true }))
      vi.advanceTimersByTime(250)
      expect(sessionStorage.getItem(key)).toBe('first')
      vi.advanceTimersByTime(250)
      expect(sessionStorage.getItem(key)).toBe('second')
    } finally {
      vi.useRealTimers()
    }
  })

  it('persists the typed draft after the debounce and drops it when emptied', async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-4',
    })
    const container = mounted.container
    const textarea = await waitForTextarea(container)

    typeInto(textarea, 'a draft to keep')
    await new Promise((resolve) => setTimeout(resolve, 650))
    expect(sessionStorage.getItem('mol-chat-draft:proj-composer-4')).toBe('a draft to keep')

    typeInto(textarea, '')
    await new Promise((resolve) => setTimeout(resolve, 650))
    expect(sessionStorage.getItem('mol-chat-draft:proj-composer-4')).toBeNull()
  })

  it("prefills a viewer's composer with /teamsay and keeps the bare prefix un-sendable", async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-5',
      props: { canEdit: false },
    })
    const container = mounted.container
    const textarea = await waitForTextarea(container)
    await vi.waitFor(() => expect(textarea.value).toBe('/teamsay '))

    const composer = composerOf(container)
    expect(composer.hasAttribute('data-mol-viewer')).toBe(true)
    // View-only: the team-chat gold border, and the viewer placeholder.
    expect(composer.style.border).toBe('1px solid rgb(224, 161, 0)')
    expect(textarea.getAttribute('placeholder')).toBe('Message your team')
    // The bare prefix is not sendable content.
    expect(sendButton(container).disabled).toBe(true)

    // Viewers keep the mic and the / shortcut, but lose @, attachments and the
    // mode toggle (all of them feed Synthase turns).
    expect(container.querySelector('[data-mol-id="chat-mic-button"]')).not.toBeNull()
    expect(container.querySelector('button[title="Slash commands"]')).not.toBeNull()
    expect(container.querySelector('button[title="Reference a file"]')).toBeNull()
    expect(container.querySelector('button[title="Attach file"]')).toBeNull()
    expect(container.querySelector('button[title="Switch to plan mode"]')).toBeNull()
  })

  it('toggles plan mode through the conversation chat-mode PATCH', async () => {
    const patchCalls: PatchCall[] = []
    mounted = mountPanel({
      http: buildRecordingHttpClient(patchCalls),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-6',
    })
    const container = mounted.container
    await waitForTextarea(container)

    const toggle = (await vi.waitFor(() => {
      const el = container.querySelector<HTMLButtonElement>('button[title="Switch to plan mode"]')
      if (!el) throw new Error('mode toggle not rendered')
      return el
    })) as HTMLButtonElement
    // Execute is the live mode: the toggle is dimmed until hovered, and plan
    // mode is what a click switches to.
    expect(toggle.style.opacity).toBe('0.4')
    toggle.click()

    await vi.waitFor(() =>
      expect(patchCalls).toContainEqual({
        path: '/projects/proj-composer-6/chat-mode',
        body: { mode: 'plan', conversationId: null },
      }),
    )
    // The local mode follows at once: the toggle now offers the way back, in
    // the plan-mode (light-theme) amber.
    await vi.waitFor(() => {
      const back = container.querySelector<HTMLButtonElement>(
        'button[title="Switch to execute mode"]',
      )
      if (!back) throw new Error('plan-mode toggle not rendered')
      expect(back.style.color).toBe('rgb(217, 119, 6)')
      expect(back.style.opacity).toBe('1')
    })
  })

  it('omits the fast-mode toggle when the current model does not offer it', async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([]),
      projectId: 'proj-composer-7',
    })
    const container = mounted.container
    await waitForTextarea(container)
    expect(container.querySelector('[data-mol-id="chat-fast-mode-toggle"]')).toBeNull()
    // The mic button is ALWAYS rendered, whatever dictation support exists.
    expect(container.querySelector('[data-mol-id="chat-mic-button"]')).not.toBeNull()
  })
})
