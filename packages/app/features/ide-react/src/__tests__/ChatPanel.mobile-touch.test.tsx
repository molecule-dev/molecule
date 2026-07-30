// @vitest-environment jsdom

/**
 * Mobile/touch wiring guard for the shared chat UI.
 *
 * The chat components style themselves with inline values (no stylesheets in
 * this package), so phone/touch behavior is expressed by branching on the
 * viewport hooks ({@link useNarrowViewport} / {@link useCoarsePointer}) rather
 * than `@media` rules. This suite mounts the REAL components under a stubbed
 * `matchMedia` and asserts the branches that matter at 390px / on touch:
 *
 * - composer textarea + ask_user free-text input render ≥16px on narrow/coarse
 *   (below 16px iOS Safari zooms the page on focus),
 * - composer icon buttons grow to the 40px touch floor on coarse,
 * - hover-revealed undo/revert controls rest visible (0.6) with a 32px hit box
 *   on coarse (hover does not exist on touch),
 * - ask_user option rows meet the 44px standalone floor on coarse,
 * - the finalized markdown wrapper breaks long tokens (wordBreak),
 * - the streaming metrics yield to the activity label on narrow,
 *
 * and — just as load-bearing — that NONE of it changes fine-pointer desktop
 * rendering (the queries simply don't match).
 *
 * @module
 */

import { render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  ChatProvider as ChatContextProvider,
  HttpProvider,
  I18nProvider,
  resetChatStoresForTests,
  ThemeProvider,
} from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'
import { MarkdownContent } from '../components/MarkdownContent.js'
import { StreamingIndicator } from '../components/StreamingIndicator.js'
import { ToolCallCard } from '../components/ToolCallCard.js'
import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '../hooks/useViewport.js'

/**
 * Stub `window.matchMedia` so exactly the given queries match. The viewport
 * hooks read `matches` synchronously on mount, so this must run before render.
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
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

/** Stub a phone: narrow viewport AND coarse primary pointer. */
function stubPhone(): void {
  stubMatchMedia([NARROW_VIEWPORT_QUERY, COARSE_POINTER_QUERY])
}

/** Stub a desktop: neither query matches. */
function stubDesktop(): void {
  stubMatchMedia([])
}

/** History with one seeded system card (for the notice-card action assertion). */
function buildChatProvider(history: ChatMessage[] = []): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
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
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  }
}

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

/** Wrap children with the i18n + theme (+ http/chat, when given) contexts. */
function wrap(children: ReactNode, opts?: { chat?: ChatProvider }): ReactElement {
  const inner = opts?.chat ? (
    <HttpProvider client={buildHttpClient()}>
      <ChatContextProvider provider={opts.chat}>{children}</ChatContextProvider>
    </HttpProvider>
  ) : (
    children
  )
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>{inner}</ThemeProvider>
    </I18nProvider>
  )
}

/** Render the full ChatPanel (composer + timeline) and wait for the composer. */
async function renderChatPanel(): Promise<HTMLElement> {
  const { container } = render(
    wrap(<ChatPanel projectId="proj-touch" agentName="Synthase" />, {
      chat: buildChatProvider(),
    }),
  )
  await waitFor(() => {
    expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
  })
  return container
}

/** Render an awaiting ask_user card (options + free text). */
function renderAskUser(): HTMLElement {
  return render(
    wrap(
      <ToolCallCard
        id="tc-ask"
        name="ask_user"
        input={{ question: 'Which stack?', options: ['React', 'Vue'], allowFreeText: true }}
        output={{ status: 'awaiting_response' }}
        status="success"
        onAskUserResponse={() => {}}
      />,
    ),
  ).container
}

/** Render an edit_file card whose undo affordance is available. */
function renderRevertibleEdit(): HTMLElement {
  return render(
    wrap(
      <ToolCallCard
        id="tc-edit"
        name="edit_file"
        input={{ path: 'src/app.ts', replacements: [{ old_string: 'a', new_string: 'b' }] }}
        output={{ replacementsApplied: 1 }}
        status="success"
        fileDiff={{ original: 'a', modified: 'b' }}
        onFileRevert={async () => {}}
      />,
    ),
  ).container
}

