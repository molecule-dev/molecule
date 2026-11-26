// @vitest-environment jsdom
/**
 * React's DOM at the port's own place: a port whose React root is a fragment,
 * an element or a portal renders exactly React's nodes between its consumer's
 * siblings — no host element and no capture span of its own.
 *
 * Each case mounts the port between `<i>a</i>` and `<i>b</i>` in a consumer
 * template, compares the consumer's children with React's markup (comments,
 * Angular's anchors, ignored), then toggles the input the port's presence
 * depends on once and compares again.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type TemplateRef,
  type Type,
  ViewChild,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BackgroundTaskState, ChatMessage } from '@molecule/app-ai-chat'
import { provideDomPlacement, provideHttp, provideI18n, provideTheme } from '@molecule/app-angular'
import { providePreview } from '@molecule/app-angular'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatTimestamp } from '../components/chat-timestamp.component.js'
import { CommandPalette } from '../components/command-palette.component.js'
import { DeviceFrameSelector } from '../components/device-frame-selector.component.js'
import { KeyboardShortcutsPanel } from '../components/keyboard-shortcuts-panel.component.js'
import { PreviewPanel } from '../components/preview-panel.component.js'
import { QuickOpen } from '../components/quick-open.component.js'
import { QuickPicker } from '../components/quick-picker.component.js'
import { TabBar } from '../components/tab-bar.component.js'
import { ToolCallCard } from '../components/tool-call-card.component.js'
import { UserAvatar } from '../components/user-avatar.component.js'
import { AutoCommitBadge } from '../parts/auto-commit-badge.component.js'
import { BackgroundTasksStrip } from '../parts/background-tasks-strip.component.js'
import { CardSegment } from '../parts/card-segment.component.js'
import { ChatItemBoundary } from '../parts/chat-item-boundary.component.js'
import { CollapsibleUserMessage } from '../parts/collapsible-user-message.component.js'
import { DockStrip } from '../parts/dock-strip.component.js'
import { MarkdownContent } from '../parts/markdown-content.component.js'
import { MessageItem } from '../parts/message-item.component.js'
import { ResourceLimitBanner } from '../parts/notice-card.component.js'
import { PlanCard } from '../parts/plan-card.component.js'
import { StreamingIndicator } from '../parts/streaming-indicator.component.js'
import { TestStatusBar } from '../parts/test-status-bar.component.js'
import { ThinkingBlock } from '../parts/thinking-block.component.js'
import { VerificationBadge } from '../parts/verification-badge.component.js'
import { providerAtUrl, settle } from './preview-panel-harness.js'

/** A stub HTTP client: every project has no files, so QuickOpen renders its picker. */
const http = {
  get: () =>
    Promise.resolve({
      data: { files: [] },
      status: 200,
      statusText: '200',
      headers: {},
      config: { method: 'GET', url: '' },
    }),
} as unknown as HttpClient

const apps: ApplicationRef[] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
})

beforeEach(() => {
  // jsdom has no layout: the pickers scroll the highlighted row into view.
  Element.prototype.scrollIntoView = () => undefined
  setClassMap(classMap)
  // Any glyph resolves to a path that names it, so a case can tell one icon
  // from another (and never depends on the real icon set).
  setIconSet(
    new Proxy({}, { get: () => ({ paths: [{ d: 'M0 0' }], viewBox: '0 0 16 16' }) }) as never,
  )
})

/**
 * The consumer's children as React's markup: element tags with their text,
 * comments (Angular's block anchors and placeholders) and whitespace left out.
 *
 * @param parent - The element whose children are read.
 * @returns The markup.
 */
function shape(parent: Element): string {
  const out: string[] = []
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) continue
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).data.replace(/\s+/g, ' ').trim()
      if (text) out.push(text)
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const element = node as Element
    const tag = element.tagName.toLowerCase()
    out.push(`<${tag}>${shape(element)}</${tag}>`)
  }
  return out.join('')
}

/** A consumer host whose `p` record is the props its template binds. */
interface Mounted {
  /** The consumer's root element. */
  root: HTMLElement
  /** Replaces props and re-renders once. */
  set(next: Record<string, unknown>): void
}

