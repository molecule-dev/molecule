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
import { ElementRef, Injector, Renderer2, runInInjectionContext } from '@angular/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Input } from '../components/input.component.js'

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

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? '',
  }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
}))

const { Card } = await import('../components/card.component.js')
const { Modal } = await import('../components/modal.component.js')
const { PromptDialog } = await import('../components/prompt-dialog.component.js')
const { ResponsiveAppShellDrawer } = await import('../components/responsive-app-shell.component.js')

/** An injector serving the components' `inject(ElementRef)` / `inject(Renderer2)`. */
const injectionContext = (): Injector =>
  Injector.create([
    {
      provide: ElementRef,
      useValue: { nativeElement: document.createElement('div') },
    },
    // The renderer is only touched by slot/portal management, which these
    // handler tests never reach.
    { provide: Renderer2, useValue: {} as Renderer2 },
  ])

/** A cancelable bubbling KeyboardEvent, as the conformance kit dispatches them. */
const keydown = (key: string): KeyboardEvent =>
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Card keyboard activation', () => {
  // The component's host wiring (`(keydown)` → handleKeyDown, the consumer's
  // click handler on the same element) reproduced with plain DOM listeners.
  const mount = (interactive: boolean) => {
    const host = document.createElement('div')
    const card = new Card()
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
  // A real PromptDialog; the `@ViewChild(Input)` view child is a stand-in
  // carrying just the native input the focus path touches (a view child cannot
  // exist without an Angular mount).
  const makeDialog = () => {
    const dialog = runInInjectionContext(injectionContext(), () => new PromptDialog())
    const input = document.createElement('input')
    dialog.inputComponent = { inputEl: { nativeElement: input } } as unknown as Input
    // The dialog's first control, which the composed Modal focuses on open.
    const closeButton = document.createElement('button')
    document.body.appendChild(input)
    document.body.appendChild(closeButton)
    return { dialog, input, closeButton }
  }

  it('focuses the input when the dialog opens at mount', () => {
    const { dialog, input, closeButton } = makeDialog()
    dialog.open = true
    // Modal's view init ran first (children init first) and moved focus into
    // the dialog.
    closeButton.focus()
    dialog.ngAfterViewInit()
    dialog.ngAfterViewChecked()
    expect(document.activeElement).toBe(input)
  })

  it('focuses the input after the Modal on a later open transition', () => {
    const { dialog, input, closeButton } = makeDialog()
    dialog.ngAfterViewInit()
    dialog.ngAfterViewChecked()
    expect(document.activeElement).not.toBe(input)
    dialog.open = true
    // One change-detection pass, in Angular's order: the parent's ngDoCheck
    // sees the transition, then the child Modal's ngDoCheck moves focus into
    // the dialog, then the parent's after-view check runs.
    dialog.ngDoCheck()
    closeButton.focus()
    dialog.ngAfterViewChecked()
    expect(document.activeElement).toBe(input)
  })

  it('does not move focus on a pass without an open transition', () => {
    const { dialog, input, closeButton } = makeDialog()
    dialog.open = true
    dialog.ngAfterViewInit()
    dialog.ngAfterViewChecked()
    expect(document.activeElement).toBe(input)
    closeButton.focus()
    dialog.ngDoCheck()
    dialog.ngAfterViewChecked()
    expect(document.activeElement).toBe(closeButton)
  })

  it('focusInput does nothing without a rendered input', () => {
    const dialog = runInInjectionContext(injectionContext(), () => new PromptDialog())
    expect(() => dialog.focusInput()).not.toThrow()
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
    // Outside a shell the context is the module default; the spy proves the
    // handler closes (or not) through it.
    const closeDrawer = vi.spyOn(drawer.shell(), 'closeDrawer')
    const wrapper = document.createElement('div')
    const panel = document.createElement('div')
    const inner = document.createElement('button')
    panel.appendChild(inner)
    wrapper.appendChild(panel)
    document.body.appendChild(wrapper)
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
