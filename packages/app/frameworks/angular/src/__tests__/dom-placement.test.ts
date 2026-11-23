// @vitest-environment jsdom

/**
 * DOM placement: the components of the Angular ports render the DOM React
 * renders (an element that is absent, one rendered in another parent, a slot
 * rendered bare, one wrapper per child) without ever moving a node Angular
 * placed, so Angular's own inserts, moves and removals keep working.
 *
 * The cases that made this one shared module:
 *
 * - a component whose visibility is a signal written OUTSIDE a template event
 *   (a document listener, a timer): Angular refreshes only that component's
 *   view, so a host restored from `ngDoCheck` stayed out of the page and the
 *   content never showed (the auth-modal mount's signup modal, 2026-11-23);
 * - a consumer `@for` inserting before an absent or a wrapped node: Angular
 *   inserts before the node of the next view, under the parent of its anchor,
 *   and threw NG05106 when a component had moved that node (the carousel and a
 *   list of notification badges, 2026-11-23).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  ElementRef,
  inject,
  provideZonelessChangeDetection,
  signal,
  type Type,
  ViewChild,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import {
  hasContent,
  MolWrapEachChild,
  placeContent,
  placeElement,
  provideDomPlacement,
  setElementPresent,
  useHostPresence,
  WrappedChildren,
} from '../dom-placement.js'

/** The probes rendered so far, newest last (JIT compiles no signal queries without the CLI transform). */
const probes: PresenceProbe[] = []

/** Renders its content only while `shown`, a signal it owns. */
@Component({
  selector: 'mol-presence-probe',
  standalone: true,
  template: `@if (shown()) {
    <span data-probe-content="">on</span>
  }`,
})
class PresenceProbe {
  /** Whether the probe renders anything. */
  readonly shown = signal(false)

  constructor() {
    useHostPresence(() => this.shown())
    probes.push(this)
  }
}

/** Keeps a field rendered while its host leaves the page, the way a dialog's form does. */
@Component({
  selector: 'mol-presence-field',
  standalone: true,
  template: `<input data-probe-field="" />`,
})
class PresenceField {
  /** Whether the host is in the page. */
  readonly visible = signal(true)

  constructor() {
    useHostPresence(() => this.visible())
    fields.push(this)
  }
}

/** The field probes rendered so far, newest last. */
const fields: PresenceField[] = []

/** Places the probe between two neighbours; `present` takes the probe out of the view. */
@Component({
  selector: 'mol-presence-host',
  standalone: true,
  imports: [PresenceProbe, PresenceField],
  template: `<mol-presence-field></mol-presence-field><i data-before=""></i>
    @if (present()) {
      <mol-presence-probe></mol-presence-probe>
    }
    @if (after()) {
      <i data-after=""></i>
    }`,
})
class PresenceHost {
  /** Whether the probe is in the view. */
  readonly present = signal(true)
  /** Whether the neighbour after the probe is in the view. */
  readonly after = signal(true)
  /** The newest rendered probe. */
  probe(): PresenceProbe | undefined {
    return probes.at(-1)
  }
}

/** An item that renders its name only while `visible`, a plain input, as notification badges do. */
const ListItem = Component({
  selector: 'div[mol-list-item]',
  standalone: true,
  inputs: ['visible', 'name'],
  template: `@if (visible) {
    <b>{{ name }}</b>
  }`,
})(
  class ListItem {
    /** Whether the item renders anything. */
    visible?: boolean
    /** The text it renders. */
    name?: string

    constructor() {
      useHostPresence(() => this.visible === true)
    }
  },
)

const apps: ApplicationRef[] = []

/**
 * Renders a host component into the document and runs one change detection.
 *
 * @param component - The host component.
 * @param providers - The application's providers (default: zoneless + DOM placement).
 * @returns The app and the host's component ref.
 */