/**
 * Mounts `template` in a consumer host whose props are `p`.
 *
 * @param template - The consumer template, reading `p['name']`.
 * @param imports - The standalone components the template uses.
 * @param props - Its initial props.
 * @returns The host root element and a one-pass setter.
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown>,
): Promise<Mounted> {
  const Host = Component({
    selector: 'react-root-host',
    standalone: true,
    imports,
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class ReactRootHost {
      p: Record<string, unknown> = props
    },
  )
  const app = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(createSimpleI18nProvider('en')),
      provideTheme(createFakeThemeProvider('light', () => undefined)),
      provideHttp(http),
    ],
  })
  apps.push(app)
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: app.injector,
  })
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  app.attachView(ref.hostView)
  app.tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  app.tick()
  return {
    root,
    set(next: Record<string, unknown>): void {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      app.tick()
    },
  }
}

/** The port between two consumer siblings. */
const around = (port: string): string => `<i>a</i>${port}<i>b</i>`

/** One chat message for the row-shaped ports. */
function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'm1', role: 'user', content: 'Hello there', timestamp: 1000, ...overrides }
}

/** The run state the tests bar summarises. */
const RUN = {
  runId: 'r1',
  running: false,
  queued: [],
  currentId: null,
  output: [],
  results: { t1: { status: 'passed' as const } },
  cases: {},
  skipPending: false,
  skipUnavailable: true,
  outcome: 'passed' as const,
  error: null,
  startedAt: 0,
}

describe('AutoCommitBadge (React root: one <button>, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-auto-commit-badge [state]="p['state']"></div>`),
      [AutoCommitBadge],
      { state: { intervalSeconds: 30, remaining: null } },
    )
    expect(shape(m.root)).toBe('<i>a</i><button>Commit</button><i>b</i>')
    m.set({ state: { intervalSeconds: 0, remaining: null } })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
  })
})

describe('ChatTimestamp (React root: a Tooltip fragment, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-chat-timestamp [timestamp]="p['timestamp']"></div>`),
      [ChatTimestamp],
      { timestamp: Date.now() },
    )
    expect(shape(m.root)).toBe('<i>a</i><div><time>now</time></div><i>b</i>')
    m.set({ timestamp: Number.NaN })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
  })
})

describe('CommandPalette (React root: the QuickPicker fragment of two roots)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(
        `<div mol-command-palette [commands]="p['commands']" [onDismiss]="p['onDismiss']"></div>`,
      ),
      [CommandPalette],
      { commands: [], onDismiss: () => undefined },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    const dialog = m.root.ownerDocument.querySelector('[role="dialog"]')
    if (!dialog) throw new Error('Expected a kit dialog in the owner document')
    expect(dialog.parentElement?.getAttribute('role')).toBe('presentation')
    expect(shape(dialog)).toBe(
      '<div><input></input><div><div>No matching results</div></div></div>',
    )
    m.set({ commands: [{ id: 'c', label: 'Do', execute: () => undefined }] })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(shape(dialog)).toBe(
      '<div><input></input><div><button><span>Do</span></button></div></div>',
    )
  })
})

describe('DeviceFrameSelector (React root: one <div>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-device-frame-selector [current]="p['current']"></div>`),
      [DeviceFrameSelector],
      { current: 'none' },
    )
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><button><svg><path></path></svg><svg><path></path></svg></button></div></div><i>b</i>',
    )
    m.set({ current: 'desktop' })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><button><svg><path></path></svg><svg><path></path></svg></button></div></div><i>b</i>',
    )
  })
})

describe('KeyboardShortcutsPanel (React root: a fragment of two roots)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(
        `<div mol-keyboard-shortcuts-panel [shortcuts]="p['shortcuts']" [onDismiss]="p['onDismiss']"></div>`,
      ),
      [KeyboardShortcutsPanel],
      { shortcuts: [], onDismiss: () => undefined },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    const dialog = m.root.ownerDocument.querySelector('[role="dialog"]')
    if (!dialog) throw new Error('Expected a kit dialog in the owner document')
    expect(dialog.parentElement?.getAttribute('role')).toBe('presentation')
    expect(shape(dialog)).toBe(
      '<div><div><span>Keyboard Shortcuts</span><button><svg><path></path></svg></button></div><div></div><div>Arrow keys to navigate · Enter to run · Esc to close</div></div>',
    )
    m.set({ shortcuts: [{ label: 'Save', keys: 'Ctrl S' }] })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(shape(dialog)).toBe(
      '<div><div><span>Keyboard Shortcuts</span><button><svg><path></path></svg></button></div><div><div><button><span>Save</span><span><kbd>Ctrl</kbd><kbd>S</kbd></span></button></div></div><div>Arrow keys to navigate · Enter to run · Esc to close</div></div>',
    )
  })
})

