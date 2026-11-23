// @vitest-environment jsdom
/** What leaves the page when Angular removes a subtree that holds the place of something rendered elsewhere. */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  ElementRef,
  inject,
  provideZonelessChangeDetection,
  type Type,
  ViewChild,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import * as placement from '../dom-placement.js'

const { placeContent, placeElement, provideDomPlacement, setElementPresent } = placement
const apps: ApplicationRef[] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
})

async function mount(template: string, imports: Type<unknown>[], props: Record<string, unknown>) {
  const Host = Component({
    selector: 'probe-host',
    standalone: true,
    imports,
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
const clean = (el: Element): string => el.innerHTML.replace(/<!--.*?-->/g, '')

/** React: `<>{label}</>` rendered bare in the host. */
const Bare = Component({
  selector: 'i[bare]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<span #capture><ng-content></ng-content></span>`,
})(
  class Bare {
    capture?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    ngAfterViewChecked(): void {
      const capture = this.capture?.nativeElement
      if (!capture) return
      placeContent(capture, this.host, capture)
      setElementPresent(capture, false)
    }
  },
)
ViewChild('capture')(Bare.prototype, 'capture')

/** React: `createPortal(<section>{children}</section>, document.body)`. */
const Dialog = Component({
  selector: 'mol-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<section #panel><ng-content></ng-content></section>`,
})(
  class Dialog {
    panel?: ElementRef<HTMLElement>
    ngAfterViewChecked(): void {
      placeElement(this.panel?.nativeElement, document.body)
    }
  },
)
ViewChild('panel')(Dialog.prototype, 'panel')

/** React: `{on && <div><span>{label}</span></div>}` with the label rendered bare in the host, outside the div. */
const Deep = Component({
  selector: 'u[deep]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  inputs: ['on'],
  template: `@if (on) {<div><span #capture><ng-content></ng-content></span></div>}<em>tail</em>`,
})(
  class Deep {
    on = true
    capture?: ElementRef<HTMLElement>
    private readonly host = inject(ElementRef).nativeElement as HTMLElement
    ngAfterViewChecked(): void {
      const capture = this.capture?.nativeElement
      if (!capture) return
      placeContent(capture, this.host)
      setElementPresent(capture, false)
    }
  },
)
ViewChild('capture')(Deep.prototype, 'capture')

describe('removal of content rendered elsewhere', () => {
  it('takes back content rendered outside a view when the view goes, from a capture below its root', async () => {
    const m = await mount(`<u deep [on]="p['on']"><b>x</b></u>`, [Deep as Type<unknown>], {
      on: true,
    })
    m.set({})
    expect(clean(m.root)).toBe('<u deep=""><div></div><em>tail</em><b>x</b></u>')
    m.set({ on: false })
    expect(clean(m.root)).toBe('<u deep=""><em>tail</em></u>')
    m.set({ on: true })
    m.set({})
    expect(clean(m.root)).toBe('<u deep=""><div></div><em>tail</em><b>x</b></u>')
  })

  it('opens and closes a dialog in the body that holds a bare slot, again and again', async () => {
    const m = await mount(
      `@if (p['open']) {<mol-dialog><i bare>label</i></mol-dialog>}`,
      [Dialog as Type<unknown>, Bare as Type<unknown>],
      { open: false },
    )
    for (let i = 0; i < 20; i++) {
      m.set({ open: true })
      m.set({})
      expect(document.body.querySelector('section')?.textContent).toBe('label')
      m.set({ open: false })
      expect(document.body.querySelector('section')).toBeNull()
    }
  })

  it('removes a dialog opened inside a dialog when the outer view goes', async () => {
    const m = await mount(
      `@if (p['open']) {<mol-dialog><p>outer</p><mol-dialog><p>inner</p></mol-dialog></mol-dialog>}`,
      [Dialog as Type<unknown>],
      { open: true },
    )
    m.set({})
    expect(document.body.querySelectorAll('section').length).toBe(2)
    m.set({ open: false })
    expect(Array.from(document.body.querySelectorAll('section')).map((s) => s.textContent)).toEqual(
      [],
    )
  })

  it('removes a bare slot inside a bare slot with the @if that holds both', async () => {
    const m = await mount(
      `@if (p['on']) {<i bare><i bare><b>x</b></i></i>}<em>after</em>`,
      [Bare as Type<unknown>],
      { on: true },
    )
    m.set({})
    expect(clean(m.root)).toBe('<i bare=""><i bare=""><b>x</b></i></i><em>after</em>')
    m.set({ on: false })
    expect(clean(m.root)).toBe('<em>after</em>')
    m.set({ on: true })
    m.set({})
    expect(clean(m.root)).toBe('<i bare=""><i bare=""><b>x</b></i></i><em>after</em>')
  })
})
