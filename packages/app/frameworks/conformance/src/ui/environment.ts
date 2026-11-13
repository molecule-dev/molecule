/**
 * Shared test environment: the real Tailwind ClassMap bond, the molecule icon
 * set, the simple i18n provider, a deterministic `matchMedia`, and the DOM
 * actions every adapter runs identically.
 *
 * @module
 */

import {
  createSimpleI18nProvider,
  type I18nProvider,
  setProvider as setI18nProvider,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { Interaction, UICase } from './spec.js'

let installed = false

/**
 * The locale a case's `locale` step switches to. Every string `t()` returns in it reads
 * `⟦English⟧`, so a component that does not re-render on a switch keeps plain English and
 * differs from React's recorded output.
 */
export const PSEUDO_LOCALE = 'en-XA'

/**
 * The simple provider with English and {@link PSEUDO_LOCALE}. Neither locale carries
 * translations: a component's own English defaults are what it renders, bracketed in the
 * pseudo-locale.
 *
 * @returns The provider.
 */
function createConformanceI18nProvider(): I18nProvider {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    { code: PSEUDO_LOCALE, name: 'Pseudo', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key, values, options) => {
      const text = base.t(key, values, options)
      return base.getLocale() === PSEUDO_LOCALE ? `⟦${text}⟧` : text
    },
  }
}

/**
 * Bonds the ClassMap, icon set and i18n provider once per test file. Every
 * adapter renders against these same bonds, so class strings and icons are
 * produced by one implementation.
 */
export function installSharedBonds(): void {
  if (installed) return
  installed = true
  setClassMap(classMap)
  setIconSet(iconSet)
  setI18nProvider(createConformanceI18nProvider())
}

/**
 * Installs a `matchMedia` that answers `(min-width: Npx)` / `(max-width: Npx)`
 * against a fixed viewport width, plus `(prefers-color-scheme: dark)` = false.
 *
 * @param width - Viewport width in CSS pixels.
 */
export function installViewport(width: number): void {
  const answer = (query: string): boolean => {
    const min = /min-width:\s*(\d+(?:\.\d+)?)px/.exec(query)
    const max = /max-width:\s*(\d+(?:\.\d+)?)px/.exec(query)
    if (min) return width >= Number(min[1])
    if (max) return width <= Number(max[1])
    return false
  }
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  window.matchMedia = ((query: string) => ({
    matches: answer(query),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

/**
 * Prepares a clean document for one case and returns the mount container.
 *
 * @param testCase - The case about to run.
 * @returns A fresh container appended to `document.body`.
 */
export function freshContainer(testCase: UICase): HTMLElement {
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  document.body.removeAttribute('class')
  installViewport(testCase.viewportWidth ?? 1280)
  const container = document.createElement('div')
  container.setAttribute('data-parity-unwrap', '')
  document.body.appendChild(container)
  return container
}

const query = (selector: string): HTMLElement => {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`parity: no element matches ${selector}`)
  return el as HTMLElement
}

const setNativeValue = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void => {
  // React tracks the last value it set; going through the prototype setter makes
  // its onChange fire exactly as a user's typing would.
  const proto = Object.getPrototypeOf(el) as object
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
}

/** Clicks like a user: `el.click()` where the element has it (HTML), a bubbling click event otherwise (jsdom SVG). */
const click = (el: Element): void => {
  if (el instanceof HTMLElement) el.click()
  else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

const setNativeChecked = (el: HTMLInputElement, checked: boolean): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set
  if (setter) setter.call(el, checked)
  else el.checked = checked
}

/**
 * Performs one DOM interaction exactly the same way for every framework.
 * `props`, `advance`, `settle` and `navigate` steps are handled by the step runner, not here.
 *
 * @param step - The interaction to perform.
 */
export function performDomInteraction(step: Interaction): void {
  switch (step.type) {
    case 'click':
    case 'dblclick': {
      const el = query(step.selector)
      el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      el.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }))
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
      click(el)
      if (step.type === 'dblclick') {
        click(el)
        el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
      }
      return
    }
    case 'focus':
      query(step.selector).focus()
      query(step.selector).dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      return
    case 'blur':
      query(step.selector).blur()
      query(step.selector).dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      return
    case 'mouseenter':
      query(step.selector).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      query(step.selector).dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
      query(step.selector).dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }))
      return
    case 'mouseleave':
      query(step.selector).dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
      query(step.selector).dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
      query(step.selector).dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }))
      return
    case 'pointerdown':
      query(step.selector).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      query(step.selector).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      return
    case 'keydown':
      query(step.selector).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: step.key,
          shiftKey: step.shiftKey ?? false,
          bubbles: true,
          cancelable: true,
        }),
      )
      return
    case 'input': {
      const el = query(step.selector) as HTMLInputElement
      setNativeValue(el, step.value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }
    case 'check': {
      const el = query(step.selector) as HTMLInputElement
      if (el.checked !== step.checked) el.click()
      else setNativeChecked(el, step.checked)
      return
    }
    case 'submit': {
      const el = query(step.selector) as HTMLFormElement
      el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      return
    }
    case 'event': {
      const target: EventTarget =
        step.selector === 'window'
          ? window
          : step.selector === 'document'
            ? document
            : query(step.selector)
      target.dispatchEvent(
        new Event(step.event, { bubbles: step.bubbles ?? false, cancelable: true }),
      )
      return
    }
    case 'mark': {
      const elements = document.querySelectorAll(step.selector)
      if (elements.length === 0) throw new Error(`mark: no element matches ${step.selector}`)
      elements.forEach((el, index) => el.setAttribute('data-conformance-mark', String(index)))
      return
    }
    case 'advance':
    case 'props':
    case 'settle':
    case 'navigate':
    case 'locale':
      return
  }
}