async function render<T>(
  component: Type<T>,
  providers: unknown[] = [provideZonelessChangeDetection(), provideDomPlacement()],
): Promise<{ app: ApplicationRef; root: HTMLElement; ref: ComponentRef<T> }> {
  const app = await createApplication({ providers: providers as never })
  apps.push(app)
  const ref = createComponent(component, { environmentInjector: app.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  app.attachView(ref.hostView)
  app.tick()
  return { app, root: ref.location.nativeElement as HTMLElement, ref }
}

/**
 * Renders `template` in a host whose `p` holds the props, with `imports` available.
 *
 * @param template - The host's template; it reads its props as `p['name']`.
 * @param imports - The components and directives the template uses.
 * @param props - The props it starts with.
 * @returns The rendered root and a setter that merges props and runs one change detection.
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown>,
): Promise<{ root: HTMLElement; set: (next: Record<string, unknown>) => void }> {
  const Host = Component({
    selector: 'mol-placement-host',
    standalone: true,
    imports,
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class PlacementHost {
      p: Record<string, unknown> = props
    },
  )
  const { app, root, ref } = await render(Host as Type<{ p: Record<string, unknown> }>)
  return {
    root,
    set: (next) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      app.tick()
    },
  }
}

/** The probe's host element, wherever it is. */
function probeElement(root: HTMLElement): Element | null {
  return root.querySelector('mol-presence-probe')
}

/** The text of every list item in the page, in order. */
function shownItems(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('[mol-list-item]')).map((el) => el.textContent ?? '')
}

afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  probes.length = 0
  fields.length = 0
  document.body.replaceChildren()
})

describe('provideDomPlacement', () => {
  it('is required by useHostPresence, which names it when it is missing', async () => {
    const app = await createApplication({ providers: [provideZonelessChangeDetection()] })
    apps.push(app)
    expect(() => createComponent(PresenceProbe, { environmentInjector: app.injector })).toThrow(
      /provideDomPlacement\(\)/,
    )
  })
})

