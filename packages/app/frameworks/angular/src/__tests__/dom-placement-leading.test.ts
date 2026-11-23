// @vitest-environment jsdom
/**
 * placeElementBefore: a component whose React root is a fragment renders an element beside its
 * host, and the element stays in front of the host while Angular inserts, moves and removes.
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
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
  MolPlacement,
  MolWrapEachChild,
  placeContent,
  placeContentBefore,
  placeElement,
  placeElementBefore,
  provideDomPlacement,
  setElementPresent,
  usePlacement,
  WrappedChildren,
} from '../dom-placement.js'

const apps: ApplicationRef[] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
})

let hosts = 0
async function mount(template: string, imports: Type<unknown>[], props: Record<string, unknown>) {
  const Host = Component({
    selector: 'leading-host',
    standalone: true,
    imports,
    host: { 'data-n': String(++hosts) },
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
/** The markup without comments, the empty hosts written as `[f]`. */
const shape = (root: HTMLElement): string =>
  root.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replace(/<mol-frag[^>]*><\/mol-frag>/g, '[f]')
    .replace(/<mol-old[^>]*><\/mol-old>/g, '[f]')
    .replace(/<mol-gate-old[^>]*><\/mol-gate-old>/g, '[g]')

/** React: `<><div data-t data-single={one child}>{children}</div></>`; the host stays, empty. */
const Frag = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-frag',
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<div #trigger data-t=""><span #capture><ng-content></ng-content></span></div>`,
})(
  class Frag {
    trigger?: ElementRef<HTMLElement>
    capture?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    constructor() {
      usePlacement((hasContent) => {
        const trigger = this.trigger?.nativeElement
        const capture = this.capture?.nativeElement
        if (!trigger || !capture) return
        placeElementBefore(trigger, this.host)
        placeContent(capture, trigger)
        setElementPresent(capture, false)
        const children = hasContent.nodes(capture)
        trigger.setAttribute(
          'data-single',
          String(children.length === 1 && children[0].nodeType === 1),
        )
      })
    }
  },
)
ViewChild('trigger')(Frag.prototype, 'trigger')
ViewChild('capture')(Frag.prototype, 'capture')

/** What HEAD did: the trigger inserted before the host by hand, once. */
const Old = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-old',
  standalone: true,
  template: `<div #trigger data-t="" data-single="true"><ng-content></ng-content></div>`,
})(
  class Old {
    trigger?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    ngAfterViewInit(): void {
      this.host.parentNode?.insertBefore(this.trigger!.nativeElement, this.host)
    }
  },
)
ViewChild('trigger')(Old.prototype, 'trigger')

/** React: `<><b>one</b><b>two</b></>`. */
const Two = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-frag',
  standalone: true,
  hostDirectives: [MolPlacement],
  template: `<b #one>one</b><b #two>two</b>`,
})(
  class Two {
    one?: ElementRef<HTMLElement>
    two?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    constructor() {
      usePlacement(() => {
        placeElementBefore(this.one?.nativeElement, this.host)
        placeElementBefore(this.two?.nativeElement, this.host)
      })
    }
  },
)
ViewChild('one')(Two.prototype, 'one')
ViewChild('two')(Two.prototype, 'two')

/** React: `children.map((c) => <li>{c}</li>)`. */
const Track = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-track',
  standalone: true,
  providers: [WrappedChildren],
  imports: [MolWrapEachChild],
  template: `<ul molWrapEachChild><ng-content></ng-content></ul>`,
})(
  class Track {
    constructor() {
      inject(WrappedChildren).wrapWith((document) => document.createElement('li'))
    }
  },
)

const t = (text: string, single = true): string =>
  `<div data-t="" data-single="${single}">${text}</div>[f]`
const list = (tag: string): string =>
  `<i>head</i>@for (x of p['xs']; track x) {<${tag}><u>{{ x }}</u></${tag}>}<i>tail</i>`
const expected = (...xs: string[]): string =>
  `<i>head</i>${xs.map((x) => t(`<u>${x}</u>`)).join('')}<i>tail</i>`

