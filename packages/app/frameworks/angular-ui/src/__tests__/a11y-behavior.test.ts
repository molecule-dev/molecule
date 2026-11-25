// @vitest-environment jsdom
/**
 * Unit coverage for the accessibility interaction fixes carried from
 * `@molecule/app-ui-react`:
 *
 * - an interactive Card activates on Enter and Space by clicking itself (and
 *   leaves keys pressed in an inner control to that control);
 * - PromptDialog focuses its input when the dialog opens, after the composed
 *   Modal has moved focus into the dialog;
 * - the Modal and drawer backdrop handlers close on a click on the wrapper
 *   itself and stop a click that bubbled up from inside, without closing.
 *
 * angular-ui ships `@Component`-decorated classes; the components exercised
 * here are constructable in plain jsdom (no TestBed), with `@molecule/app-ui`
 * / `@molecule/app-icons` / `@molecule/app-angular` stubbed and the Angular
 * injection-context fields (`inject(ElementRef)`) served by a hand-built
 * injector. Elements are attached to the body so focus and bubbling behave as
 * in a page.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  ElementRef,
  Injector,
  provideZonelessChangeDetection,
  Renderer2,
  runInInjectionContext,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MolPlacement, provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) => cls.filter(Boolean).join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? '',
  }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
}))

const { Card } = await import('../components/card.component.js')
const { Input } = await import('../components/input.component.js')
const { Modal } = await import('../components/modal.component.js')
const { PromptDialog } = await import('../components/prompt-dialog.component.js')
const { ResponsiveAppShellDrawer } = await import('../components/responsive-app-shell.component.js')

/**
 * The application whose injector carries the after-render hooks the components
 * register; `appRef.tick()` runs them the way a real render does.
 */
let appRef: ApplicationRef
const overlays: { ngOnDestroy: () => void }[] = []

/** An injector serving the components' `inject(ElementRef)` / `inject(Renderer2)`. */
const injectionContext = (): Injector =>
  Injector.create({
    providers: [
      {
        provide: ElementRef,
        useValue: { nativeElement: document.createElement('div') },
      },
      // The renderer is only touched by slot/portal management, which these
      // handler tests never reach.
      { provide: Renderer2, useValue: {} as Renderer2 },
      // `usePlacement` asks for the component's moments; directly constructed
      // components have no node injector carrying the host directive.
      { provide: MolPlacement, useValue: new MolPlacement() },
    ],
    parent: appRef.injector,
  })

/** A cancelable bubbling KeyboardEvent, as the conformance kit dispatches them. */
const keydown = (key: string): KeyboardEvent =>
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

beforeEach(async () => {
  document.body.innerHTML = ''
  appRef ??= await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
})

afterEach(() => {
  for (const overlay of overlays.splice(0)) overlay.ngOnDestroy()
  document.body.innerHTML = ''
  // The outside-a-shell context is one shared object, so a spy on it must not outlive its test.
  vi.restoreAllMocks()
})

describe('Card keyboard activation', () => {
  // The component's host wiring (`(keydown)` → handleKeyDown, the consumer's
  // click handler on the same element) reproduced with plain DOM listeners.
  const mount = (interactive: boolean) => {
    const host = document.createElement('div')
    const card = runInInjectionContext(injectionContext(), () => new Card())
    if (interactive) card.interactive = true
    const keydowns: KeyboardEvent[] = []
    const clicks: Event[] = []
    host.addEventListener('keydown', (event) => {
      keydowns.push(event)
      card.handleKeyDown(event)
    })
    host.addEventListener('click', (event) => clicks.push(event))
    document.body.appendChild(host)
    return { host, keydowns, clicks }
  }

  it('clicks itself on Enter with a real click event and swallows the key', () => {
    const { host, keydowns, clicks } = mount(true)
    host.dispatchEvent(keydown('Enter'))
    expect(clicks).toHaveLength(1)
    expect(clicks[0]!.target).toBe(host)
    expect(keydowns[0]!.defaultPrevented).toBe(true)
  })

  it('clicks itself on Space', () => {
    const { host, keydowns, clicks } = mount(true)
    host.dispatchEvent(keydown(' '))
    expect(clicks).toHaveLength(1)
    expect(keydowns[0]!.defaultPrevented).toBe(true)
  })

  it('leaves Enter pressed in an inner control to that control', () => {
    const { host, clicks } = mount(true)
    const span = document.createElement('span')
    host.appendChild(span)
    span.dispatchEvent(keydown('Enter'))
    expect(clicks).toHaveLength(0)
  })

  it('ignores Enter on a card that is not interactive', () => {
    const { host, keydowns, clicks } = mount(false)
    host.dispatchEvent(keydown('Enter'))
    expect(clicks).toHaveLength(0)
    expect(keydowns[0]!.defaultPrevented).toBe(false)
  })

  it('ignores keys that are not Enter or Space', () => {
    const { host, clicks } = mount(true)
    host.dispatchEvent(keydown('a'))
    expect(clicks).toHaveLength(0)
  })
})

