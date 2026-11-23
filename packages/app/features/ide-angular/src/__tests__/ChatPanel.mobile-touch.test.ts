// @vitest-environment jsdom
/**
 * Mobile/touch wiring guard for the shared chat UI.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.mobile-touch.test.tsx`
 * with the same test names and the same assertions. The chat components style
 * themselves with inline values (no stylesheets in this package), so
 * phone/touch behavior is expressed by branching on the viewport hooks
 * (`useNarrowViewport` / `useCoarsePointer`) rather than `@media` rules. This
 * suite mounts the REAL components under a stubbed `matchMedia` and asserts the
 * branches that matter at 390px / on touch — and, just as load-bearing, that
 * NONE of it changes fine-pointer desktop rendering.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideTheme } from '@molecule/app-angular'
import { resetChatStoresForTests } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { MarkdownContent } from '../parts/markdown-content.component.js'
import { StreamingIndicator } from '../parts/streaming-indicator.component.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
} from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * Stub `window.matchMedia` so exactly the given queries match. The viewport
 * hooks read `matches` synchronously on mount, so this must run before render.
 *
 * @param matching - The media queries that should report `matches: true`.
 */
function stubMatchMedia(matching: string[]): void {
  window.matchMedia = (query: string): MediaQueryList =>
    Object.assign(new EventTarget(), {
      matches: matching.includes(query),
      media: query,
      onchange: null,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
    })
}

/** Stub a phone: narrow viewport AND coarse primary pointer. */
function stubPhone(): void {
  stubMatchMedia([NARROW_VIEWPORT_QUERY, COARSE_POINTER_QUERY])
}

/** Stub a desktop: neither query matches. */
function stubDesktop(): void {
  stubMatchMedia([])
}

/** What one mounted component hands back. */
interface Mounted {
  appRef: ApplicationRef
  container: HTMLElement
}

/** The component mount alive right now, if any. */
let current: Mounted | null = null

/**
 * Lets Angular's zoneless change detection settle what an event queued.
 */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/** The JIT host for the tool-call card (bound the way the conformance kit binds it). */
const ToolCallCardHost = Component({
  selector: 'mol-tool-call-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-tool-call-card [id]="p['id']" [name]="p['name']" [input]="p['input']" [output]="p['output']" [status]="p['status']" [fileDiff]="p['fileDiff']" [isUndone]="p['isUndone']" [onUndoToggle]="p['onUndoToggle']" [onFileOpen]="p['onFileOpen']" [onFileDoubleClick]="p['onFileDoubleClick']" [onFileDiff]="p['onFileDiff']" [onFileRevert]="p['onFileRevert']" [onAskUserResponse]="p['onAskUserResponse']" [onSkip]="p['onSkip']" [skipDisabledReason]="p['skipDisabledReason']" [className]="p['className']"></div>`,
})(
  class ToolCallCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** Tears down the current component mount. */
function teardown(): void {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
}

/**
 * Mounts a standalone component with plain inputs.
 *
 * @param component - The component class.
 * @param props - Inputs to set.
 * @returns The container.
 */
async function mountComponent<T>(
  component: Type<T>,
  props: Record<string, unknown>,
): Promise<HTMLElement> {
  teardown()
  setProvider(createSimpleI18nProvider('en'))
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider()),
    ],
  })
  const ref = createComponent(component, { environmentInjector: appRef.injector })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  for (const [key, value] of Object.entries(props)) ref.setInput(key, value)
  ref.changeDetectorRef.markForCheck()
  current = { appRef, container }
  await flush()
  return container
}

/**
 * Mounts a tool-call card with the given inputs.
 *
 * @param props - The card's inputs.
 * @returns The container.
 */
async function mountCard(props: Record<string, unknown>): Promise<HTMLElement> {
  teardown()
  setProvider(createSimpleI18nProvider('en'))
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost>> = createComponent(
    ToolCallCardHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, container }
  await flush()
  return container
}

/**
 * Descends through `display: contents` parity hosts to the rendered root.
 *
 * @param container - The mount container.
 * @returns The first real rendered element.
 */
function renderedRoot(container: HTMLElement): HTMLElement {
  let element = container.firstElementChild as HTMLElement
  while (element.style.display === 'contents' && element.firstElementChild) {
    element = element.firstElementChild as HTMLElement
  }
  return element
}

/**
 * Renders an awaiting ask_user card (options + free text).
 *
 * @returns The mount container.
 */
function renderAskUser(): Promise<HTMLElement> {
  return mountCard({
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
function renderRevertibleEdit(): Promise<HTMLElement> {
  return mountCard({
    id: 'tc-edit',
    name: 'edit_file',
    input: { path: 'src/app.ts', replacements: [{ old_string: 'a', new_string: 'b' }] },
    output: { replacementsApplied: 1 },
    status: 'done',
    fileDiff: { original: 'a', modified: 'b' },
    onFileRevert: async () => {},
  })
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
  panel = null
  panel = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider([]),
    props: { projectId: 'proj-touch', agentName: 'Synthase' },
  })
  await vi.waitFor(() => {
    expect(panel).not.toBeNull()
    expect(panel!.container.querySelector('[data-mol-chat-input]')).not.toBeNull()
  })
  return panel.container as HTMLElement
}

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
  teardown()
  panel?.unmount()
  panel = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  stubDesktop()
  setProvider(createSimpleI18nProvider())
})

