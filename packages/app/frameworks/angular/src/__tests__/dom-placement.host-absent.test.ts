// @vitest-environment jsdom
/**
 * A component whose host is out of the page: context lookups through the rendered tree
 * (`renderedParent`) and the consumer's bindings on the component's tag (`setHostRoot`).
 *
 * Run against the working-tree module it is the known-bad run: `renderedParent` and
 * `setHostRoot` do not exist there, so the lookups fall back to `parentElement` and the
 * bindings stay on the detached host.
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  ElementRef,
  ErrorHandler,
  inject,
  provideZonelessChangeDetection,
  type Type,
  ViewChild,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  placeElement,
  placeElementBefore,
  provideDomPlacement,
  renderedParent,
  setElementPresent,
  setHostRoot,
  usePlacement,
} from '../dom-placement.js'

// dom-context.ts, with the one changed line: the walk follows the rendered tree.
const registrations = new WeakMap<Element, unknown>()
const provide = (host: Element, value: unknown): void => void registrations.set(host, value)
function find(start: Element | null): unknown {
  for (let el = renderedParent(start); el; el = renderedParent(el)) {
    const value = registrations.get(el)
    if (value !== undefined) return value
  }
  return undefined
}

const apps: ApplicationRef[] = []
/** What Angular reported to the application's ErrorHandler (an app logs these; TestBed rethrows them). */
let errors: unknown[] = []
afterEach(() => {
  const reported = errors
  errors = []
  expect(reported).toEqual([])
})
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
})

let hosts = 0
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
) {
  const Host = Component({
    selector: 'probe-host',
    standalone: true,
    imports,
    host: { 'data-n': String(++hosts) },
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class {
      p: Record<string, unknown> = props
      events: string[] = []
      on(event: Event): void {
        this.events.push(`${event.type}@${(event.currentTarget as Element).tagName.toLowerCase()}`)
      }
    },
  )
  const app = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      { provide: ErrorHandler, useValue: { handleError: (error: unknown) => errors.push(error) } },
    ],
  })
  apps.push(app)
  const ref = createComponent(Host as Type<{ p: Record<string, unknown>; events: string[] }>, {
    environmentInjector: app.injector,
  })
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  app.attachView(ref.hostView)
  app.tick()
  return {
    root,
    app,
    events: ref.instance.events,
    set(next: Record<string, unknown>) {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      app.tick()
    },
  }
}
const shape = (root: Element): string => root.innerHTML.replace(/<!--.*?-->/g, '')

/** A provider that renders only its children: registers on its host, which leaves the page. */
const Provider = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-provider',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['value'],
  template: `<ng-content></ng-content>`,
})(
  class Provider {
    value = ''
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      provide(host, this)
      usePlacement(() => {
        placeContentBefore(host, host)
        setElementPresent(host, false)
      })
    }
  },
)

/** A consumer whose own host is out of the page too: it renders `<b>` in its place. */
const Reader = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-reader',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['name'],
  template: `<b #root [attr.data-reader]="name">{{ read() }}</b>`,
})(
  class Reader {
    name = ''
    root?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    constructor() {
      usePlacement(() => {
        placeElementBefore(this.root?.nativeElement, this.host)
        setElementPresent(this.host, false)
      })
    }
    read(): string {
      return (find(this.host) as { value: string } | undefined)?.value ?? 'none'
    }
  },
)
ViewChild('root')(Reader.prototype, 'root')
const readers = (root: ParentNode): string =>
  Array.from(
    root.querySelectorAll('[data-reader]'),
    (b) => `${b.getAttribute('data-reader')}=${b.textContent}`,
  ).join(' ')

/** Angular DI cannot do this one: the provider is in another component's view, the reader is projected through it. */
const Through = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-through',
  standalone: true,
  imports: [Provider],
  template: `<section><mol-provider [value]="'T'"><ng-content></ng-content></mol-provider></section>`,
})(class Through {})

/** A portal: the panel renders in `document.body`, its context is the declaring component's. */
const Portal = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-portal',
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<div #panel data-panel=""><ng-content></ng-content></div>`,
})(
  class Portal {
    panel?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      provide(host, { value: 'portal' })
      usePlacement(() => {
        placeElement(this.panel?.nativeElement, document.body)
        setElementPresent(host, false)
      })
    }
  },
)
ViewChild('panel')(Portal.prototype, 'panel')