describe('useHostPresence', () => {
  it('leaves no element in the page while the component renders nothing', async () => {
    const { root } = await render(PresenceHost)
    expect(probeElement(root)).toBeNull()
    expect(root.querySelectorAll('i')).toHaveLength(2)
  })

  it('puts the host back in its place when a signal written outside a template event shows it', async () => {
    const { app, root, ref } = await render(PresenceHost)
    // Written the way a document listener or a timer writes it: no template event, so
    // Angular refreshes only the probe's own view, and its parent's ngDoCheck never runs.
    ref.instance.probe()!.shown.set(true)
    app.tick()
    const probe = probeElement(root)
    expect(probe?.isConnected).toBe(true)
    expect(probe?.querySelector('[data-probe-content]')?.textContent).toBe('on')
    expect(probe?.previousElementSibling?.hasAttribute('data-before')).toBe(true)
    expect(probe?.nextElementSibling?.hasAttribute('data-after')).toBe(true)
  })

  it('takes the host out again when the component renders nothing again', async () => {
    const { app, root, ref } = await render(PresenceHost)
    ref.instance.probe()!.shown.set(true)
    app.tick()
    ref.instance.probe()!.shown.set(false)
    app.tick()
    expect(probeElement(root)).toBeNull()
  })

  it('returns to its place after a neighbour left while it was out', async () => {
    const { app, root, ref } = await render(PresenceHost)
    ref.instance.after.set(false)
    app.tick()
    ref.instance.probe()!.shown.set(true)
    app.tick()
    const probe = probeElement(root)
    expect(probe?.previousElementSibling?.hasAttribute('data-before')).toBe(true)
    expect(probe?.nextElementSibling).toBeNull()
  })

  it('blurs a field focused inside the host as the host leaves, as React removing it does', async () => {
    const { app } = await render(PresenceHost)
    const input = document.querySelector('[data-probe-field]') as HTMLInputElement
    input.focus()
    expect(document.activeElement).toBe(input)
    const focusouts: EventTarget[] = []
    document.addEventListener('focusout', (event) => focusouts.push(event.target!))
    fields.at(-1)!.visible.set(false)
    app.tick()
    expect(input.isConnected).toBe(false)
    expect(document.activeElement).not.toBe(input)
    expect(focusouts).toContain(input)
  })

  it('leaves neither the host nor its placeholder behind once the view removes it', async () => {
    const { app, root, ref } = await render(PresenceHost)
    ref.instance.present.set(false)
    app.tick()
    expect(probeElement(root)).toBeNull()
    // The host's view held only the probe: nothing of it may stay in the parent.
    expect(
      [...root.childNodes].filter(
        (node) => node.nodeType === Node.COMMENT_NODE && node.textContent === '',
      ),
    ).toHaveLength(0)
    expect(document.querySelector('mol-presence-probe')).toBeNull()
  })

  it('lets a list insert an item before an item that renders nothing', async () => {
    const m = await mount(
      `<section>@for (x of p['xs']; track x.n) {<div mol-list-item [visible]="x.v" [name]="x.n"></div>}</section>`,
      [ListItem as Type<unknown>],
      { xs: [{ n: 'b', v: false }] },
    )
    expect(shownItems(m.root)).toEqual([])
    // Angular inserts `a` before the first node of `b`'s view, which is the absent host.
    m.set({
      xs: [
        { n: 'a', v: true },
        { n: 'b', v: false },
      ],
    })
    expect(shownItems(m.root)).toEqual(['a'])
    m.set({
      xs: [
        { n: 'a', v: true },
        { n: 'b', v: true },
      ],
    })
    expect(shownItems(m.root)).toEqual(['a', 'b'])
  })

  it('shows an item in its new place after the list reordered it while it rendered nothing', async () => {
    const a = { n: 'a', v: true }
    const b = { n: 'b', v: false }
    const c = { n: 'c', v: true }
    const m = await mount(
      `<section>@for (x of p['xs']; track x.n) {<div mol-list-item [visible]="x.v" [name]="x.n"></div>}</section>`,
      [ListItem as Type<unknown>],
      { xs: [a, c, b] },
    )
    m.set({ xs: [b, a, c] })
    // Moved by Angular while absent: still absent, with no empty element left in the page.
    expect(shownItems(m.root)).toEqual(['a', 'c'])
    expect(m.root.querySelectorAll('[mol-list-item]')).toHaveLength(2)
    m.set({ xs: [a, { n: 'b', v: true }, c] })
    expect(shownItems(m.root)).toEqual(['a', 'b', 'c'])
  })

  it('builds content that a plain input turns on inside the document', async () => {
    const connected: boolean[] = []
    const Kid = Component({ selector: 'i[mol-kid]', standalone: true, template: `k` })(
      class Kid {
        private readonly el = inject(ElementRef).nativeElement as HTMLElement
        ngAfterViewInit(): void {
          connected.push(this.el.isConnected)
        }
      },
    )
    const Box = Component({
      selector: 'div[mol-box]',
      standalone: true,
      inputs: ['open'],
      imports: [Kid as Type<unknown>],
      template: `<p>@if (open) {<i mol-kid></i>}</p>@if (open) {<i mol-kid></i>}`,
    })(
      class Box {
        open?: boolean
        constructor() {
          useHostPresence(() => this.open === true)
        }
      },
    )
    const m = await mount(`<div mol-box [open]="p['open']"></div>`, [Box as Type<unknown>], {
      open: false,
    })
    expect(m.root.querySelector('[mol-box]')).toBeNull()
    m.set({ open: true })
    // One nested in a static element, one at the host's top level: both measured in the page.
    expect(connected).toEqual([true, true])
    expect(m.root.querySelectorAll('[mol-kid]')).toHaveLength(2)
    m.set({ open: false })
    expect(m.root.querySelector('[mol-box]')).toBeNull()
  })
})

describe('useHostPresence with a predicate that renders no new node', () => {
  it('checks the content once more inside the page after a late restore', async () => {
    const seen: boolean[] = []
    // Like a Button that hides an empty icon slot only while it is in the page.
    const Kid = Component({ selector: 'i[mol-late-kid]', standalone: true, template: `k` })(
      class LateKid {
        private readonly el = inject(ElementRef).nativeElement as HTMLElement
        ngAfterViewChecked(): void {
          seen.push(this.el.isConnected)
        }
      },
    )
    // The template does not depend on `count`: showing it inserts and updates nothing.
    const Bar = Component({
      selector: 'div[mol-late-bar]',
      standalone: true,
      inputs: ['count'],
      imports: [Kid as Type<unknown>],
      template: `<i mol-late-kid></i>`,
    })(
      class LateBar {
        count = 0
        constructor() {
          useHostPresence(() => this.count > 0)
        }
      },
    )
    const m = await mount(`<div mol-late-bar [count]="p['count']"></div>`, [Bar as Type<unknown>], {
      count: 0,
    })
    expect(m.root.querySelector('[mol-late-bar]')).toBeNull()
    m.set({ count: 2 })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(m.root.querySelector('[mol-late-bar]')).not.toBeNull()
    expect(seen.at(-1)).toBe(true)
  })
})