describe('composer (ChatPanel) — phone/touch', () => {
  it(
    'renders the textarea at 16px on phones (iOS focus-zoom guard)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      stubPhone()
      const container = await renderChatPanel()
      const textarea = container.querySelector('[data-mol-chat-input]') as HTMLElement
      expect(textarea.style.fontSize).toBe('16px')
    },
  )

  it(
    'keeps the desktop textarea free of the inline override',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel()
      const textarea = container.querySelector('[data-mol-chat-input]') as HTMLElement
      expect(textarea.style.fontSize).toBe('')
    },
  )

  it(
    'grows the composer icon buttons to wide-but-flat 40×32 touch boxes on coarse',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // 40px wide preserves horizontal hit spacing; 32px tall (the dense-row
      // touch floor) keeps the composer row from ballooning vertically.
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
    },
  )

  it(
    'keeps the compact 24px icon boxes on fine pointers',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel()
      const attach = container.querySelector('button[title="Attach file"]') as HTMLElement
      expect(attach.style.width).toBe('24px')
      expect(attach.style.height).toBe('24px')
      const send = container.querySelector('button[title="Send"]') as HTMLElement
      expect(send.style.minHeight).toBe('')
    },
  )
})

describe('ask_user discovery card — phone/touch', () => {
  it('gives option rows the 44px standalone floor on coarse', async () => {
    stubPhone()
    const container = await renderAskUser()
    for (const i of [0, 1]) {
      const row = container.querySelector(`[data-mol-id="ask-user-option-${i}"]`) as HTMLElement
      expect(row, `option ${i} renders`).not.toBeNull()
      expect(row.style.minHeight).toBe('44px')
    }
  })

  it('renders the free-text input at 16px and its Send on the ClassMap touch floor', async () => {
    stubPhone()
    const container = await renderAskUser()
    const input = container.querySelector('input[type="text"]') as HTMLElement
    expect(input.style.fontSize).toBe('16px')
    // The input rides the SAME coarse 36px floor as the Send beside it —
    // resolved from the bond, never written here as a literal class.
    for (const token of classMap.touchTargetCompact.split(/\s+/).filter(Boolean)) {
      expect(input.classList.contains(token), `input carries ${token}`).toBe(true)
    }
    const send = container.querySelector('[data-mol-id="ask-user-free-text-submit"]') as HTMLElement
    // The Send is a design-system CTA, so its coarse-pointer floor comes from
    // `cm.touchTargetCompact` rather than a hand-rolled inline height.
    for (const token of classMap.touchTargetCompact.split(/\s+/).filter(Boolean)) {
      expect(send.classList.contains(token), `Send carries ${token}`).toBe(true)
    }
    expect(send.style.height, 'no hand-rolled pixel height survives').toBe('')
  })

  it('keeps the compact desktop card on fine pointers', async () => {
    const container = await renderAskUser()
    const row = container.querySelector('[data-mol-id="ask-user-option-0"]') as HTMLElement
    expect(row.style.minHeight).toBe('')
    const input = container.querySelector('input[type="text"]') as HTMLElement
    // The field shares the Send button's box: 13px label at the design
    // system's 26px height and 3px radius — one control family with the
    // card's buttons.
    expect(input.style.fontSize).toBe('13px')
    expect(input.style.height).toBe('26px')
    expect(input.style.borderRadius).toBe('3px')
  })
})

describe('hover-revealed undo control (ToolCallCard) — phone/touch', () => {
  it('rests visible (0.6) with a 32px hit box on coarse — hover does not exist', async () => {
    stubPhone()
    const container = await renderRevertibleEdit()
    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo, 'undo affordance renders').not.toBeNull()
    expect(undo.style.opacity).toBe('0.6')
    expect(undo.style.width).toBe('32px')
    expect(undo.style.height).toBe('32px')
  })

  it('stays hover-revealed (hidden at rest, 20px) on fine pointers', async () => {
    const container = await renderRevertibleEdit()
    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo.style.opacity).toBe('0')
    expect(undo.style.width).toBe('20px')
    expect(undo.style.height).toBe('20px')
  })
})

describe('MarkdownContent — finalized wrapper', () => {
  it('breaks long unbroken tokens so they cannot clip a 390px pane', async () => {
    const container = await mountComponent(MarkdownContent, {
      text: 'a-very-long-unbroken-token',
      isStreaming: false,
    })
    const wrapper = renderedRoot(container)
    expect(wrapper.style.wordBreak).toBe('break-word')
  })
})

describe('StreamingIndicator — narrow metrics', () => {
  it('drops the token estimate on narrow viewports; the elapsed timer stays', async () => {
    stubMatchMedia([NARROW_VIEWPORT_QUERY])
    const container = await mountComponent(StreamingIndicator, {
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

  it('keeps the token estimate on desktop widths', async () => {
    const container = await mountComponent(StreamingIndicator, {
      label: 'Reading src/App.tsx',
      startedAt: Date.now(),
      tokens: 40_500,
    })
    expect(container.textContent ?? '').toContain('~40.5k tokens')
  })
})