describe('QuickOpen (React root: the QuickPicker fragment of two roots)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(
        `<div mol-quick-open [projectId]="p['projectId']" [onFileOpen]="p['onFileOpen']" [onDismiss]="p['onDismiss']"></div>`,
      ),
      [QuickOpen],
      { projectId: 'p1', onFileOpen: () => undefined, onDismiss: () => undefined },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    const dialog = m.root.ownerDocument.querySelector('[role="dialog"]')
    if (!dialog) throw new Error('Expected a kit dialog in the owner document')
    expect(dialog.parentElement?.getAttribute('role')).toBe('presentation')
    const picker =
      /^<div><input><\/input><div><div>(Loading…|No matching results)<\/div><\/div><\/div>$/
    expect(shape(dialog)).toMatch(picker)
    m.set({ projectId: 'p2' })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(shape(dialog)).toMatch(picker)
  })
})

describe('QuickPicker (React root: a fragment of two roots)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(
        `<div mol-quick-picker [items]="p['items']" [onSelect]="p['onSelect']" [onDismiss]="p['onDismiss']"></div>`,
      ),
      [QuickPicker],
      { items: [], onSelect: () => undefined, onDismiss: () => undefined },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    const dialog = m.root.ownerDocument.querySelector('[role="dialog"]')
    if (!dialog) throw new Error('Expected a kit dialog in the owner document')
    expect(dialog.parentElement?.getAttribute('role')).toBe('presentation')
    expect(shape(dialog)).toBe(
      '<div><input></input><div><div>No matching results</div></div></div>',
    )
    m.set({ items: [{ id: 'x', label: 'X', detail: 'd' }] })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    expect(shape(dialog)).toBe(
      '<div><input></input><div><button><span>X</span><span>d</span></button></div></div>',
    )
  })
})

describe('TabBar (React root: one <div>, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(around(`<div mol-tab-bar [tabs]="p['tabs']"></div>`), [TabBar], {
      tabs: [],
    })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ tabs: [{ path: '/a.ts', name: 'a.ts', dirty: false }] })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><div><div><span><svg><path></path></svg></span><span>a.ts</span></div><button><svg><path></path></svg></button></div></div></div><i>b</i>',
    )
  })
})

describe('ToolCallCard (its host IS React root, absent when it renders nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-tool-call-card [id]="'t1'" [name]="p['name']" [input]="p['input']"></div>`),
      [ToolCallCard],
      { name: 'update_task_list', input: {} },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ name: 'read_file', input: { path: '/a.ts' } })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><div><span><span><svg><circle></circle><circle></circle></svg><span>Read<code>a.ts</code></span></span></span></div></div></div><i>b</i>',
    )
  })
})

describe('UserAvatar (React root: the image, the tile or the button)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-user-avatar [name]="p['name']" [onClick]="p['onClick']"></div>`),
      [UserAvatar],
      { name: 'Ada Lovelace' },
    )
    expect(shape(m.root)).toBe('<i>a</i><span><span>A</span></span><i>b</i>')
    m.set({ onClick: () => undefined })
    expect(shape(m.root)).toBe('<i>a</i><button><span><span>A</span></span></button><i>b</i>')
  })
})

describe('BackgroundTasksStrip (React root: one strip <div>, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const tasks: BackgroundTaskState[] = [
      {
        id: 't1',
        command: 'npm run build',
        startedAt: Date.now(),
        status: 'succeeded',
        finishedAt: Date.now(),
      },
    ]
    const m = await mount(
      around(`<div mol-background-tasks-strip [tasks]="p['tasks']"></div>`),
      [BackgroundTasksStrip],
      { tasks: [] },
    )
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ tasks })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><button></button><div><svg><path></path></svg><span><svg><path></path></svg></span><span>1 background task finished</span></div></div></div><i>b</i>',
    )
  })
})