beforeEach(() => {
  stubDesktop()
  setClassMap(classMap)
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
  document.body.innerHTML = ''
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
    // 40px wide preserves horizontal hit spacing; 32px tall (the dense-row
    // touch floor) keeps the composer row from ballooning vertically —
    // user feedback: the 40px-tall boxes made the composer too bulky.
    stubPhone()
    const container = await renderChatPanel()
    for (const title of ['Attach file', 'Reference a file', 'Slash commands']) {
      const btn = container.querySelector(`button[title="${title}"]`) as HTMLElement
      expect(btn, `${title} button renders`).not.toBeNull()
      expect(btn.style.width, `${title} width`).toBe('40px')
      expect(btn.style.height, `${title} height`).toBe('32px')
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
    const container = renderAskUser()
    for (const i of [0, 1]) {
      const row = container.querySelector(`[data-mol-id="ask-user-option-${i}"]`) as HTMLElement
      expect(row, `option ${i} renders`).not.toBeNull()
      expect(row.style.minHeight).toBe('44px')
    }
  })

  it('renders the free-text input at 16px and its Send at 40px on phones', () => {
    stubPhone()
    const container = renderAskUser()
    const input = container.querySelector('input[type="text"]') as HTMLElement
    expect(input.style.fontSize).toBe('16px')
    const send = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Send',
    ) as HTMLElement
    expect(send.style.height).toBe('40px')
  })

  it('keeps the compact desktop card on fine pointers', () => {
    const container = renderAskUser()
    const row = container.querySelector('[data-mol-id="ask-user-option-0"]') as HTMLElement
    expect(row.style.minHeight).toBe('')
    const input = container.querySelector('input[type="text"]') as HTMLElement
    expect(input.style.fontSize).toBe('12px')
  })
})

describe('hover-revealed undo control (ToolCallCard) — phone/touch', () => {
  it('rests visible (0.6) with a 32px hit box on coarse — hover does not exist', () => {
    stubPhone()
    const container = renderRevertibleEdit()
    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo, 'undo affordance renders').not.toBeNull()
    expect(undo.style.opacity).toBe('0.6')
    expect(undo.style.width).toBe('32px')
    expect(undo.style.height).toBe('32px')
  })

  it('stays hover-revealed (hidden at rest, 20px) on fine pointers', () => {
    const container = renderRevertibleEdit()
    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo.style.opacity).toBe('0')
    expect(undo.style.width).toBe('20px')
    expect(undo.style.height).toBe('20px')
  })
})

describe('MarkdownContent — finalized wrapper', () => {
  it('breaks long unbroken tokens so they cannot clip a 390px pane', () => {
    const { container } = render(
      wrap(<MarkdownContent text="a-very-long-unbroken-token" isStreaming={false} />),
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.wordBreak).toBe('break-word')
  })
})

describe('StreamingIndicator — narrow metrics', () => {
  it('drops the token estimate on narrow viewports; the elapsed timer stays', () => {
    stubMatchMedia([NARROW_VIEWPORT_QUERY])
    const { container } = render(
      wrap(
        <StreamingIndicator label="Reading src/App.tsx" startedAt={Date.now()} tokens={40_500} />,
      ),
    )
    const text = container.textContent ?? ''
    expect(text).not.toContain('tokens')
    expect(text).toContain('Reading src/App.tsx')
    // The live elapsed readout (starts at 0.0s) still renders.
    expect(text).toMatch(/\d+\.\d+s/)
  })

  it('keeps the token estimate on desktop widths', () => {
    const { container } = render(
      wrap(
        <StreamingIndicator label="Reading src/App.tsx" startedAt={Date.now()} tokens={40_500} />,
      ),
    )
    expect(container.textContent ?? '').toContain('~40.5k tokens')
  })
})
