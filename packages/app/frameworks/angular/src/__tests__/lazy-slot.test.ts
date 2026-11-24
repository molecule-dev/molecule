// @vitest-environment jsdom
/**
 * MolLazy: projected content created only while its place is in the page, as React mounts a
 * slot, through the real DOM placement (kept DOM, `@if`, a re-projecting wrapper, a fragment
 * root, a host that leaves the page).
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  ElementRef,
  inject,
  type OnDestroy,
  provideZonelessChangeDetection,
  type QueryList,
  signal,
  type Type,
  ViewChild,
  ViewChildren,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import {
  heldElement,
  MolPlacement,
  MolWrapEachChild,
  placeContent,
  placeContentBefore,
  placeElement,
  provideDomPlacement,
  setElementPresent,
  useHostPresence,
  usePlacement,
  WrappedChildren,
} from '../dom-placement.js'
import {
  isElementChild,
  isLazySlotAnchor,
  isLazySlotContent,
  MolLazy,
  slotElement,
} from '../lazy-slot.js'
import { MolSlotCopy } from '../slot-copy.js'

const apps: ApplicationRef[] = []
let created = 0
let destroyed = 0
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
  created = 0
  destroyed = 0
})

/** Counts its instances, as a slot's stateful component would run its setup. */
const Probe = Component({
  selector: 'i[probe]',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  inputs: ['v'],
  template: '{{ v }}',
})(
  class Probe implements OnDestroy {
    v?: string
    constructor() {
      created++
    }
    ngOnDestroy(): void {
      destroyed++
    }
  },
)