describe('CardSegment (React root: the segment element itself)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-card-segment [segment]="p['segment']"></div>`),
      [CardSegment],
      { segment: 'plain text' },
    )
    expect(shape(m.root)).toBe('<i>a</i><span>plain text</span><i>b</i>')
    m.set({ segment: { code: 'npm test' } })
    expect(shape(m.root)).toBe('<i>a</i><code>npm test</code><i>b</i>')
  })
})

describe('ChatItemBoundary (React root: a fragment)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    /** The consumer: the boundary between two siblings, fed its item template. */
    class BoundaryHost {
      /** The item template the boundary renders. */
      item?: TemplateRef<unknown>
    }
    const Host = Component({
      selector: 'react-root-boundary-host',
      standalone: true,
      imports: [ChatItemBoundary],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<i>a</i><mol-chat-item-boundary [render]="item"></mol-chat-item-boundary><i>b</i><ng-template #item><u>item</u></ng-template>`,
    })(BoundaryHost)
    // JIT ignores decorators in Component() metadata: register the query the way
    // the decorator does, before the host is first compiled.
    ViewChild('item')(BoundaryHost.prototype, 'item')
    const app = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideDomPlacement(),
        provideI18n(createSimpleI18nProvider('en')),
        provideTheme(createFakeThemeProvider('light', () => undefined)),
        provideHttp(http),
      ],
    })
    apps.push(app)
    const ref = createComponent(Host, { environmentInjector: app.injector })
    const root = ref.location.nativeElement as HTMLElement
    document.body.appendChild(root)
    app.attachView(ref.hostView)
    app.tick()
    app.tick()
    expect(shape(root)).toBe('<i>a</i><u>item</u><i>b</i>')
  })
})

describe('CollapsibleUserMessage (React root: one <div>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-collapsible-user-message [content]="p['content']"></div>`),
      [CollapsibleUserMessage],
      { content: 'short' },
    )
    expect(shape(m.root)).toBe('<i>a</i><div><div>short</div></div><i>b</i>')
    m.set({ content: 'longer text' })
    expect(shape(m.root)).toBe('<i>a</i><div><div>longer text</div></div><i>b</i>')
  })
})

describe('DockStrip (standalone: its host IS React root; in a tray: nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(
        `<div mol-dock-strip molId="strip" toggleMolId="strip-toggle" [expanded]="p['expanded']" [onToggle]="p['onToggle']" label="Label"></div>`,
      ),
      [DockStrip],
      { expanded: false, onToggle: () => undefined },
    )
    const strip =
      '<i>a</i><div><div><button></button><div><svg><path></path></svg><span>Label</span></div></div></div><i>b</i>'
    expect(shape(m.root)).toBe(strip)
    m.set({ expanded: true })
    expect(shape(m.root)).toBe(strip)
  })
})

describe('MarkdownContent (React root: one <div>, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-markdown-content [text]="p['text']"></div>`),
      [MarkdownContent],
      { text: 'hello' },
    )
    expect(shape(m.root)).toBe('<i>a</i><div><p>hello</p></div><i>b</i>')
    m.set({ text: '' })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
  })
})

describe('MessageItem (React root: one <div>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(around(`<div mol-message-item [msg]="p['msg']"></div>`), [MessageItem], {
      msg: message({ content: 'Hi' }),
    })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><span><svg><path></path></svg></span><div><div><span>You</span></div><div><div>Hi</div></div></div></div></div><i>b</i>',
    )
    m.set({ msg: message({ content: 'Bye', id: 'm2' }) })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><span><svg><path></path></svg></span><div><div><span>You</span></div><div><div>Bye</div></div></div></div></div><i>b</i>',
    )
  })
})

describe('ResourceLimitBanner (React root: the shared notice card <div>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(
        `<div mol-resource-limit-banner [message]="p['message']" [action]="p['action']"></div>`,
      ),
      [ResourceLimitBanner],
      { message: 'Limit hit', action: [{ label: 'Upgrade', href: '/billing' }] },
    )
    expect(shape(m.root)).toBe(
      '<i>a</i><div><svg><path></path></svg><div><span>Limit hit</span><div><a>Upgrade</a></div></div></div><i>b</i>',
    )
    m.set({ action: null })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><svg><path></path></svg><div><span>Limit hit</span></div></div><i>b</i>',
    )
  })
})