/** ToastProvider's shape: a capture's content in front of the host, the capture and the host absent. */
const CaptureProvider = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-capture-provider',
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<span #capture><ng-content></ng-content></span><div #box data-box=""></div>`,
})(
  class CaptureProvider {
    capture?: ElementRef<HTMLElement>
    box?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      provide(host, { value: 'C' })
      usePlacement(() => {
        const capture = this.capture?.nativeElement
        if (!capture) return
        placeContentBefore(capture, host)
        setElementPresent(capture, false)
        setElementPresent(host, false)
        placeElement(this.box?.nativeElement, document.body)
      })
    }
  },
)
ViewChild('capture')(CaptureProvider.prototype, 'capture')
ViewChild('box')(CaptureProvider.prototype, 'box')

/** Tooltip's shape: the slot renders inside an element that stands in front of the host. */
const Moved = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-moved',
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<div #wrap data-wrap=""></div><span #capture><ng-content></ng-content></span>`,
})(
  class Moved {
    wrap?: ElementRef<HTMLElement>
    capture?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      provide(host, { value: 'M' })
      usePlacement(() => {
        const wrap = this.wrap?.nativeElement
        const capture = this.capture?.nativeElement
        if (!wrap || !capture) return
        placeElementBefore(wrap, host)
        setElementPresent(host, false)
        placeContent(capture, wrap)
        setElementPresent(capture, false)
      })
    }
  },
)
ViewChild('wrap')(Moved.prototype, 'wrap')
ViewChild('capture')(Moved.prototype, 'capture')

describe('context through the rendered tree', () => {
  it("a provider's children resolve it, a sibling under the same DOM parent does not", async () => {
    const m = await mount(
      `<mol-reader name="before" /><mol-provider [value]="'P'"><mol-reader name="in" />@if (p['more']) {<mol-reader name="late" />}</mol-provider><mol-reader name="after" />`,
      [Provider, Reader],
    )
    expect(shape(m.root)).not.toContain('mol-')
    expect(readers(m.root)).toBe('before=none in=P after=none')
    m.set({ more: true })
    expect(readers(m.root)).toBe('before=none in=P late=P after=none')
  })
  it('the nearest provider wins, and a provider is a child of the one around it', async () => {
    const m = await mount(
      `<mol-provider [value]="'outer'"><mol-reader name="a" /><mol-provider [value]="'inner'"><mol-reader name="b" /></mol-provider><mol-reader name="c" /></mol-provider><mol-reader name="d" />`,
      [Provider, Reader],
    )
    expect(readers(m.root)).toBe('a=outer b=inner c=outer d=none')
  })
  it('content projected through another component resolves the provider in that component', async () => {
    const m = await mount(
      `<mol-through><p><mol-reader name="in" /></p></mol-through><mol-reader name="out" />`,
      [Through, Reader],
    )
    expect(shape(m.root)).toBe(
      '<mol-through><section><p><b data-reader="in">T</b></p></section></mol-through><b data-reader="out">none</b>',
    )
  })
  it("a portal's content resolves the component that declared it", async () => {
    const m = await mount(
      `<mol-portal><mol-reader name="in" /></mol-portal><mol-reader name="out" />`,
      [Portal, Reader],
    )
    const panel = document.body.querySelector('[data-panel]') as HTMLElement
    expect(panel.parentElement).toBe(document.body)
    m.set({})
    expect(readers(document.body)).toBe('out=none in=portal')
  })
  it("a capture's content in front of the host resolves the host; the portalled box's neighbours do not", async () => {
    const m = await mount(
      `<mol-capture-provider><mol-reader name="in" /></mol-capture-provider><mol-reader name="out" />`,
      [CaptureProvider, Reader],
    )
    expect(readers(m.root)).toBe('in=C out=none')
  })
  it('a slot rendered inside an element in front of the host resolves the host', async () => {
    const m = await mount(
      `<mol-moved><mol-reader name="in" /></mol-moved><mol-reader name="out" />`,
      [Moved, Reader],
    )
    expect(shape(m.root)).toBe(
      '<div data-wrap=""><b data-reader="in">M</b></div><b data-reader="out">none</b>',
    )
  })
  it('costs one sibling scan per hop', async () => {
    const m = await mount(
      `<mol-provider [value]="'P'">@for (i of p['items']; track i) {<i></i>}<mol-reader name="last" /></mol-provider>`,
      [Provider, Reader],
      { items: Array.from({ length: 2000 }, (_, i) => i) },
    )
    const last = m.root.querySelector('[data-reader]') as HTMLElement
    expect(last.textContent).toBe('P')
    const start = performance.now()
    const readerHost = renderedParent(last)
    expect(renderedParent(readerHost)?.tagName).toBe('MOL-PROVIDER')
    for (let i = 0; i < 1000; i++) renderedParent(readerHost)
    console.log(
      `renderedParent over 2000 siblings: ${((performance.now() - start) / 1000).toFixed(4)} ms per call`,
    )
    // A parent that holds no run is not scanned at all.
    const m2 = await mount(
      `<ul>@for (i of p['items']; track i) {<li></li>}<li><mol-reader name="x" /></li></ul>`,
      [Reader],
      {
        items: Array.from({ length: 2000 }, (_, i) => i),
      },
    )
    const li = (m2.root.querySelector('[data-reader]') as HTMLElement).parentElement as HTMLElement
    const start2 = performance.now()
    for (let i = 0; i < 1000; i++) renderedParent(li)
    console.log(
      `renderedParent, 2000 siblings in a parent that holds no run: ${((performance.now() - start2) / 1000).toFixed(4)} ms per call`,
    )
  })
})