describe('PromptDialog input focus on open', () => {
  // A real PromptDialog; the `@ViewChild(Input)` view child is a real Input
  // whose own view never mounted here, so the test hands it the native input
  // (a view child cannot exist without an Angular mount).
  const makeDialog = () => {
    const dialog = runInInjectionContext(injectionContext(), () => new PromptDialog())
    const input = document.createElement('input')
    const inputComponent = runInInjectionContext(injectionContext(), () => new Input())
    inputComponent.inputEl = new ElementRef(input)
    dialog.inputComponent = inputComponent
    return { dialog, input }
  }

  it("names its input as the Modal's initial focus", () => {
    const { dialog, input } = makeDialog()
    expect(dialog.inputTarget.current).toBe(input)
  })

  it('names no initial focus before its input renders', () => {
    const dialog = runInInjectionContext(injectionContext(), () => new PromptDialog())
    expect(dialog.inputTarget.current).toBeNull()
  })
})

describe('Modal backdrop click handling', () => {
  const makeModal = () => {
    const modal = runInInjectionContext(injectionContext(), () => new Modal())
    const closed: unknown[] = []
    modal.close.subscribe((value) => closed.push(value))
    const wrapper = document.createElement('div')
    const dialog = document.createElement('div')
    const inner = document.createElement('button')
    dialog.appendChild(inner)
    wrapper.appendChild(dialog)
    document.body.appendChild(wrapper)
    modal.open = true
    modal.dialog = new ElementRef(dialog)
    modal.wrapper = new ElementRef(wrapper)
    modal.overlay = new ElementRef(document.createElement('div'))
    modal.ngAfterViewInit()
    overlays.push(modal)
    wrapper.addEventListener('click', (event) => modal.handleOverlayClick(event))
    return { modal, closed, wrapper, inner }
  }

  it('closes when the click lands on the wrapper itself', () => {
    const { closed, wrapper } = makeModal()
    wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(closed).toHaveLength(1)
  })

  it('stays open on a wrapper click when closeOnOverlayClick is false', () => {
    const { modal, closed, wrapper } = makeModal()
    modal.closeOnOverlayClick = false
    modal.ngDoCheck()
    wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(closed).toHaveLength(0)
  })

  it('stops a click that bubbled up from inside the dialog without closing', () => {
    const { closed, inner } = makeModal()
    const event = new MouseEvent('click', { bubbles: true })
    const stopPropagation = vi.spyOn(event, 'stopPropagation')
    inner.dispatchEvent(event)
    expect(stopPropagation).toHaveBeenCalled()
    expect(closed).toHaveLength(0)
  })
})

describe('Drawer backdrop click handling', () => {
  const makeDrawer = () => {
    const drawer = runInInjectionContext(injectionContext(), () => new ResponsiveAppShellDrawer())
    const closeDrawer = vi.fn()
    vi.spyOn(drawer, 'shell').mockReturnValue({
      ...drawer.shell(),
      drawerOpen: true,
      closeDrawer,
    })
    const wrapper = document.createElement('div')
    const panel = document.createElement('div')
    const inner = document.createElement('button')
    panel.appendChild(inner)
    wrapper.appendChild(panel)
    document.body.appendChild(wrapper)
    drawer.panel = new ElementRef(panel)
    drawer.wrapper = new ElementRef(wrapper)
    drawer.overlay = new ElementRef(document.createElement('div'))
    drawer.ngAfterViewInit()
    overlays.push(drawer)
    wrapper.addEventListener('click', (event) => drawer.handleBackdropClick(event))
    return { closeDrawer, wrapper, inner }
  }

  it('closes the drawer when the click lands on the wrapper itself', () => {
    const { closeDrawer, wrapper } = makeDrawer()
    wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(closeDrawer).toHaveBeenCalledTimes(1)
  })

  it('stops a click that bubbled up from the panel without closing', () => {
    const { closeDrawer, inner } = makeDrawer()
    const event = new MouseEvent('click', { bubbles: true })
    const stopPropagation = vi.spyOn(event, 'stopPropagation')
    inner.dispatchEvent(event)
    expect(stopPropagation).toHaveBeenCalled()
    expect(closeDrawer).not.toHaveBeenCalled()
  })
})
