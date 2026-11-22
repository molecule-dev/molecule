// @vitest-environment jsdom
/**
 * Mobile/touch wiring guard for the shared chat UI.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ChatPanel.mobile-touch.test.tsx`
 * with the same test names and the same assertions: the chat components style
 * themselves with inline values (no stylesheets in this package), so
 * phone/touch behavior is expressed by branching on the viewport hooks
 * (`useNarrowViewport` / `useCoarsePointer`) rather than `@media` rules. This
 * suite mounts the REAL components under a stubbed `matchMedia` and asserts the
 * branches that matter at 390px / on touch — and, just as load-bearing, that
 * NONE of it changes fine-pointer desktop rendering.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, tick, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import MarkdownContent from '../parts/MarkdownContent.svelte'
import StreamingIndicator from '../parts/StreamingIndicator.svelte'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'
import ToolCallCardHost from './ToolCallCardHost.svelte'

/**
 * A `MediaQueryList` whose `matches` is fixed — what the stubbed
 * `window.matchMedia` hands back, so the viewport hooks read it on init.
 */
class StubMediaQueryList extends EventTarget implements MediaQueryList {
  readonly matches: boolean
  readonly media: string
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null

  /**
   * @param query - The media query string.
   * @param matches - Whether it reports as matching.
   */
  constructor(query: string, matches: boolean) {
    super()
    this.media = query
    this.matches = matches
  }

  /**
   * Legacy listener registration (unused by the hooks, present for the type).
   * @param _callback - The listener.
   */
  addListener(_callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null): void {}

  /**
   * Legacy listener removal (unused by the hooks, present for the type).
   * @param _callback - The listener.
   */
  removeListener(
    _callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null,
  ): void {}
}

/**
 * Stub `window.matchMedia` so exactly the given queries match.
 *
 * @param matching - The media queries that should report `matches: true`.
 */
function stubMatchMedia(matching: string[]): void {
  window.matchMedia = (query: string): MediaQueryList =>
    new StubMediaQueryList(query, matching.includes(query))
}

/** Stub a phone: narrow viewport AND coarse primary pointer. */
function stubPhone(): void {
  stubMatchMedia([NARROW_VIEWPORT_QUERY, COARSE_POINTER_QUERY])
}

/** Stub a desktop: neither query matches. */
function stubDesktop(): void {
  stubMatchMedia([])
}

/** One standalone mount torn down after each test. */
interface StandaloneMount {
  /** The live component instance. */
  instance: Record<string, unknown>
  /** The element it mounted into. */
  container: HTMLElement
}

/** The standalone mounts alive right now. */
const standalone: StandaloneMount[] = []

/**
 * Mounts one component with the i18n + theme contexts it may read.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The container it mounted into.
 */
function mountNode(component: never, props: Record<string, unknown>): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(component, { target: container, props })
  flushSync()
  standalone.push({ instance: instance as Record<string, unknown>, container })
  return container
}

/** The panel mount alive right now, if any. */
let panel: PanelMount | null = null

/**
 * Renders the full ChatPanel (composer + timeline) and waits for the composer.
 *
 * @returns The mount container.
 */
async function renderChatPanel(): Promise<HTMLElement> {
  panel?.unmount()
  panel = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider([]),
    projectId: 'proj-touch',
    props: { agentName: 'Synthase' },
  })
  await waitFor(() => {
    expect(panel?.container.querySelector('[data-mol-chat-input]')).not.toBeNull()
  })
  return panel.container
}

/**
 * Renders an awaiting ask_user card (options + free text).
 *
 * @returns The mount container.
 */
function renderAskUser(): HTMLElement {
  return mountNode(ToolCallCardHost as never, {
    theme: buildThemeProvider(),
    id: 'tc-ask',
    name: 'ask_user',
    input: { question: 'Which stack?', options: ['React', 'Vue'], allowFreeText: true },
    output: { status: 'awaiting_response' },
    status: 'done',
    onAskUserResponse: () => {},
  })
}

/**
 * Renders an edit_file card whose undo affordance is available.
 *
 * @returns The mount container.
 */
function renderRevertibleEdit(): HTMLElement {
  return mountNode(ToolCallCardHost as never, {
    theme: buildThemeProvider(),
    id: 'tc-edit',
    name: 'edit_file',
    input: { path: 'src/app.ts', replacements: [{ old_string: 'a', new_string: 'b' }] },
    output: { replacementsApplied: 1 },
    status: 'done',
    fileDiff: { original: 'a', modified: 'b' },
    onFileRevert: async () => {},
  })
}

/**
 * Lets a queued render flush and resolves on the next macrotask.
 *
 * @returns A promise resolved after the flush.
 */
async function settle(): Promise<void> {
  await tick()
  flushSync()
}

/**
 * Polls `predicate` until it stops throwing.
 *
 * @param predicate - The assertion to retry.
 * @param timeout - How long to keep trying, in ms.
 * @returns A promise resolved once the predicate passes.
 */
async function waitFor(predicate: () => void, timeout = 1500): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      predicate()
      return
    } catch (error) {
      if (Date.now() - started > timeout) throw error
      await new Promise((resolve) => setTimeout(resolve, 10))
      await settle()
    }
  }
}

beforeEach(() => {
  stubDesktop()
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
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

afterEach(async () => {
  for (const { instance, container } of standalone.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  panel?.unmount()
  panel = null
  document.body.innerHTML = ''
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
    // 40px wide preserves horizontal hit spacing; 32px tall (the dense-row
    // touch floor) keeps the composer row from ballooning vertically.
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

  it('renders the free-text input at 16px and its Send on the ClassMap touch floor', () => {
    stubPhone()
    const container = renderAskUser()
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
    const container = renderAskUser()
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
    const container = mountNode(MarkdownContent as never, {
      text: 'a-very-long-unbroken-token',
      isStreaming: false,
    })
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.wordBreak).toBe('break-word')
  })
})

describe('StreamingIndicator — narrow metrics', () => {
  it('drops the token estimate on narrow viewports; the elapsed timer stays', () => {
    stubMatchMedia([NARROW_VIEWPORT_QUERY])
    const container = mountNode(StreamingIndicator as never, {
      label: 'Reading src/App.tsx',
      startedAt: Date.now(),
      tokens: 40_500,
    })
    const text = container.textContent ?? ''
    expect(text).not.toContain('tokens')
    expect(text).toContain('Reading src/App.tsx')
    // The live elapsed readout (starts at 0.0s) still renders.
    expect(text).toMatch(/\d+\.\d+s/)
  })

  it('keeps the token estimate on desktop widths', () => {
    const container = mountNode(StreamingIndicator as never, {
      label: 'Reading src/App.tsx',
      startedAt: Date.now(),
      tokens: 40_500,
    })
    expect(container.textContent ?? '').toContain('~40.5k tokens')
  })
})