/** One element in the host's place. */
const One = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-one',
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<button #root type="button"><span data-inner="">x</span></button>`,
})(
  class One {
    root?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      usePlacement(() => {
        placeElementBefore(this.root?.nativeElement, host)
        setElementPresent(host, false)
      })
    }
  },
)
ViewChild('root')(One.prototype, 'root')

/** Switch's shape: a fragment of two elements; React spreads the rest props on the button. */
const Two = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-two',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['names'],
  template: `<button #button type="button">b</button><label>l</label>`,
})(
  class Two {
    names = false
    button?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      usePlacement(() => {
        placeContentBefore(host, host)
        setElementPresent(host, false)
        if (this.names) setHostRoot(host, this.button?.nativeElement)
      })
    }
  },
)
ViewChild('button')(Two.prototype, 'button')

/** React renders one of two roots. */
const Swap = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-swap',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['loading'],
  template: `@if (loading) {<span #a>…</span>} @else {<div #b>done</div>}`,
})(
  class Swap {
    loading = true
    a?: ElementRef<HTMLElement>
    b?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      usePlacement(() => {
        placeElementBefore(this.a?.nativeElement, host)
        placeElementBefore(this.b?.nativeElement, host)
        setElementPresent(host, false)
      })
    }
  },
)
ViewChild('a')(Swap.prototype, 'a')
ViewChild('b')(Swap.prototype, 'b')

/** Modal's shape: everything renders in `document.body`; `names` makes it name its root. */
const Dialog = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-dialog',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['names'],
  template: `<div #dialog role="dialog"><ng-content></ng-content></div>`,
})(
  class Dialog {
    names = false
    dialog?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      usePlacement(() => {
        placeElement(this.dialog?.nativeElement, document.body)
        setElementPresent(host, false)
        if (this.names) setHostRoot(host, this.dialog?.nativeElement)
      })
    }
  },
)
ViewChild('dialog')(Dialog.prototype, 'dialog')

/** ConfirmDialog's shape: it renders another component whose host is out of the page too. */
const Confirm = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-confirm',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Dialog],
  template: `<mol-dialog #inner [names]="true"><u>sure?</u></mol-dialog>`,
})(
  class Confirm {
    inner?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      usePlacement(() => {
        setElementPresent(host, false)
        setHostRoot(host, this.inner?.nativeElement)
      })
    }
  },
)
ViewChild('inner', { read: ElementRef })(Confirm.prototype, 'inner')

const click = (el: Element | null, type = 'click'): void => {
  ;(el as Element).dispatchEvent(new Event(type, { bubbles: true }))
}