describe('setElementPresent', () => {
  it('takes an element out and puts it back in the same place', () => {
    const parent = document.createElement('div')
    parent.innerHTML = '<i></i><b></b><u></u>'
    const b = parent.querySelector('b')!
    setElementPresent(b, false)
    expect(b.parentNode).toBeNull()
    expect(parent.innerHTML).toBe('<i></i><!----><u></u>')
    setElementPresent(b, false)
    expect(parent.innerHTML).toBe('<i></i><!----><u></u>')
    setElementPresent(b, true)
    expect(parent.innerHTML).toBe('<i></i><b></b><u></u>')
  })

  it('counts an element with a parent as present, even inside a parent that is not in the document', () => {
    const detached = document.createElement('div')
    detached.innerHTML = '<span></span>'
    const span = detached.querySelector('span')!
    // Never taken out: left where it is.
    setElementPresent(span, true)
    expect(span.parentNode).toBe(detached)
    setElementPresent(span, false)
    expect(detached.contains(span)).toBe(false)
    setElementPresent(span, true)
    expect(span.parentNode).toBe(detached)
  })

  it('does nothing without an element', () => {
    expect(() => setElementPresent(null, false)).not.toThrow()
    expect(() => setElementPresent(undefined, true)).not.toThrow()
  })
})

describe('placeElement', () => {
  /** Renders its panel in the body while `portal` is set, as a dropdown's menu does. */
  const Portal = Component({
    selector: 'mol-portal',
    standalone: true,
    inputs: ['portal', 'label'],
    template: `<div #panel data-panel="">{{ label }}</div>`,
  })(
    class Portal {
      portal?: boolean
      label?: string
      panel?: ElementRef<HTMLElement>
      ngAfterViewChecked(): void {
        placeElement(this.panel?.nativeElement, this.portal ? document.body : null)
      }
    },
  )
  ViewChild('panel')(Portal.prototype, 'panel')

  it('renders the element in the body and back in its place', async () => {
    const m = await mount(
      `<mol-portal [portal]="p['portal']" [label]="p['label']"></mol-portal>`,
      [Portal as Type<unknown>],
      { portal: true, label: 'menu' },
    )
    const panel = document.querySelector('[data-panel]') as HTMLElement
    expect(panel.parentNode).toBe(document.body)
    expect(m.root.contains(panel)).toBe(false)
    m.set({ label: 'menu 2' })
    expect(panel.textContent).toBe('menu 2')
    m.set({ portal: false })
    expect(panel.parentNode).toBe(m.root.querySelector('mol-portal'))
  })

  /** Renders each item's panel in the body, the panels being the roots of its `@for` views. */
  const PortalList = Component({
    selector: 'mol-portal-list',
    standalone: true,
    inputs: ['items'],
    template: `@for (x of items; track x) {<div data-list-panel="">{{ x }}</div>}`,
  })(
    class PortalList {
      items?: string[]
      private readonly host = inject(ElementRef).nativeElement as HTMLElement
      ngAfterViewChecked(): void {
        for (const panel of Array.from(this.host.querySelectorAll('[data-list-panel]'))) {
          placeElement(panel, document.body)
        }
      }
    },
  )

  /** The text of each panel rendered in the body, matching `selector`. */
  const inBody = (selector: string): string[] =>
    Array.from(document.body.querySelectorAll(`:scope > ${selector}`)).map(
      (el) => el.textContent ?? '',
    )

  it('lets a list insert before an item whose element is in the body, and remove it', async () => {
    const m = await mount(
      `<mol-portal-list [items]="p['xs']"></mol-portal-list>`,
      [PortalList as Type<unknown>],
      { xs: ['b'] },
    )
    expect(inBody('[data-list-panel]')).toEqual(['b'])
    // Angular inserts `a` before the first node of `b`'s view, which is now in the body.
    m.set({ xs: ['a', 'b'] })
    expect(inBody('[data-list-panel]').sort()).toEqual(['a', 'b'])
    m.set({ xs: ['a'] })
    expect(inBody('[data-list-panel]')).toEqual(['a'])
    // Nothing of `b` is left where it was rendered.
    const list = m.root.querySelector('mol-portal-list') as HTMLElement
    const empty = [...list.childNodes].filter(
      (node) => node.nodeType === Node.COMMENT_NODE && node.textContent === '',
    )
    expect(empty).toHaveLength(1)
  })

  it('removes the element from the body when the component that rendered it goes', async () => {
    const m = await mount(
      `@if (p['on']) {<mol-portal [portal]="true" label="menu"></mol-portal>}`,
      [Portal as Type<unknown>],
      { on: true },
    )
    expect(inBody('[data-panel]')).toEqual(['menu'])
    // Angular removes only the view's root node, the component's host.
    m.set({ on: false })
    expect(inBody('[data-panel]')).toEqual([])
  })
})

