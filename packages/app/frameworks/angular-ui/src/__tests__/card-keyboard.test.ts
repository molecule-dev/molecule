// @vitest-environment jsdom
/**
 * An interactive Card is announced as a button and sits in the tab order, so Enter and Space
 * activate it the way they activate a native button. Keys pressed in a control inside the card,
 * and keys on a card that is not interactive, do nothing. A port of
 * `@molecule/app-ui-react/src/__tests__/card-keyboard.test.tsx`, mounted through Angular's
 * zoneless bootstrap so the host bindings (`role`, `tabindex`, the keydown listener) are the
 * ones a consumer gets.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Card } = await import('../components/card.component.js')

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
})

/**
 * Mounts a `div[mol-card]` with the consumer's click handler, as a template would.
 *
 * @param interactive - Whether the card is interactive.
 * @param withInput - Whether the card holds an inner text control.
 * @returns The mounted card element.
 */
async function mountCard(interactive: boolean, withInput = false): Promise<HTMLElement> {
  const Host: Type<unknown> = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-host]',
    standalone: true,
    imports: [Card],
    template: `@if (withInput) {
        <div mol-card [interactive]="interactive" (click)="clicked()">
          <input aria-label="Note" />
        </div>
      } @else {
        <div mol-card [interactive]="interactive" (click)="clicked()">Clickable card</div>
      }`,
  })(
    class CardHostComponent {
      interactive = interactive
      withInput = withInput
      clicked = (): void => {}
    },
  )
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return document.querySelector('[mol-card]') as HTMLElement
}

/**
 * Mounts a host whose template renders a Card, with the given component state.
 *
 * @param template - The host template.
 * @param state - The host's fields, read by the template.
 * @returns The card element.
 */
async function mountTemplate(template: string, state: object): Promise<HTMLElement> {
  const Host: Type<unknown> = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-host]',
    standalone: true,
    imports: [Card],
    template,
  })(
    class CardTemplateHostComponent {
      constructor() {
        Object.assign(this, state)
      }
    },
  )
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const card = document.querySelector('[mol-card]')
  if (!(card instanceof HTMLElement)) throw new Error('the Card rendered no element')
  return card
}

/**
 * Dispatches a bubbling keydown with the given key.
 *
 * @param el - Where the key is pressed.
 * @param key - The key value.
 */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('Card keyboard activation', () => {
  it.each(['Enter', ' '])('an interactive card calls onClick on %j', async (key) => {
    const card = await mountCard(true)
    const clicks: Event[] = []
    card.addEventListener('click', (event) => clicks.push(event))
    pressKey(card, key)
    expect(clicks).toHaveLength(1)
  })

  it('other keys on an interactive card do nothing', async () => {
    const card = await mountCard(true)
    const onClick = vi.fn()
    card.addEventListener('click', onClick)
    pressKey(card, 'a')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('Enter in a control inside an interactive card belongs to that control', async () => {
    const card = await mountCard(true, true)
    const onClick = vi.fn()
    card.addEventListener('click', onClick)
    const input = document.querySelector('input[aria-label="Note"]') as HTMLInputElement
    pressKey(input, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a card that is not interactive is not focusable and ignores Enter', async () => {
    const card = await mountCard(false)
    expect(card.hasAttribute('tabindex')).toBe(false)
    expect(card.hasAttribute('role')).toBe(false)
    const onClick = vi.fn()
    card.addEventListener('click', onClick)
    pressKey(card, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })

  it("the caller's onKeyDown runs before the activation", async () => {
    const calls: string[] = []
    const card = await mountTemplate(
      `<div mol-card [interactive]="true" (click)="calls.push('click')" (keydown)="calls.push('keydown')">
        Clickable card
      </div>`,
      { calls },
    )
    pressKey(card, 'Enter')
    expect(calls).toEqual(['keydown', 'click'])
  })

  it("preventDefault in the caller's onKeyDown cancels the activation", async () => {
    const onClick = vi.fn()
    const card = await mountTemplate(
      `<div mol-card [interactive]="true" (click)="onClick()" (keydown)="$event.preventDefault()">
        Clickable card
      </div>`,
      { onClick },
    )
    pressKey(card, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Card forwards its declared props', () => {
  it('id, title, onFocus, onBlur and onDoubleClick reach the card', async () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const onDoubleClick = vi.fn()
    // Angular's spelling of React's onFocus / onBlur / onDoubleClick: the bubbling focusin and
    // focusout, and dblclick, bound on the card element.
    const card = await mountTemplate(
      `<div mol-card testId="billing" id="billing-card" title="Billing"
        (focusin)="onFocus($event)" (focusout)="onBlur($event)" (dblclick)="onDoubleClick($event)">
        <button type="button">Edit</button>
      </div>`,
      { onFocus, onBlur, onDoubleClick },
    )
    expect(card.id).toBe('billing-card')
    expect(card.title).toBe('Billing')
    // React's onFocus and onBlur hear focus moving onto and off a control inside the card.
    const edit = card.querySelector('button')!
    edit.focus()
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onFocus.mock.calls[0][0].target).toBe(edit)
    edit.blur()
    expect(onBlur).toHaveBeenCalledTimes(1)
    card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })
})