describe("the consumer's bindings on the tag of a component whose host is out of the page", () => {
  it('one root: listeners, attributes, classes and styles land on it and follow the bindings', async () => {
    const m = await mount(
      `<mol-one (click)="on($event)" class="k" data-testid="t" [attr.aria-label]="p['label']" [class.on]="p['on']" [style.color]="p['color']" />`,
      [One],
      { label: 'first', on: true, color: 'red' },
    )
    expect(shape(m.root)).toBe(
      '<button type="button" data-testid="t" class="k on" style="color: red;" aria-label="first"><span data-inner="">x</span></button>',
    )
    click(m.root.querySelector('[data-inner]'))
    expect(m.events).toEqual(['click@button'])
    m.set({ label: null, on: false, color: null })
    expect(shape(m.root)).toBe(
      '<button type="button" data-testid="t" class="k" style=""><span data-inner="">x</span></button>',
    )
    m.set({ label: 'again' })
    expect(m.root.querySelector('button')?.getAttribute('aria-label')).toBe('again')
  })
  it('several elements in its place: a listener hears each of them, as the enclosing host did', async () => {
    const m = await mount(`<mol-two (keydown)="on($event)" />`, [Two])
    click(m.root.querySelector('button'), 'keydown')
    click(m.root.querySelector('label'), 'keydown')
    expect(m.events).toEqual(['keydown@button', 'keydown@label'])
  })
  it('a named root takes the listeners and the attributes alone', async () => {
    const m = await mount(
      `<mol-two [names]="true" (keydown)="on($event)" data-testid="sw" [attr.aria-label]="p['label']" />`,
      [Two],
      {
        label: 'Dark mode',
      },
    )
    click(m.root.querySelector('button'), 'keydown')
    click(m.root.querySelector('label'), 'keydown')
    expect(m.events).toEqual(['keydown@button'])
    expect(shape(m.root)).toBe(
      '<button type="button" data-testid="sw" aria-label="Dark mode">b</button><label>l</label>',
    )
  })
  it('follows the root when React renders another one', async () => {
    const m = await mount(
      `<mol-swap [loading]="p['loading']" (click)="on($event)" data-testid="s" [attr.title]="p['title']" />`,
      [Swap],
      {
        loading: true,
        title: 'one',
      },
    )
    expect(shape(m.root)).toBe('<span data-testid="s" title="one">…</span>')
    m.set({ loading: false })
    expect(shape(m.root)).toBe('<div data-testid="s" title="one">done</div>')
    click(m.root.querySelector('div'))
    m.set({ title: 'two', loading: true })
    expect(shape(m.root)).toBe('<span data-testid="s" title="two">…</span>')
    click(m.root.querySelector('span'))
    expect(m.events).toEqual(['click@div', 'click@span'])
  })
  it('a portal that names its root', async () => {
    const m = await mount(
      `<mol-dialog [names]="true" (click)="on($event)" aria-label="Settings"><u>x</u></mol-dialog>`,
      [Dialog],
    )
    const dialog = document.body.querySelector('[role=dialog]') as HTMLElement
    expect(dialog.getAttribute('aria-label')).toBe('Settings')
    click(dialog.querySelector('u'))
    expect(m.events).toEqual(['click@div'])
  })
  it('a component that renders another one passes its bindings on', async () => {
    const m = await mount(`<mol-confirm (click)="on($event)" data-testid="c" />`, [Confirm])
    const dialog = document.body.querySelector('[role=dialog]') as HTMLElement
    expect(dialog.getAttribute('data-testid')).toBe('c')
    click(dialog.querySelector('u'))
    expect(m.events).toEqual(['click@div'])
  })
  it('a listener with nowhere to land is refused, naming the tag and the binding', async () => {
    await mount(`<mol-dialog (click)="on($event)"><u>x</u></mol-dialog>`, [Dialog])
    expect(errors.map((error) => (error as Error).message)).toEqual([
      expect.stringMatching(
        /^\(click\) is bound on <mol-dialog>, which renders no element in its place/,
      ),
    ])
    errors = []
  })
  it('stops listening when the consumer removes the component', async () => {
    const m = await mount(`@if (p['shown']) {<mol-one (click)="on($event)" />}`, [One], {
      shown: true,
    })
    const button = m.root.querySelector('button') as HTMLElement
    click(button)
    m.set({ shown: false })
    click(button)
    expect(m.events).toEqual(['click@button'])
  })
  it("the component's own host listeners and host bindings land on its root too", async () => {
    const m = await mount(`<mol-own-host />`, [OwnHost])
    const button = m.root.querySelector('button') as HTMLElement
    expect(button.getAttribute('aria-pressed')).toBe('false')
    click(button.querySelector('[data-inner]'))
    // The listener marked the view for check, as on a host in the page; the next tick renders it.
    m.app.tick()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(shape(m.root)).toBe(
      '<button type="button" aria-pressed="true"><span data-inner="">x</span></button>',
    )
  })
})

/** One root, with a host listener and a host binding of its own (`host: { … }`). */
const OwnHost = Component({
  // A port: checked as OnPush, as every port component is.
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mol-own-host',
  standalone: true,
  hostDirectives: [MolPlacement],
  host: { '(click)': 'pressed = !pressed', '[attr.aria-pressed]': 'pressed' },
  template: `<button #root type="button"><span data-inner="">x</span></button>`,
})(
  class OwnHost {
    pressed = false
    root?: ElementRef<HTMLElement>
    constructor() {
      const host = inject(ElementRef).nativeElement as HTMLElement
      usePlacement(() => {
        placeElementBefore(this.root?.nativeElement, host)
        setElementPresent(host, false)
      })
    }
  },
)
ViewChild('root')(OwnHost.prototype, 'root')