describe('placeContent', () => {
  /** React: `bare ? <>{label}</> : <span>{label}</span>`, before a fixed `<em>`. */
  const Label = Component({
    selector: 'button[mol-label]',
    standalone: true,
    inputs: ['bare'],
    template: `<span #capture><ng-content></ng-content></span><em>end</em>`,
  })(
    class Label {
      bare?: boolean
      capture?: ElementRef<HTMLElement>
      private readonly host = inject(ElementRef).nativeElement as HTMLElement
      ngDoCheck(): void {
        this.apply()
      }
      ngAfterViewChecked(): void {
        this.apply()
      }
      private apply(): void {
        const capture = this.capture?.nativeElement
        if (!capture) return
        if (this.bare) {
          placeContent(capture, this.host, capture)
          setElementPresent(capture, false)
        } else {
          setElementPresent(capture, true)
          placeContent(capture, null)
        }
      }
    },
  )
  ViewChild('capture')(Label.prototype, 'capture')

  /** The button's markup without comments. */
  const html = (root: HTMLElement): string => root.innerHTML.replace(/<!--.*?-->/g, '')

  it('renders the slot bare or wrapped while the consumer list inserts and reorders', async () => {
    const m = await mount(
      `<button mol-label [bare]="p['bare']">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</button>`,
      [Label as Type<unknown>],
      { xs: [1, 3], bare: true },
    )
    m.set({})
    expect(html(m.root)).toBe('<button mol-label=""><b>1</b><b>3</b><em>end</em></button>')
    m.set({ xs: [0, 1, 2, 3, 4] })
    expect(html(m.root)).toBe(
      '<button mol-label=""><b>0</b><b>1</b><b>2</b><b>3</b><b>4</b><em>end</em></button>',
    )
    m.set({ bare: false })
    expect(html(m.root)).toBe(
      '<button mol-label=""><span><b>0</b><b>1</b><b>2</b><b>3</b><b>4</b></span><em>end</em></button>',
    )
    m.set({ xs: [9, 0, 4] })
    expect(html(m.root)).toBe(
      '<button mol-label=""><span><b>9</b><b>0</b><b>4</b></span><em>end</em></button>',
    )
    m.set({ bare: true, xs: [] })
    m.set({ xs: [7, 8] })
    expect(html(m.root)).toBe('<button mol-label=""><b>7</b><b>8</b><em>end</em></button>')
  })
})

describe('hasContent', () => {
  it('counts elements and text, not whitespace or comments', () => {
    const el = document.createElement('div')
    expect(hasContent(el)).toBe(false)
    el.innerHTML = '\n  <!--container-->  '
    expect(hasContent(el)).toBe(false)
    el.append('label')
    expect(hasContent(el)).toBe(true)
    el.innerHTML = '<!---->'
    el.append(document.createElement('i'))
    expect(hasContent(el)).toBe(true)
    expect(hasContent(null)).toBe(false)
  })

  it('reads a slot rendered elsewhere, and back in place', () => {
    const host = document.createElement('div')
    const capture = document.createElement('span')
    capture.innerHTML = '<b>x</b>'
    host.append(capture)
    placeContent(capture, host, capture)
    expect(capture.querySelector('b')).toBeNull()
    expect(hasContent(capture)).toBe(true)
    host.querySelector('b')!.remove()
    expect(hasContent(capture)).toBe(false)
    placeContent(capture, null)
    expect(hasContent(capture)).toBe(false)
    capture.append('text')
    expect(hasContent(capture)).toBe(true)
  })
})

