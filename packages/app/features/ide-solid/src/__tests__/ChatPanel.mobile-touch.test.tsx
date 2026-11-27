// @vitest-environment jsdom
/**
 * Mobile/touch wiring guard for the shared chat UI.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.mobile-touch.test.tsx`
 * with the same test names and the same assertions. The chat components style
 * themselves with inline values (no stylesheets in this package), so
 * phone/touch behavior is expressed by branching on the viewport hooks
 * ({@link useNarrowViewport} / {@link useCoarsePointer}) rather than `@media`
 * rules. This suite mounts the REAL components under a stubbed `matchMedia` and
 * asserts the branches that matter at 390px / on touch — and, just as
 * load-bearing, that NONE of it changes fine-pointer desktop rendering.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { ToolCallCard } from '../components/ToolCallCard.jsx'
import { MarkdownContent } from '../parts/MarkdownContent.jsx'
import { StreamingIndicator } from '../parts/StreamingIndicator.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * Stub `window.matchMedia` so exactly the given queries match.
 *
 * @param matching - The media queries that should report `matches: true`.
 */
function stubMatchMedia(matching: string[]): void {
  window.matchMedia = ((query: string) =>
    ({
      matches: matching.includes(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia
}

/** Stub a phone: narrow viewport AND coarse primary pointer. */
function stubPhone(): void {
  stubMatchMedia([NARROW_VIEWPORT_QUERY, COARSE_POINTER_QUERY])
}

/** Stub a desktop: neither query matches. */
function stubDesktop(): void {
  stubMatchMedia([])
}

/** A chat provider whose history resolves empty. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/** An HTTP client whose every request rejects; mounted callers catch their own. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: (): void => store.clear(),
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => void store.delete(key),
    setItem: (key: string, value: string): void => void store.set(key, String(value)),
  }
}

/** The mount alive right now. */
const mounted: { dispose?: () => void } = {}

/**
 * Mounts a node inside the theme (+ optional http/chat) contexts.
 *
 * @param node - Builds the element to mount (inside the providers).
 * @param withChat - Whether to include the HTTP/chat providers.
 * @returns The mount container.
 */
function mount(node: () => JSX.Element, withChat = false): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        {withChat ? (
          <HttpContext.Provider value={buildHttpClient()}>
            <ChatContext.Provider value={buildChatProvider()}>{node()}</ChatContext.Provider>
          </HttpContext.Provider>
        ) : (
          node()
        )}
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/** Mounts the full ChatPanel (composer + timeline) and waits for the composer. */
async function renderChatPanel(): Promise<HTMLElement> {
  const container = mount(() => <ChatPanel projectId="proj-touch" agentName="Synthase" />, true)
  await vi.waitFor(() => {
    expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
  })
  return container
}

/** The props an awaiting ask_user card carries. */
const ASK_USER_PROPS = {
  id: 'tc-ask',
  name: 'ask_user',
  input: { question: 'Which stack?', options: ['React', 'Vue'], allowFreeText: true },
  output: { status: 'awaiting_response' },
  status: 'done',
  onAskUserResponse: (): void => {},
} satisfies ToolCallCardProps

/** The props a revertible edit_file card carries. */
const EDIT_PROPS = {
  id: 'tc-edit',
  name: 'edit_file',
  input: { path: 'src/app.ts', replacements: [{ old_string: 'a', new_string: 'b' }] },
  output: { replacementsApplied: 1 },
  status: 'done',
  fileDiff: { original: 'a', modified: 'b' },
  onFileRevert: async (): Promise<void> => {},
} satisfies ToolCallCardProps

beforeEach(() => {
  stubDesktop()
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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

describe('composer (ChatPanel) — phone/touch', () => {
  it('renders the textarea at 16px on phones (iOS focus-zoom guard)', async () => {
    stubPhone()
    const container = await renderChatPanel()
    const textarea = container.querySelector('[data-mol-chat-input]') as HTMLElement
    expect(textarea.style.fontSize).toBe('16px')
  })

  it('keeps the desktop textarea free of the inline override', async () => {
    const container = await renderChatPanel()
    const textarea = container.querySelector('[data-mol-chat-input]') as HTMLElement
    expect(textarea.style.fontSize).toBe('')
  })

  it('grows the composer icon buttons to wide-but-flat 40×32 touch boxes on coarse', async () => {
    stubPhone()
    const container = await renderChatPanel()
    for (const title of ['Attach file', 'Reference a file', 'Slash commands']) {
      const button = container.querySelector(`button[title="${title}"]`) as HTMLElement
      expect(button, `${title} button renders`).not.toBeNull()
      expect(button.style.width, `${title} width`).toBe('40px')
      expect(button.style.height, `${title} height`).toBe('32px')
    }
    const send = container.querySelector('button[title="Send"]') as HTMLElement
    expect(send.style.minHeight).toBe('32px')
    expect(send.style.minWidth).toBe('40px')
  })

  it('keeps the compact 24px icon boxes on fine pointers', async () => {
    const container = await renderChatPanel()
    const attach = container.querySelector('button[title="Attach file"]') as HTMLElement
    expect(attach.style.width).toBe('24px')
    expect(attach.style.height).toBe('24px')
    const send = container.querySelector('button[title="Send"]') as HTMLElement
    expect(send.style.minHeight).toBe('')
  })
})

describe('ask_user discovery card — phone/touch', () => {
  it('gives option rows the 44px standalone floor on coarse', () => {
    stubPhone()
    const container = mount(() => <ToolCallCard {...ASK_USER_PROPS} />)
    for (const index of [0, 1]) {
      const row = container.querySelector(`[data-mol-id="ask-user-option-${index}"]`) as HTMLElement
      expect(row, `option ${index} renders`).not.toBeNull()
      expect(row.style.minHeight).toBe('44px')
    }
  })

  it('renders the free-text input at 16px and its Send on the ClassMap touch floor', () => {
    stubPhone()
    const container = mount(() => <ToolCallCard {...ASK_USER_PROPS} />)
    const input = container.querySelector('input[type="text"]') as HTMLElement
    expect(input.style.fontSize).toBe('16px')
    // The input rides the SAME coarse 36px floor as the Send beside it —
    // resolved from the bond, never written here as a literal class.
    for (const token of classMap.touchTargetCompact.split(/\s+/).filter(Boolean)) {
      expect(input.classList.contains(token), `input carries ${token}`).toBe(true)
    }
    const send = container.querySelector('[data-mol-id="ask-user-free-text-submit"]') as HTMLElement
    for (const token of classMap.touchTargetCompact.split(/\s+/).filter(Boolean)) {
      expect(send.classList.contains(token), `Send carries ${token}`).toBe(true)
    }
    expect(send.style.height, 'no hand-rolled pixel height survives').toBe('')
  })

  it('keeps the compact desktop card on fine pointers', () => {
    const container = mount(() => <ToolCallCard {...ASK_USER_PROPS} />)
    const row = container.querySelector('[data-mol-id="ask-user-option-0"]') as HTMLElement
    expect(row.style.minHeight).toBe('')
    const input = container.querySelector('input[type="text"]') as HTMLElement
    // The field shares the Send button's box: 13px label at the design
    // system's 26px height and 3px radius.
    expect(input.style.fontSize).toBe('13px')
    expect(input.style.height).toBe('26px')
    expect(input.style.borderRadius).toBe('3px')
  })
})

describe('hover-revealed undo control (ToolCallCard) — phone/touch', () => {
  it('rests visible (0.6) with a 32px hit box on coarse — hover does not exist', () => {
    stubPhone()
    const container = mount(() => <ToolCallCard {...EDIT_PROPS} />)
    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo, 'undo affordance renders').not.toBeNull()
    expect(undo.style.opacity).toBe('0.6')
    expect(undo.style.width).toBe('32px')
    expect(undo.style.height).toBe('32px')
  })

  it('stays hover-revealed (hidden at rest, 20px) on fine pointers', () => {
    const container = mount(() => <ToolCallCard {...EDIT_PROPS} />)
    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo.style.opacity).toBe('0')
    expect(undo.style.width).toBe('20px')
    expect(undo.style.height).toBe('20px')
  })
})

describe('MarkdownContent — finalized wrapper', () => {
  it('breaks long unbroken tokens so they cannot clip a 390px pane', () => {
    const container = mount(() => (
      <MarkdownContent text="a-very-long-unbroken-token" isStreaming={false} />
    ))
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.wordBreak).toBe('break-word')
  })
})

describe('StreamingIndicator — narrow metrics', () => {
  it('drops the token estimate on narrow viewports; the elapsed timer stays', () => {
    stubMatchMedia([NARROW_VIEWPORT_QUERY])
    const container = mount(() => (
      <StreamingIndicator label="Reading src/App.tsx" startedAt={Date.now()} tokens={40_500} />
    ))
    const text = container.textContent ?? ''
    expect(text).not.toContain('tokens')
    expect(text).toContain('Reading src/App.tsx')
    // The live elapsed readout (starts at 0.0s) still renders.
    expect(text).toMatch(/\d+\.\d+s/)
  })

  it('keeps the token estimate on desktop widths', () => {
    const container = mount(() => (
      <StreamingIndicator label="Reading src/App.tsx" startedAt={Date.now()} tokens={40_500} />
    ))
    expect(container.textContent ?? '').toContain('~40.5k tokens')
  })
})