describe('PlanCard (React root: one strip <div>, or nothing)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(around(`<div mol-plan-card [todos]="p['todos']"></div>`), [PlanCard], {
      todos: [],
    })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ todos: [{ content: 'Step', status: 'pending' }] })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><button></button><div><svg><path></path></svg><span></span><span>Working plan</span></div></div><div><div><div><span><span></span></span><span>Step</span></div></div></div></div><i>b</i>',
    )
  })
})

describe('StreamingIndicator (React root: a <span> or a status <div>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-streaming-indicator [inline]="p['inline']" label="Working"></div>`),
      [StreamingIndicator],
      { inline: true },
    )
    // The spinner mark's SVG is the platform's own; the wrapper is what is asserted.
    expect(shape(m.root)).toMatch(/^<i>a<\/i><span><svg>.*<\/svg><\/span><i>b<\/i>$/)
    m.set({ inline: false })
    expect(shape(m.root)).toMatch(
      /^<i>a<\/i><div><span><svg>.*<\/svg><\/span><span>Working<\/span><\/div><i>b<\/i>$/,
    )
  })
})

describe('TestStatusBar (React root: one strip <div>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-test-status-bar [run]="p['run']" [onOpen]="p['onOpen']"></div>`),
      [TestStatusBar],
      { run: RUN, onOpen: () => undefined },
    )
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><button></button><div><span><svg><path></path></svg></span><span><span>All 1 passing</span></span></div></div></div><i>b</i>',
    )
    m.set({ run: { ...RUN, results: { t1: { status: 'failed' } } } })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><div><button></button><div><span><svg><path></path></svg></span><span><span>1 failing, 0 passing</span></span></div></div></div><i>b</i>',
    )
  })
})

describe('ThinkingBlock (React root: one <div>)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-thinking-block [content]="p['content']" [isStreaming]="true"></div>`),
      [ThinkingBlock],
      { content: 'reasoning' },
    )
    const block =
      '<i>a</i><div><button><svg><polyline></polyline></svg><span>Thinking</span></button><div>reasoning</div></div><i>b</i>'
    expect(shape(m.root)).toBe(block)
    m.set({ content: 'more reasoning' })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><button><svg><polyline></polyline></svg><span>Thinking</span></button><div>more reasoning</div></div><i>b</i>',
    )
  })
})

describe('VerificationBadge (React root: the pass row or the failure card)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      around(`<div mol-verification-badge [status]="p['status']" [workspaces]="[]"></div>`),
      [VerificationBadge],
      { status: 'ok' },
    )
    expect(shape(m.root)).toBe(
      '<i>a</i><div><svg><path></path></svg><span>Checks passed</span></div><i>b</i>',
    )
    m.set({ status: 'error', output: 'error TS1' })
    expect(shape(m.root)).toBe(
      '<i>a</i><div><button><span>Errors found</span><svg><polyline></polyline></svg></button></div><i>b</i>',
    )
  })
})

describe('PreviewPanel (its host IS React root; the restarting capture is bare)', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    /** The consumer: the panel with a projected restarting indicator. */
    const Host = Component({
      selector: 'react-root-preview-host',
      standalone: true,
      imports: [PreviewPanel],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<div mol-preview-panel><div slot="restartingIndicator" data-mol-id="proj">R</div></div>`,
    })(class PreviewHost {})
    const app = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideDomPlacement(),
        provideI18n(createSimpleI18nProvider('en')),
        providePreview(providerAtUrl()),
      ],
    })
    apps.push(app)
    const ref = createComponent(Host, { environmentInjector: app.injector })
    const root = ref.location.nativeElement as HTMLElement
    document.body.appendChild(root)
    app.attachView(ref.hostView)
    await settle(app)
    // The panel's own element is React's root: no wrapper around it, and no
    // placeholder element of ours anywhere in it.
    expect(root.querySelectorAll('div[mol-preview-panel]')).toHaveLength(1)
    expect(root.querySelector('[data-parity-unwrap]')).toBeNull()
    expect(shape(root)).not.toContain('<mol-')
  })
})