describe('WrappedChildren', () => {
  /** React: `<div data-track>{children.map((c) => <div data-wrapper>{c}</div>)}</div><p>{n}</p>`. */
  const Track = Component({
    selector: 'mol-track',
    standalone: true,
    providers: [WrappedChildren],
    imports: [MolWrapEachChild],
    template: `<div molWrapEachChild data-track=""><ng-content></ng-content></div><p data-count="">{{ children.wrappers().length }}</p>`,
  })(
    class Track {
      readonly children = inject(WrappedChildren)
      constructor() {
        this.children.wrapWith((document) => {
          const wrapper = document.createElement('div')
          wrapper.setAttribute('data-wrapper', '')
          return wrapper
        })
      }
    },
  )

  /** Each wrapper's text, in order. */
  const wrapped = (root: HTMLElement): string[] =>
    Array.from(root.querySelectorAll('[data-wrapper]')).map((el) => el.textContent ?? '')

  it('wraps each child once when the app provides the placement rules twice', async () => {
    const Host = Component({
      selector: 'mol-twice-host',
      standalone: true,
      imports: [Track as Type<unknown>],
      template: `<mol-track><i>a</i><i>b</i></mol-track>`,
    })(class TwiceHost {})
    const { root } = await render(Host as Type<unknown>, [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideDomPlacement(),
    ])
    expect(wrapped(root)).toEqual(['a', 'b'])
    expect(root.querySelectorAll('[data-wrapper] [data-wrapper]')).toHaveLength(0)
  })

  it('wraps every child, in the middle and at either end, without moving a placed one', async () => {
    const m = await mount(
      `<mol-track>@for (s of p['xs']; track s) {<i [attr.data-s]="s">{{ s }}</i>}</mol-track>`,
      [Track as Type<unknown>],
      { xs: [0, 2] },
    )
    expect(wrapped(m.root)).toEqual(['0', '2'])
    const first = m.root.querySelector('[data-s="0"]')
    const removed: Node[] = []
    const observer = new MutationObserver((records) => {
      for (const record of records) removed.push(...Array.from(record.removedNodes))
    })
    observer.observe(m.root, { childList: true, subtree: true })
    m.set({ xs: [-1, 0, 1, 2, 3] })
    await Promise.resolve()
    observer.disconnect()
    expect(wrapped(m.root)).toEqual(['-1', '0', '1', '2', '3'])
    expect(m.root.querySelector('[data-s="0"]')).toBe(first)
    expect(removed).toEqual([])
    expect(m.root.querySelector('[data-count]')?.textContent).toBe('5')
    // The marker attribute is not React's markup.
    expect(m.root.querySelector('[molwrapeachchild]')).toBeNull()
  })

  it('follows a reorder, drops the wrapper of a removed child and wraps a text child', async () => {
    const m = await mount(
      `<mol-track>@for (s of p['xs']; track s) {<i>{{ s }}</i>}@if (p['extra']) {plain {{ p['extra'] }}}</mol-track>`,
      [Track as Type<unknown>],
      { xs: [0, 1, 2], extra: '' },
    )
    m.set({ xs: [2, 0, 1] })
    expect(wrapped(m.root)).toEqual(['2', '0', '1'])
    m.set({ xs: [2, 1] })
    expect(wrapped(m.root)).toEqual(['2', '1'])
    m.set({ extra: 'text' })
    expect(wrapped(m.root)).toEqual(['2', '1', 'plain text'])
    expect(m.root.querySelector('[data-count]')?.textContent).toBe('3')
    m.set({ xs: [], extra: '' })
    expect(wrapped(m.root)).toEqual([])
    expect(m.root.querySelector('[data-count]')?.textContent).toBe('0')
    // Only wrappers and Angular's anchors are left in the track.
    const track = m.root.querySelector('[data-track]') as HTMLElement
    expect(Array.from(track.childNodes).every((node) => node.nodeType === Node.COMMENT_NODE)).toBe(
      true,
    )
  })
})