/** React: `{open && <div data-body>{children}</div>}{open && slot(footer) && <div data-footer>{footer}</div>}`, kept DOM. */
const KeptDialog = Component({
  selector: 'kept-dialog',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['open'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #body data-body=""><ng-content></ng-content></div><div #footer data-footer=""><ng-content select="[slot=footer]"></ng-content></div>`,
})(
  class KeptDialog {
    open = false
    body?: ElementRef<HTMLElement>
    footer?: ElementRef<HTMLElement>
    constructor() {
      usePlacement((hasContent) => {
        const body = this.body?.nativeElement
        const footer = this.footer?.nativeElement
        if (!body || !footer) return
        setElementPresent(body, this.open)
        setElementPresent(footer, this.open && hasContent(footer))
      })
    }
  },
)
// A decorator inside the class expression is not applied here; the query is declared as Angular's
// compiler would.
ViewChild('body')(KeptDialog.prototype, 'body')
ViewChild('footer')(KeptDialog.prototype, 'footer')

/** The same dialog with its slots inside `@if (open)`. */
const IfDialog = Component({
  selector: 'if-dialog',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  inputs: ['open'],
  template: `@if (open) {<div data-body=""><ng-content></ng-content></div><div data-footer=""><ng-content select="[slot=footer]"></ng-content></div>}`,
})(
  class IfDialog {
    open = false
  },
)

/** A wrapper that projects its own slots on into the kept-DOM dialog. */
const Rewrap = Component({
  selector: 'rewrap',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [KeptDialog],
  inputs: ['open'],
  template: `<kept-dialog [open]="open"><ng-content></ng-content><ng-content select="[slot=footer]" ngProjectAs="[slot=footer]"></ng-content></kept-dialog>`,
})(
  class Rewrap {
    open = false
  },
)

/** React's fragment root: the content renders in front of the host, which leaves the page. */
const FragmentRoot = Component({
  selector: 'fragment-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<ng-content></ng-content>`,
})(
  class FragmentRoot {
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    constructor() {
      usePlacement(() => {
        placeContentBefore(this.host, this.host)
        setElementPresent(this.host, false)
      })
    }
  },
)

/** React: `return open ? <div data-popover>{children}</div> : null`, through the host's presence. */
const HostPopover = Component({
  selector: 'host-popover',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  inputs: ['open'],
  template: `<div data-popover=""><ng-content></ng-content></div>`,
})(
  class HostPopover {
    open = false
    constructor() {
      useHostPresence(() => this.open)
    }
  },
)

/** React: `slot(footer) && <div data-footer>{footer}</div>`, the wrapper following its slot alone. */
const FooterOnly = Component({
  selector: 'footer-only',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<div #footer data-footer=""><ng-content select="[slot=footer]"></ng-content></div>`,
})(
  class FooterOnly {
    footer?: ElementRef<HTMLElement>
    constructor() {
      usePlacement((hasContent) => {
        const footer = this.footer?.nativeElement
        if (footer) setElementPresent(footer, hasContent(footer))
      })
    }
  },
)
ViewChild('footer')(FooterOnly.prototype, 'footer')

/** React: `children.slice(0, shown)`, hiding the rest of its children by taking them out of the page. */
/** React: `cloneElement(child, { 'data-trigger': '' })` on its one element child. */
const Trigger = Component({
  selector: 'trigger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  hostDirectives: [MolPlacement],
  template: `<span #capture><ng-content></ng-content></span>`,
})(
  class Trigger {
    capture?: ElementRef<HTMLElement>
    constructor() {
      usePlacement((hasContent) => {
        const capture = this.capture?.nativeElement
        placeContentBefore(capture, capture)
        setElementPresent(capture, false)
        const children = hasContent.nodes(capture)
        const element = children.length === 1 ? slotElement(children[0]!) : null
        element?.setAttribute('data-trigger', '')
      })
    }
  },
)
ViewChild('capture', { static: true })(Trigger.prototype, 'capture')

const SliceList = Component({
  selector: 'slice-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  hostDirectives: [MolPlacement],
  inputs: ['shown'],
  template: `<span #items><ng-content></ng-content></span>{{ count }}`,
})(
  class SliceList {
    shown = 0
    count = -1
    items?: ElementRef<HTMLElement>
    private readonly hidden = new Set<Node>()
    constructor() {
      usePlacement((hasContent) => {
        const capture = this.items?.nativeElement
        placeContentBefore(capture, capture)
        setElementPresent(capture, false)
        const items = hasContent.nodes(capture).map((node) => {
          const held = heldElement(node)
          return held !== undefined && this.hidden.has(held) ? held : node
        })
        this.count = items.length
        this.hidden.clear()
        for (const [index, node] of items.entries()) {
          setElementPresent(node, index < this.shown)
          if (index >= this.shown) this.hidden.add(node)
        }
      })
    }
  },
)
ViewChild('items', { static: true })(SliceList.prototype, 'items')

/** React: `children.map((child) => <div>{child}</div>)`, counting its children as `wrappers().length`. */
const WrapEach = Component({
  selector: 'wrap-each',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [WrappedChildren],
  imports: [MolWrapEachChild],
  template: `<div molWrapEachChild><ng-content></ng-content></div>{{ wrapped.wrappers().length }}`,
})(
  class WrapEach {
    readonly wrapped = inject(WrappedChildren)
  },
)

/** React: `side === 'left' ? <>{aside}{main}</> : <>{main}{aside}</>`, so the aside is a new element. */
const Sides = Component({
  selector: 'sides',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  hostDirectives: [MolPlacement],
  inputs: ['side'],
  template: `<aside #left></aside><main></main><aside #right></aside><span #capture><ng-content></ng-content></span>`,
})(
  class Sides {
    side = 'left'
    left?: ElementRef<HTMLElement>
    right?: ElementRef<HTMLElement>
    capture?: ElementRef<HTMLElement>
    constructor() {
      usePlacement(() => {
        const capture = this.capture?.nativeElement
        placeContent(
          capture,
          (this.side === 'left' ? this.left : this.right)?.nativeElement ?? null,
        )
        setElementPresent(capture, false)
      })
    }
  },
)
ViewChild('left', { static: true })(Sides.prototype, 'left')
ViewChild('right', { static: true })(Sides.prototype, 'right')
ViewChild('capture', { static: true })(Sides.prototype, 'capture')

/** React: `rows.map((row) => <div key={row}>{children}</div>)`, a copy of its children per row. */
const Rows = Component({
  selector: 'copy-rows',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  hostDirectives: [MolPlacement],
  imports: [MolSlotCopy],
  inputs: ['rows'],
  template: `@for (row of rows; track row) {<div><ng-container [molSlotCopy]="children()" /></div>}<span #capture><ng-content></ng-content></span>`,
})(
  class Rows {
    rows: readonly number[] = []
    readonly children = signal<readonly Node[]>([])
    capture?: ElementRef<HTMLElement>
    constructor() {
      usePlacement((hasContent) => {
        const capture = this.capture?.nativeElement
        this.children.set(hasContent.nodes(capture))
        setElementPresent(capture, false)
      })
    }
  },
)
ViewChild('capture', { static: true })(Rows.prototype, 'capture')

/** React: `Children.toArray(children).filter(isValidElement).map((c) => <section>{c}</section>)`. */
const Panes = Component({
  selector: 'panes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  hostDirectives: [MolPlacement],
  template: `@for (i of indexes(); track i) {<section #pane></section>}<span #capture><ng-content></ng-content></span>`,
})(
  class Panes {
    readonly indexes = signal<readonly number[]>([])
    capture?: ElementRef<HTMLElement>
    panes?: QueryList<ElementRef<HTMLElement>>
    constructor() {
      usePlacement((hasContent) => {
        const capture = this.capture?.nativeElement
        setElementPresent(capture, false)
        const children = hasContent.nodes(capture).map((node) => heldElement(node) ?? node)
        const elements = children.filter(isElementChild)
        for (const text of children.filter((node) => !isElementChild(node)))
          setElementPresent(text, false)
        if (this.indexes().length !== elements.length) this.indexes.set(elements.map((_, i) => i))
        const wrappers = this.panes?.map((ref) => ref.nativeElement) ?? []
        if (wrappers.length === elements.length) {
          elements.forEach((element, i) => placeElement(element, wrappers[i] ?? null))
        }
      })
    }
  },
)
ViewChild('capture', { static: true })(Panes.prototype, 'capture')
ViewChildren('pane')(Panes.prototype, 'panes')

async function mount(template: string, imports: Type<unknown>[], props: Record<string, unknown>) {
  const Host = Component({
    selector: 'lazy-host',
    standalone: true,
    imports: [MolLazy, Probe, ...imports],
    // The host re-reads `p` on every check, as the conformance host does.
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class {
      p: Record<string, unknown> = props
    },
  )
  const app = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  apps.push(app)
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: app.injector,
  })
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  app.attachView(ref.hostView)
  app.tick()
  return {
    root,
    set(next: Record<string, unknown>) {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      app.tick()
    },
  }
}

