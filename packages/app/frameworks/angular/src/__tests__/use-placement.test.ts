// @vitest-environment jsdom
/** usePlacement: presence and placement decided from projected content never lag the content. */
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
  placeContent,
  provideDomPlacement,
  setElementPresent,
  type SlotReader,
  useHostPresence,
  usePlacement,
} from '../dom-placement.js'

const log: string[] = []
const apps: ApplicationRef[] = []
let runs = 0
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
  log.length = 0
  runs = 0
})

async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown>,
  changeDetection = ChangeDetectionStrategy.Eager,
) {
  const Host = Component({
    selector: 'probe-host',
    standalone: true,
    imports,
    changeDetection,
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
    app,
    root,
    set(next: Record<string, unknown>) {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      app.tick()
    },
  }
}
const html = (root: HTMLElement): string => root.innerHTML.replace(/<!--.*?-->/g, '')

/**
 * React:
 * <div>{(title || actions || label) && <header>{title && <h3>{title}</h3>}{label}{actions}</header>}
 *   {children ? <div data-list>{children}</div> : emptyState}</div>
 */
const Box = Component({
  selector: 'div[box]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['label'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<header #header><h3 #title><ng-content select="[slot=title]"></ng-content></h3>{{ label }}<span #actions><ng-content select="[slot=actions]"></ng-content></span></header><div #list data-list=""><ng-content></ng-content></div><span #empty><ng-content select="[slot=emptyState]"></ng-content></span>`,
})(
  class Box {
    label?: string
    readonly forced = signal(false)
    header?: ElementRef<HTMLElement>
    title?: ElementRef<HTMLElement>
    actions?: ElementRef<HTMLElement>
    list?: ElementRef<HTMLElement>
    empty?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    constructor() {
      boxes.push(this)
      usePlacement((hasContent) => {
        runs++
        const header = this.header?.nativeElement
        const title = this.title?.nativeElement
        const actions = this.actions?.nativeElement
        const list = this.list?.nativeElement
        const empty = this.empty?.nativeElement
        const forced = this.forced()
        if (!header || !actions || !empty) return
        setElementPresent(
          header,
          forced || Boolean(this.label) || hasContent(title) || hasContent(actions),
        )
        setElementPresent(title, hasContent(title))
        placeContent(actions, header, actions)
        setElementPresent(actions, false)
        const hasChildren = hasContent(list)
        setElementPresent(list, hasChildren)
        if (hasChildren) placeContent(empty, null)
        else placeContent(empty, this.host, empty)
        setElementPresent(empty, false)
      })
    }
  },
)
for (const name of ['header', 'title', 'actions', 'list', 'empty'])
  ViewChild(name)(Box.prototype, name)
const boxes: { forced: ReturnType<typeof signal<boolean>> }[] = []

const Leaf = Component({
  selector: 'b[leaf]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `leaf`,
})(
  class Leaf {
    private readonly el = inject(ElementRef).nativeElement as HTMLElement
    ngAfterViewInit(): void {
      log.push(`leaf ngAfterViewInit: inPage=${this.el.isConnected}`)
    }
  },
)

const Item = Component({
  selector: 'i[item]',
  standalone: true,
  inputs: ['visible'],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `@if (visible) {x}`,
})(
  class Item {
    visible?: boolean
    constructor() {
      useHostPresence(() => this.visible === true)
    }
  },
)

const EMPTY = '<div box=""></div>'

describe('usePlacement', () => {
  it('shows and removes the header in the pass where the consumer @if adds and removes the node', async () => {
    const m = await mount(
      `<div box>@if (p['show']) {<b leaf slot="actions"></b>}</div>`,
      [Box as Type<unknown>, Leaf as Type<unknown>],
      { show: false },
    )
    expect(html(m.root)).toBe(EMPTY)
    m.set({ show: true })
    expect(html(m.root)).toBe(
      '<div box=""><header><b leaf="" slot="actions">leaf</b></header></div>',
    )
    expect(log).toEqual(['leaf ngAfterViewInit: inPage=true'])
    m.set({ show: false })
    expect(html(m.root)).toBe(EMPTY)
    m.set({ show: true })
    expect(html(m.root)).toBe(
      '<div box=""><header><b leaf="" slot="actions">leaf</b></header></div>',
    )
  })

  it('follows content that comes through an OnPush component in between, where no hook of the port runs', async () => {
    const Mid = Component({
      selector: 'mid-box',
      standalone: true,
      imports: [Box as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template:
        '<div box><ng-content select="[slot=actions]" ngProjectAs="[slot=actions]"></ng-content><ng-content></ng-content></div>',
    })(class Mid {})
    const m = await mount(
      `<mid-box>@if (p['show']) {<b leaf slot="actions"></b>}@for (x of p['xs']; track x) {<i>{{ x }}</i>}</mid-box>`,
      [Mid as Type<unknown>, Leaf as Type<unknown>],
      { show: false, xs: [] },
    )
    expect(html(m.root)).toBe('<mid-box><div box=""></div></mid-box>')
    m.set({ show: true })
    expect(html(m.root)).toBe(
      '<mid-box><div box=""><header><b leaf="" slot="actions">leaf</b></header></div></mid-box>',
    )
    expect(log).toEqual(['leaf ngAfterViewInit: inPage=true'])
    m.set({ show: false, xs: [1, 2] })
    expect(html(m.root)).toBe(
      '<mid-box><div box=""><div data-list=""><i>1</i><i>2</i></div></div></mid-box>',
    )
    m.set({ xs: [] })
    expect(html(m.root)).toBe('<mid-box><div box=""></div></mid-box>')
  })

  it('follows interpolated text that becomes empty and filled', async () => {
    const m = await mount(
      `<div box><ng-container ngProjectAs="[slot=title]">{{ p['t'] }}</ng-container></div>`,
      [Box as Type<unknown>],
      {
        t: '',
      },
    )
    expect(html(m.root)).toBe(EMPTY)
    m.set({ t: 'Top' })
    expect(html(m.root)).toBe('<div box=""><header><h3>Top</h3></header></div>')
    m.set({ t: '' })
    expect(html(m.root)).toBe(EMPTY)
  })

  it('swaps the list and the empty state as a consumer list fills, reorders and empties', async () => {
    const m = await mount(
      `<div box>@for (x of p['xs']; track x) {<i>{{ x }}</i>}<em slot="emptyState">none</em></div>`,
      [Box as Type<unknown>],
      { xs: [] },
    )
    expect(html(m.root)).toBe('<div box=""><em slot="emptyState">none</em></div>')
    m.set({ xs: [1, 3] })
    expect(html(m.root)).toBe('<div box=""><div data-list=""><i>1</i><i>3</i></div></div>')
    m.set({ xs: [1, 2, 3] })
    m.set({ xs: [3, 2] })
    expect(html(m.root)).toBe('<div box=""><div data-list=""><i>3</i><i>2</i></div></div>')
    m.set({ xs: [] })
    expect(html(m.root)).toBe('<div box=""><em slot="emptyState">none</em></div>')
    m.set({ xs: [7] })
    expect(html(m.root)).toBe('<div box=""><div data-list=""><i>7</i></div></div>')
  })

  it('follows a plain input and a signal only the placement function reads', async () => {
    const m = await mount(`<div box [label]="p['label']"></div>`, [Box as Type<unknown>], {})
    expect(html(m.root)).toBe(EMPTY)
    m.set({ label: 'L' })
    expect(html(m.root)).toBe('<div box=""><header>L</header></div>')
    m.set({ label: undefined })
    expect(html(m.root)).toBe(EMPTY)
    boxes.at(-1)!.forced.set(true)
    m.app.tick()
    expect(html(m.root)).toBe('<div box=""><header></header></div>')
  })

  it('counts a projected component that renders nothing as content, as React counts the element', async () => {
    const m = await mount(
      `<div box><i item slot="actions" [visible]="p['v']"></i></div>`,
      [Box as Type<unknown>, Item as Type<unknown>],
      { v: false },
    )
    expect(html(m.root)).toBe('<div box=""><header></header></div>')
    m.set({ v: true })
    expect(html(m.root)).toBe('<div box=""><header><i item="" slot="actions">x</i></header></div>')
  })

  it('runs twice in a pass that changes nothing: when the parent checks it and after the render', async () => {
    const m = await mount(
      `<div box><b slot="actions">a</b><i>row</i></div>`,
      [Box as Type<unknown>],
      {},
    )
    m.set({})
    runs = 0
    m.set({})
    expect(runs).toBe(2)
  })

  it('refuses a slot read outside the placement function', async () => {
    let reader: SlotReader | undefined
    const Bad = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'bad-box',
      standalone: true,
      hostDirectives: [MolPlacement],
      template: `<span #s><ng-content></ng-content></span>`,
    })(
      class Bad {
        constructor() {
          usePlacement((hasContent) => {
            reader = hasContent
          })
        }
        ngDoCheck(): void {
          reader?.(null)
        }
      },
    )
    await expect(
      mount(`<bad-box></bad-box>`, [Bad as Type<unknown>], {}).then((m) => m.set({})),
    ).rejects.toThrow(/outside its usePlacement\(\)/)
  })

  it('names MolPlacement when the component does not list it', async () => {
    const Bare = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'bare-box',
      standalone: true,
      template: '',
    })(
      class Bare {
        constructor() {
          usePlacement(() => undefined)
        }
      },
    )
    await expect(mount('<bare-box></bare-box>', [Bare as Type<unknown>], {})).rejects.toThrow(
      /hostDirectives: \[MolPlacement\]/,
    )
  })

  it('places on the first render and follows a plain input under a bare detectChanges()', async () => {
    const Host = Component({
      selector: 'detect-host',
      standalone: true,
      changeDetection: ChangeDetectionStrategy.Eager,
      imports: [Box as Type<unknown>],
      template: '<div box [label]="label"><b slot="actions">a</b></div>',
    })(
      class {
        label?: string
      },
    )
    const app = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    apps.push(app)
    const ref = createComponent(Host as Type<{ label?: string }>, {
      environmentInjector: app.injector,
    })
    const root = ref.location.nativeElement as HTMLElement
    document.body.appendChild(root)
    ref.changeDetectorRef.detectChanges()
    expect(html(root)).toBe('<div box=""><header><b slot="actions">a</b></header></div>')
    ref.instance.label = 'L'
    ref.changeDetectorRef.detectChanges()
    expect(html(root)).toBe('<div box=""><header>L<b slot="actions">a</b></header></div>')
  })

  it('skips the text a capture renders before its slot', async () => {
    /** React: `{prescriber && <span>{label}{prescriber}</span>}`, the label rendered by the port. */
    const Labelled = Component({
      selector: 'div[labelled]',
      standalone: true,
      hostDirectives: [MolPlacement],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<span #c>{{ 'By ' }}<ng-content></ng-content></span>`,
    })(
      class Labelled {
        capture?: ElementRef<HTMLElement>
        constructor() {
          usePlacement((hasContent) => {
            const capture = this.capture?.nativeElement
            if (capture) setElementPresent(capture, hasContent(capture, 1))
          })
        }
      },
    )
    ViewChild('c')(Labelled.prototype, 'capture')
    const m = await mount(
      `<div labelled>@if (p['on']) {<b>Dr. A</b>}</div>`,
      [Labelled as Type<unknown>],
      { on: false },
    )
    expect(html(m.root)).toBe('<div labelled=""></div>')
    m.set({ on: true })
    expect(html(m.root)).toBe('<div labelled=""><span>By <b>Dr. A</b></span></div>')
    m.set({ on: false })
    expect(html(m.root)).toBe('<div labelled=""></div>')
  })
})