/** React: `<>{on && <b>t</b>}</>`, the element placed in front of the host while `on`. */
const Toggle = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-toggle',
  standalone: true,
  inputs: ['on'],
  hostDirectives: [MolPlacement],
  template: `<b #el>t</b>`,
})(
  class Toggle {
    on = false
    el?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    constructor() {
      usePlacement(() => {
        const el = this.el?.nativeElement
        if (!el) return
        if (this.on) placeElementBefore(el, this.host)
        else setElementPresent(el, false)
        setElementPresent(this.host, false)
      })
    }
  },
)
ViewChild('el')(Toggle.prototype, 'el')

describe('placeElementBefore', () => {
  it('renders the element in front of the host, between the host’s siblings', async () => {
    const m = await mount(`<i>a</i><mol-frag>x</mol-frag><i>b</i>`, [Frag as Type<unknown>], {})
    expect(shape(m.root)).toBe(`<i>a</i>${t('x', false)}<i>b</i>`)
    m.set({})
    expect(shape(m.root)).toBe(`<i>a</i>${t('x', false)}<i>b</i>`)
  })

  it('keeps each element in front of its host while a consumer list inserts, reorders, removes, empties and refills', async () => {
    const m = await mount(list('mol-frag'), [Frag as Type<unknown>], { xs: ['a', 'c'] })
    expect(shape(m.root)).toBe(expected('a', 'c'))
    m.set({ xs: ['a', 'b', 'c'] })
    expect(shape(m.root)).toBe(expected('a', 'b', 'c'))
    m.set({ xs: ['c', 'b', 'a'] })
    expect(shape(m.root)).toBe(expected('c', 'b', 'a'))
    m.set({ xs: ['b', 'a'] })
    expect(shape(m.root)).toBe(expected('b', 'a'))
    m.set({ xs: ['z', 'b', 'a', 'y'] })
    expect(shape(m.root)).toBe(expected('z', 'b', 'a', 'y'))
    m.set({ xs: [] })
    expect(shape(m.root)).toBe(expected())
    m.set({ xs: ['a', 'c'] })
    expect(shape(m.root)).toBe(expected('a', 'c'))
  })

  it('goes with its host when a consumer @if removes it, and comes back with it', async () => {
    const m = await mount(
      `@if (p['before']) {<i>before</i>}@if (p['on']) {<mol-frag><u>x</u></mol-frag>}@if (p['after']) {<i>after</i>}`,
      [Frag as Type<unknown>],
      { on: true, before: false, after: false },
    )
    expect(shape(m.root)).toBe(t('<u>x</u>'))
    m.set({ before: true, after: true })
    expect(shape(m.root)).toBe(`<i>before</i>${t('<u>x</u>')}<i>after</i>`)
    m.set({ on: false })
    expect(shape(m.root)).toBe('<i>before</i><i>after</i>')
    m.set({ on: true })
    expect(shape(m.root)).toBe(`<i>before</i>${t('<u>x</u>')}<i>after</i>`)
  })

  it('follows its content: a placement function reads the element’s children where they render', async () => {
    const m = await mount(
      `<mol-frag>@if (p['first']) {<u>1</u>}@if (p['second']) {<u>2</u>}</mol-frag><i>tail</i>`,
      [Frag as Type<unknown>],
      { first: false, second: false },
    )
    expect(shape(m.root)).toBe(`${t('', false)}<i>tail</i>`)
    m.set({ first: true })
    expect(shape(m.root)).toBe(`${t('<u>1</u>', true)}<i>tail</i>`)
    m.set({ second: true })
    expect(shape(m.root)).toBe(`${t('<u>1</u><u>2</u>', false)}<i>tail</i>`)
    m.set({ first: false })
    expect(shape(m.root)).toBe(`${t('<u>2</u>', true)}<i>tail</i>`)
  })

  it('keeps two elements of one fragment in their order', async () => {
    const m = await mount(
      `@for (x of p['xs']; track x) {<mol-frag></mol-frag>}<i>tail</i>`,
      [Two as Type<unknown>],
      { xs: [1] },
    )
    const pair = '<b>one</b><b>two</b>[f]'
    expect(shape(m.root)).toBe(`${pair}<i>tail</i>`)
    m.set({ xs: [0, 1] })
    m.set({ xs: [1, 0] })
    expect(shape(m.root)).toBe(`${pair}${pair}<i>tail</i>`)
    m.set({ xs: [] })
    expect(shape(m.root)).toBe('<i>tail</i>')
  })

  it('stands inside the wrapper of its host when the parent wraps each child', async () => {
    const m = await mount(
      `<mol-track>@for (x of p['xs']; track x) {<mol-frag><u>{{ x }}</u></mol-frag>}</mol-track>`,
      [Track as Type<unknown>, Frag as Type<unknown>],
      { xs: ['a', 'c'] },
    )
    const items = (...xs: string[]): string =>
      `<mol-track><ul>${xs.map((x) => `<li>${t(`<u>${x}</u>`)}</li>`).join('')}</ul></mol-track>`
    expect(shape(m.root)).toBe(items('a', 'c'))
    m.set({ xs: ['a', 'b', 'c'] })
    expect(shape(m.root)).toBe(items('a', 'b', 'c'))
    m.set({ xs: ['c', 'a'] })
    expect(shape(m.root)).toBe(items('c', 'a'))
    m.set({ xs: [] })
    expect(shape(m.root)).toBe(items())
  })

  /** React: `<>{decided && children}</>`, and no element of its own (the host is absent). */
  const decided = signal(false)
  const Gate = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-gate',
    standalone: true,
    hostDirectives: [MolPlacement],
    template: `@if (decided()) {<ng-content></ng-content>}`,
  })(
    class Gate {
      readonly decided = decided
      constructor() {
        const host = inject(ElementRef).nativeElement as HTMLElement
        usePlacement(() => {
          placeContentBefore(host, host)
          setElementPresent(host, false)
        })
      }
    },
  )

  /** The same fragment as `Frag`, with the host out of the DOM. */
  const Bare = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-bare',
    standalone: true,
    hostDirectives: [MolPlacement],
    template: `<div #trigger data-t=""><span #capture><ng-content></ng-content></span></div>`,
  })(
    class Bare {
      trigger?: ElementRef<HTMLElement>
      capture?: ElementRef<HTMLElement>
      constructor() {
        const host = inject(ElementRef).nativeElement as HTMLElement
        usePlacement(() => {
          const trigger = this.trigger?.nativeElement
          const capture = this.capture?.nativeElement
          if (!trigger || !capture) return
          placeElementBefore(trigger, host)
          setElementPresent(host, false)
          placeContent(capture, trigger)
          setElementPresent(capture, false)
        })
      }
    },
  )
  ViewChild('trigger')(Bare.prototype, 'trigger')
  ViewChild('capture')(Bare.prototype, 'capture')

  /** A parent that renders the fragment's host elsewhere (the device frame selector does). */
  const Mover = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-mover',
    standalone: true,
    imports: [Frag as Type<unknown>],
    template: `<section #root><mol-frag #frag><u>x</u></mol-frag><em>menu</em></section>`,
  })(
    class Mover {
      root?: ElementRef<HTMLElement>
      frag?: ElementRef<HTMLElement>
      ngAfterViewChecked(): void {
        placeElement(this.frag?.nativeElement, this.root?.nativeElement.parentNode ?? null)
      }
    },
  )
  ViewChild('root')(Mover.prototype, 'root')
  ViewChild('frag', { read: ElementRef })(Mover.prototype, 'frag')

  const gated = (tag: string): string =>
    `<i>head</i><${tag}><b>one</b>@for (x of p['xs']; track x) {<u>{{ x }}</u>}</${tag}><i>tail</i>`

  it('renders a gate’s children in its place, with no element of its own, from the pass that decides', async () => {
    decided.set(false)
    const m = await mount(gated('mol-gate'), [Gate as Type<unknown>], { xs: ['a'] })
    expect(shape(m.root)).toBe('<i>head</i><i>tail</i>')
    decided.set(true)
    m.set({})
    expect(shape(m.root)).toBe('<i>head</i><b>one</b><u>a</u><i>tail</i>')
    m.set({ xs: ['z', 'a', 'b'] })
    expect(shape(m.root)).toBe('<i>head</i><b>one</b><u>z</u><u>a</u><u>b</u><i>tail</i>')
    decided.set(false)
    m.set({})
    expect(shape(m.root)).toBe('<i>head</i><i>tail</i>')
    decided.set(true)
    m.set({ xs: [] })
    expect(shape(m.root)).toBe('<i>head</i><b>one</b><i>tail</i>')
  })

  it('removes a gate and its children with the consumer @if, in a list too', async () => {
    decided.set(true)
    const m = await mount(
      `@for (x of p['xs']; track x) {<mol-gate><u>{{ x }}</u></mol-gate>}<i>tail</i>`,
      [Gate as Type<unknown>],
      { xs: ['a', 'c'] },
    )
    expect(shape(m.root)).toBe('<u>a</u><u>c</u><i>tail</i>')
    m.set({ xs: ['a', 'b', 'c'] })
    expect(shape(m.root)).toBe('<u>a</u><u>b</u><u>c</u><i>tail</i>')
    m.set({ xs: ['c', 'a'] })
    expect(shape(m.root)).toBe('<u>c</u><u>a</u><i>tail</i>')
    m.set({ xs: [] })
    expect(shape(m.root)).toBe('<i>tail</i>')
  })

  it('renders a fragment with no host element at all, through inserts, reorders and removal', async () => {
    const m = await mount(
      `<i>head</i>@for (x of p['xs']; track x) {<mol-bare><u>{{ x }}</u></mol-bare>}<i>tail</i>`,
      [Bare as Type<unknown>],
      { xs: ['a', 'c'] },
    )
    const bare = (...xs: string[]): string =>
      `<i>head</i>${xs.map((x) => `<div data-t=""><u>${x}</u></div>`).join('')}<i>tail</i>`
    expect(shape(m.root)).toBe(bare('a', 'c'))
    m.set({ xs: ['a', 'b', 'c'] })
    expect(shape(m.root)).toBe(bare('a', 'b', 'c'))
    m.set({ xs: ['c', 'b', 'a'] })
    expect(shape(m.root)).toBe(bare('c', 'b', 'a'))
    m.set({ xs: ['b'] })
    expect(shape(m.root)).toBe(bare('b'))
    m.set({ xs: [] })
    expect(shape(m.root)).toBe(bare())
    m.set({ xs: ['a'] })
    expect(shape(m.root)).toBe(bare('a'))
  })

  it('takes the element out of the page when it is no longer present, and places it again after', async () => {
    const m = await mount(
      `<i>a</i>@if (p.shown) {<mol-toggle [on]="p.on"></mol-toggle>}<i>b</i>`,
      [Toggle as Type<unknown>],
      { shown: true, on: true },
    )
    expect(shape(m.root)).toBe('<i>a</i><b>t</b><i>b</i>')
    m.set({ on: false })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ on: true })
    expect(shape(m.root)).toBe('<i>a</i><b>t</b><i>b</i>')
    m.set({ on: false })
    m.set({ shown: false })
    expect(shape(m.root)).toBe('<i>a</i><i>b</i>')
    m.set({ shown: true, on: true })
    expect(shape(m.root)).toBe('<i>a</i><b>t</b><i>b</i>')
  })

  it('keeps the element at the host’s place when a parent renders the host elsewhere', async () => {
    const m = await mount(`<mol-mover></mol-mover>`, [Mover as Type<unknown>], {})
    m.set({})
    expect(shape(m.root)).toBe(
      '<mol-mover><section><div data-t="" data-single="true"><u>x</u></div><em>menu</em></section>[f]</mol-mover>',
    )
  })
})