const counts = (): string => `${created}/${destroyed}`
const html = (root: HTMLElement): string => root.innerHTML.replace(/<!--.*?-->/g, '')

/**
 * Closed, opened, opened with a new binding value, closed, opened: React's mounts of a dialog
 * slot (none while closed, one per opening).
 *
 * @param template - The consumer's template; the probe binds `p.v`.
 * @param imports - The components it renders.
 * @returns The counts after each step, and the probe's text while open with the new value.
 */
async function reopen(template: string, imports: Type<unknown>[]) {
  const view = await mount(template, imports, { open: false, v: 'one' })
  const steps = [counts()]
  view.set({ open: true })
  steps.push(counts())
  view.set({ v: 'two' })
  steps.push(counts())
  const text = view.root.querySelector('i[probe]')?.textContent
  view.set({ open: false })
  steps.push(counts())
  const closedProbes = view.root.querySelectorAll('i[probe]').length
  view.set({ open: true })
  steps.push(counts())
  return { steps, text, closedProbes, view }
}

const REACT = ['0/0', '1/0', '1/0', '1/1', '2/1']

describe('MolLazy', () => {
  it.each([
    [
      'a named slot, *molLazy on its element',
      `<kept-dialog [open]="p['open']"><div slot="footer" *molLazy><i probe [v]="p['v']"></i></div></kept-dialog>`,
    ],
    [
      'a named slot, an ng-template with ngProjectAs',
      `<kept-dialog [open]="p['open']"><ng-template molLazy ngProjectAs="[slot=footer]"><i probe [v]="p['v']"></i></ng-template></kept-dialog>`,
    ],
    [
      'a named slot, *molLazy inside an ng-container with ngProjectAs',
      `<kept-dialog [open]="p['open']"><ng-container ngProjectAs="[slot=footer]"><i probe *molLazy [v]="p['v']"></i></ng-container></kept-dialog>`,
    ],
    [
      'the default slot',
      `<kept-dialog [open]="p['open']"><i probe *molLazy [v]="p['v']"></i></kept-dialog>`,
    ],
  ])('creates the content of a kept-DOM dialog once per opening: %s', async (_name, template) => {
    const { steps, text, closedProbes } = await reopen(template, [KeptDialog])
    expect(steps).toEqual(REACT)
    expect(text).toBe('two')
    expect(closedProbes).toBe(0)
  })

  it('creates the content of a dialog that wraps its slots in @if once per opening', async () => {
    const { steps, text } = await reopen(
      `<if-dialog [open]="p['open']"><div slot="footer" *molLazy><i probe [v]="p['v']"></i></div></if-dialog>`,
      [IfDialog],
    )
    expect(steps).toEqual(REACT)
    expect(text).toBe('two')
  })

  it('follows a wrapper that projects the slot on into the dialog', async () => {
    const { steps, text } = await reopen(
      `<rewrap [open]="p['open']"><div slot="footer" *molLazy><i probe [v]="p['v']"></i></div></rewrap>`,
      [Rewrap],
    )
    expect(steps).toEqual(REACT)
    expect(text).toBe('two')
  })

  it('goes with the consumer’s own @if around it, and comes back with it', async () => {
    const view = await mount(
      `<kept-dialog [open]="true">@if (p['show']) {<ng-container ngProjectAs="[slot=footer]"><i probe *molLazy></i></ng-container>}</kept-dialog>`,
      [KeptDialog],
      { show: true },
    )
    expect(counts()).toBe('1/0')
    view.set({ show: false })
    expect(counts()).toBe('1/1')
    view.set({ show: true })
    expect(counts()).toBe('2/1')
  })

  it('leaves plain projected content eager: one instance for the consumer’s whole view', async () => {
    const { steps } = await reopen(
      `<kept-dialog [open]="p['open']"><div slot="footer"><i probe [v]="p['v']"></i></div></kept-dialog>`,
      [KeptDialog],
    )
    expect(steps).toEqual(['1/0', '1/0', '1/0', '1/0', '1/0'])
  })

  it('stamps content a fragment root renders in front of its absent host, once', async () => {
    const view = await mount(
      `@if (p['open']) {<fragment-root><i probe *molLazy [v]="p['v']"></i></fragment-root>}`,
      [FragmentRoot],
      { open: true, v: 'one' },
    )
    expect(counts()).toBe('1/0')
    expect(html(view.root)).toBe('<i probe="">one</i>')
    view.set({ open: false })
    expect(counts()).toBe('1/1')
    view.set({ open: true })
    expect(counts()).toBe('2/1')
  })

  it('creates nothing while a component keeps its host out of the page', async () => {
    const { steps, view } = await reopen(
      `<host-popover [open]="p['open']"><i probe *molLazy [v]="p['v']"></i></host-popover>`,
      [HostPopover],
    )
    expect(steps).toEqual(REACT)
    expect(html(view.root)).toContain('<div data-popover=""><i probe="">two</i></div>')
  })

  it('puts a wrapper that follows its slot in the page, so the slot can be stamped there', async () => {
    const view = await mount(
      `<footer-only><ng-container ngProjectAs="[slot=footer]"><i probe *molLazy></i></ng-container></footer-only>`,
      [FooterOnly],
      {},
    )
    expect(counts()).toBe('1/0')
    expect(view.root.querySelector('[data-footer] i[probe]')).not.toBeNull()
  })

  it('keeps the wrapper of a stamped slot that renders nothing, and the render settles', async () => {
    const view = await mount(
      `<footer-only><ng-template molLazy ngProjectAs="[slot=footer]">@if (p['show']) {<b>x</b>}</ng-template></footer-only>`,
      [FooterOnly],
      { show: false },
    )
    // React's `!!footer` is true for any element passed, whatever it renders.
    expect(view.root.querySelector('[data-footer]')).not.toBeNull()
    view.set({ show: true })
    expect(view.root.querySelector('[data-footer] b')?.textContent).toBe('x')
    view.set({ show: false })
    expect(view.root.querySelector('[data-footer]')).not.toBeNull()
  })

  it('is one child of a list, stamped or not, so a list that hides a child destroys it', async () => {
    const view = await mount(
      `<slice-list [shown]="p['shown']">@for (i of [1, 2, 3]; track i) {<i probe *molLazy [v]="'item ' + i"></i>}</slice-list>`,
      [SliceList],
      { shown: 1 },
    )
    // React's `children.slice(0, 1)` mounts the first item only; the count is still three.
    expect(counts()).toBe('1/0')
    expect(html(view.root)).toBe('<slice-list><i probe="">item 1</i>3</slice-list>')
    view.set({ shown: 3 })
    expect(counts()).toBe('3/0')
    expect(html(view.root)).toBe(
      '<slice-list><i probe="">item 1</i><i probe="">item 2</i><i probe="">item 3</i>3</slice-list>',
    )
    view.set({ shown: 1 })
    expect(counts()).toBe('3/2')
    view.set({ shown: 0 })
    expect(counts()).toBe('3/3')
    expect(html(view.root)).toBe('<slice-list>3</slice-list>')
  })

  it('gets one wrapper per lazy child, and its content is stamped inside it', async () => {
    const view = await mount(
      `<wrap-each><i probe *molLazy [v]="'a'"></i><i probe *molLazy [v]="'b'"></i></wrap-each>`,
      [WrapEach],
      {},
    )
    expect(counts()).toBe('2/0')
    expect(html(view.root)).toBe(
      '<wrap-each><div><div><i probe="">a</i></div><div><i probe="">b</i></div></div>2</wrap-each>',
    )
  })

  it('is created again when its place moves to another parent, as React mounts a new element', async () => {
    const view = await mount(
      `<sides [side]="p['side']"><i probe *molLazy [v]="'aside'"></i></sides>`,
      [Sides],
      { side: 'left' },
    )
    expect(counts()).toBe('1/0')
    expect(html(view.root)).toBe(
      '<sides><aside><i probe="">aside</i></aside><main></main><aside></aside></sides>',
    )
    view.set({ side: 'right' })
    expect(counts()).toBe('2/1')
    expect(html(view.root)).toBe(
      '<sides><aside></aside><main></main><aside><i probe="">aside</i></aside></sides>',
    )
    view.set({ side: 'right' })
    expect(counts()).toBe('2/1')
  })

  it('gets a live instance in every place a slot copy renders it, and none of its own', async () => {
    const view = await mount(
      `<copy-rows [rows]="p['rows']">x<i probe *molLazy [v]="'a'"></i>@if (p['b']) {<i probe *molLazy [v]="'b'"></i>}</copy-rows>`,
      [Rows],
      { rows: [1, 2], b: true },
    )
    // React: two rows, each with its own instance of every child.
    expect(counts()).toBe('4/0')
    expect(html(view.root)).toBe(
      '<copy-rows><div>x<i probe="">a</i><i probe="">b</i></div><div>x<i probe="">a</i><i probe="">b</i></div></copy-rows>',
    )
    // A child that leaves the slot leaves every row; the others keep their instances.
    view.set({ b: false })
    expect(counts()).toBe('4/2')
    expect(html(view.root)).toBe(
      '<copy-rows><div>x<i probe="">a</i></div><div>x<i probe="">a</i></div></copy-rows>',
    )
    view.set({ b: true })
    expect(counts()).toBe('6/2')
    expect(html(view.root)).toBe(
      '<copy-rows><div>x<i probe="">a</i><i probe="">b</i></div><div>x<i probe="">a</i><i probe="">b</i></div></copy-rows>',
    )
    // A row that goes takes its copies with it.
    view.set({ rows: [1] })
    expect(counts()).toBe('6/4')
    view.set({ rows: [] })
    expect(counts()).toBe('6/6')
    expect(html(view.root)).toBe('<copy-rows></copy-rows>')
  })

  it('is an element child, stamped where a component places its anchor', async () => {
    const view = await mount(
      `<panes>text<i probe *molLazy [v]="'one'"></i><b>plain</b></panes>`,
      [Panes],
      {},
    )
    await Promise.resolve()
    view.set({})
    expect(counts()).toBe('1/0')
    expect(html(view.root)).toBe(
      '<panes><section><i probe="">one</i></section><section><b>plain</b></section></panes>',
    )
  })

  it('gives a component the element a lazy child stamped, once it is stamped', async () => {
    const view = await mount(`<trigger><i probe *molLazy [v]="'t'"></i></trigger>`, [Trigger], {})
    expect(counts()).toBe('1/0')
    expect(html(view.root)).toBe('<trigger><i probe="" data-trigger="">t</i></trigger>')
    const plain = await mount(`<trigger><b>t</b></trigger>`, [Trigger], {})
    expect(html(plain.root)).toBe('<trigger><b data-trigger="">t</b></trigger>')
    const text = document.createTextNode('t')
    expect(slotElement(text)).toBeNull()
    expect(isElementChild(text)).toBe(false)
  })

  it('marks its anchor, and only its anchor, as a lazy slot', async () => {
    const view = await mount(`<span><i probe *molLazy></i></span>`, [], {})
    const span = view.root.querySelector('span')!
    const anchors = [...span.childNodes].filter(isLazySlotAnchor)
    expect(anchors).toHaveLength(1)
    expect(anchors[0]!.nodeType).toBe(8)
    expect(isLazySlotAnchor(span.querySelector('i')!)).toBe(false)
    expect(isLazySlotContent(span.querySelector('i')!)).toBe(true)
    expect(isLazySlotContent(anchors[0]!)).toBe(false)
  })

  it('refuses an element it cannot stamp', async () => {
    await expect(mount(`<div molLazy></div>`, [], {})).rejects.toThrow(
      'molLazy goes on an <ng-template>, or as *molLazy on an element.',
    )
  })
})
