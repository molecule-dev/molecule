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
  type Translations,
} from '@molecule/app-i18n'
import { type IconSet, setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { notifyResize } from './globals.js'
import {
  createTransferData,
  installDomGaps,
  reachCues,
  setLayoutStubs,
  setWindowFocus,
  type TransferData,
} from './page.js'
import { installPseudoLocaleIntl } from './pseudo-locale-intl.js'
import type { ClickModifiers, Interaction, UICase } from './spec.js'

let installed = false

/**
 * The locale a case's `locale` step switches to. Every string `t()` returns in it reads
 * `⟦English⟧`, so a component that does not re-render on a switch keeps plain English and
 * differs from React's recorded output. Intl's date, relative-time and list formatters made
 * for it bracket their output the same way ({@link installPseudoLocaleIntl}), so a component
 * that formats in a fixed locale differs too.
 */
export const PSEUDO_LOCALE = 'en-XA'

/** The running case's own translations (`CaseContext.translations`). */
let caseTranslations: Partial<Record<string, Translations>> = {}

/** The text at a dotted key, when the tree has a string there. */
const lookup = (tree: Translations | undefined, key: string): string | undefined => {
  let node: unknown = tree
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  return typeof node === 'string' ? node : undefined
}

/** The kit provider's own simple provider, which holds the locales (set by {@link installSharedBonds}). */
let localeRegistry: I18nProvider | null = null

/**
 * Serves translations for one case. The kit's locales carry none, so a case
 * translation is the only value for its key; `null` clears them. Every locale the
 * translations name exists from here on, so the case can start in it or switch to it.
 *
 * @param translations - Per-locale translations, or null.
 */
export function setCaseTranslations(
  translations: Partial<Record<string, Translations>> | null,
): void {
  caseTranslations = translations ?? {}
  for (const code of Object.keys(caseTranslations))
    if (localeRegistry && !localeRegistry.getLocales().some((known) => known.code === code))
      localeRegistry.addLocale({ code, name: code, direction: 'ltr', translations: {} })
}

/** The glyphs the current case adds to the bonded icon set (`context.icons`). */
let caseIcons: IconSet = {}

/**
 * Serves extra glyphs for one case (`context.icons`), looked up before the bonded set's own;
 * `null` clears them.
 *
 * @param icons - Glyphs by name, or null.
 */
export function setCaseIcons(icons: IconSet | null): void {
  caseIcons = icons ?? {}
}

/**
 * The bonded icon set with the current case's glyphs in front of it.
 *
 * @returns The icon set the kit bonds.
 */
function createConformanceIconSet(): IconSet {
  const current = (): IconSet => ({ ...iconSet, ...caseIcons })
  return new Proxy<IconSet>(
    {},
    {
      get: (_target, name) =>
        Reflect.get(Object.hasOwn(caseIcons, name) ? caseIcons : iconSet, name),
      has: (_target, name) => Reflect.has(current(), name),
      ownKeys: () => Reflect.ownKeys(current()),
      getOwnPropertyDescriptor: (_target, name) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(current(), name)
        // The target is an empty, extensible object, so each glyph must be reported as configurable.
        return descriptor && { ...descriptor, configurable: true }
      },
    },
  )
}

/** The locales every case has: English and {@link PSEUDO_LOCALE}. */
const BUILT_IN_LOCALES = ['en', PSEUDO_LOCALE]

/**
 * The simple provider with English and {@link PSEUDO_LOCALE}. Neither locale carries
 * translations: a component's own English defaults are what it renders, bracketed in the
 * pseudo-locale.
 *
 * A case may also switch to any locale its translations name (`translations: { fr: {} }`,
 * an empty entry when only dates and numbers change): that locale exists, left to right,
 * for that case only. `getLocales()` lists the built-in two and the case's own, so a
 * component that lists the locales renders the same whichever cases ran before it.
 *
 * @returns The provider.
 */
function createConformanceI18nProvider(): I18nProvider {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    { code: PSEUDO_LOCALE, name: 'Pseudo', direction: 'ltr', translations: {} },
  ])
  localeRegistry = base
  const inCase = (code: string): boolean =>
    BUILT_IN_LOCALES.includes(code) || caseTranslations[code] !== undefined
  return {
    ...base,
    getLocales: () => base.getLocales().filter((locale) => inCase(locale.code)),
    setLocale: async (locale) => {
      if (!inCase(locale))
        throw new Error(
          `conformance: a step switches to the locale "${locale}", which the case's context.translations does not name; add \`${locale}: {}\` (an empty entry formats dates and numbers in that locale and keeps the English text)`,
        )
      await base.setLocale(locale)
    },
    t: (key, values, options) => {
      const own =
        lookup(caseTranslations[base.getLocale()], key) ?? lookup(caseTranslations.en, key)
      const text = base.t(
        key,
        values,
        own === undefined ? options : { ...options, defaultValue: own },
      )
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
  setIconSet(createConformanceIconSet())
  setI18nProvider(createConformanceI18nProvider())
  installPseudoLocaleIntl(PSEUDO_LOCALE)
}

/**
 * Installs a `matchMedia` that answers `(min-width: Npx)` / `(max-width: Npx)`
 * against a fixed viewport width, pointer and hover queries for the given pointer,
 * and false for anything else (`(prefers-color-scheme: dark)` included).
 *
 * @param width - Viewport width in CSS pixels.
 * @param pointer - The primary pointer ({@link UICase.pointer}); without it every
 *   pointer and hover query answers false.
 */
export function installViewport(width: number, pointer?: 'fine' | 'coarse'): void {
  const answer = (query: string): boolean => {
    const min = /min-width:\s*(\d+(?:\.\d+)?)px/.exec(query)
    const max = /max-width:\s*(\d+(?:\.\d+)?)px/.exec(query)
    if (min) return width >= Number(min[1])
    if (max) return width <= Number(max[1])
    const device = /\((?:any-)?(pointer|hover):\s*([a-z]+)\s*\)/.exec(query)
    if (device && pointer) {
      const value = device[1] === 'pointer' ? pointer : pointer === 'coarse' ? 'none' : 'hover'
      return device[2] === value
    }
    return false
  }
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  window.matchMedia = (query: string): MediaQueryList =>
    Object.assign(new EventTarget(), {
      matches: answer(query),
      media: query,
      onchange: null,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
    })
}

/** The case's last paste or drag data, which a later `transfer` step without its own reuses. */
let transfer: TransferData | null = null

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
  installViewport(testCase.viewportWidth ?? 1280, testCase.pointer)
  installDomGaps()
  setLayoutStubs(testCase.layout ?? [])
  transfer = null
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

/**
 * The target of a step that may also name `window` or `document`.
 *
 * @param selector - A CSS selector, `window` or `document`.
 * @returns The target.
 */
const eventTarget = (selector: string): EventTarget =>
  selector === 'window' ? window : selector === 'document' ? document : query(selector)

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
const click = (el: Element, modifiers: ClickModifiers = {}): void => {
  if (el instanceof HTMLElement && Object.keys(modifiers).length === 0) el.click()
  else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers }))
}

/**
 * The pointer and mouse presses a real click starts with.
 *
 * @param el - The element pressed.
 * @param modifiers - Modifier keys held during the press.
 */
const press = (el: Element, modifiers: ClickModifiers = {}): void => {
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup'])
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...modifiers }))
}

/**
 * Clicks an element and reports, for a click inside an `a[href]`, whether the
 * click's default (following the anchor) was prevented. A window listener reads
 * it after every framework's own handler (element, root or document level) ran,
 * then prevents it, because jsdom cannot leave the page.
 *
 * @param el - The element to click.
 * @param modifiers - Modifier keys held during the click.
 * @returns The snapshot note for an anchor click, or `undefined`.
 */
const clickReportingAnchorDefault = (
  el: Element,
  modifiers: ClickModifiers = {},
): string | undefined => {
  if (!el.closest('a[href]')) {
    click(el, modifiers)
    return undefined
  }
  const seen: { prevented?: boolean } = {}
  const observe = (event: Event): void => {
    seen.prevented = event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', observe)
  try {
    click(el, modifiers)
  } finally {
    window.removeEventListener('click', observe)
  }
  if (seen.prevented === undefined) return '@click propagation stopped before the window'
  return seen.prevented ? '@click default prevented' : '@click default kept'
}

const setNativeChecked = (el: HTMLInputElement, checked: boolean): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set
  if (setter) setter.call(el, checked)
  else el.checked = checked
}

/**
 * Writes one `localStorage` entry as another tab would (`null` removes it) and
 * dispatches the `storage` event that tab's write fires on this page.
 *
 * @param key - The entry's key.
 * @param value - Its new value, or `null` to remove it.
 */
export function writeLocalStorageFromOtherTab(key: string, value: string | null): void {
  const oldValue = localStorage.getItem(key)
  if (value === null) localStorage.removeItem(key)
  else localStorage.setItem(key, value)
  const event = new StorageEvent('storage', { key, oldValue, newValue: value, url: location.href })
  // jsdom's constructor only takes its own Storage; the kit's is the page's.
  Object.defineProperty(event, 'storageArea', { value: localStorage })
  window.dispatchEvent(event)
}

/** Elements a focus step could not focus and dispatched `focusin` on: their blur step dispatches `focusout`. */
const dispatchedFocus = new WeakSet<HTMLElement>()

/**
 * Moves focus to or off an element the way a browser does: `focus()` / `blur()`, which fire
 * `focusin` / `focusout` once. Only an element focus cannot reach (a `div` with no
 * `tabindex`), where they fire nothing, gets the event dispatched, so a case that focuses one
 * still reaches its handler, and its blur step then dispatches `focusout`.
 *
 * A step that would move no focus throws, naming the fix, instead of passing while it does
 * nothing: a focus step on an element that already has focus or is disabled, and a blur step on
 * an element without focus (a user types into a field only after focusing it, so a case that
 * types and then blurs focuses the field first).
 *
 * @param el - The element.
 * @param type - `focusin` for a focus step, `focusout` for a blur step.
 * @param selector - The step's selector, for the error.
 * @throws {Error} When the step would move no focus.
 */
const focusOnce = (el: HTMLElement, type: 'focusin' | 'focusout', selector: string): void => {
  const hasFocus = document.activeElement === el || dispatchedFocus.has(el)
  if (type === 'focusin' && hasFocus)
    throw new Error(
      `focus: "${selector}" already has focus, so a browser fires no focusin; remove the step`,
    )
  if (type === 'focusin' && el.matches(':disabled'))
    throw new Error(
      `focus: "${selector}" is disabled, so a browser moves no focus to it; remove the step`,
    )
  if (type === 'focusout' && !hasFocus)
    throw new Error(
      `blur: "${selector}" does not have focus, so a browser fires no focusout; add { type: 'focus', selector: ${JSON.stringify(selector)} } before the step that needs it`,
    )
  if (type === 'focusout' && dispatchedFocus.delete(el)) {
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    return
  }
  let fired = false
  const mark = (): void => {
    fired = true
  }
  el.addEventListener(type, mark)
  try {
    if (type === 'focusin') el.focus()
    else el.blur()
  } finally {
    el.removeEventListener(type, mark)
  }
  if (!fired && type === 'focusin') {
    dispatchedFocus.add(el)
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  }
}

/**
 * Performs one DOM interaction exactly the same way for every framework.
 * `props`, `advance`, `settle`, `navigate`, `locale`, `http`, `auth`, `fetch` and `unmount`
 * steps are handled by the step runner, not here.
 *
 * @param step - The interaction to perform.
 * @returns A note for the snapshot after the step (a `click` inside an anchor reports
 *   whether the anchor's default was prevented), or `undefined`.
 */
export function performDomInteraction(step: Interaction): string | undefined {
  switch (step.type) {
    case 'click': {
      const el = query(step.selector)
      press(el, step.modifiers)
      return clickReportingAnchorDefault(el, step.modifiers)
    }
    case 'dblclick': {
      const el = query(step.selector)
      press(el)
      click(el)
      click(el)
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
      return undefined
    }
    case 'focus':
      focusOnce(query(step.selector), 'focusin', step.selector)
      return
    case 'blur':
      focusOnce(query(step.selector), 'focusout', step.selector)
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
          // jsdom reports these defaults itself; a composing key (an IME's Enter) sets both.
          isComposing: step.isComposing ?? false,
          keyCode: step.keyCode ?? 0,
          shiftKey: step.shiftKey ?? false,
          metaKey: step.metaKey ?? false,
          ctrlKey: step.ctrlKey ?? false,
          altKey: step.altKey ?? false,
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
      eventTarget(step.selector).dispatchEvent(
        new Event(step.event, { bubbles: step.bubbles ?? false, cancelable: true }),
      )
      return
    }
    case 'scroll': {
      const el = query(step.selector)
      // Only a stubbed element keeps an offset: jsdom has no layout, so its own scrollTop stays 0.
      if (!Object.getOwnPropertyDescriptor(el, 'scrollTop')?.set)
        throw new Error(
          `scroll: "${step.selector}" has no layout stub with a scrollTop; add one to the case's layout`,
        )
      el.scrollTop = step.top
      el.dispatchEvent(new Event('scroll'))
      return
    }
    case 'windowFocus': {
      setWindowFocus(step.focused)
      window.dispatchEvent(new FocusEvent(step.focused ? 'focus' : 'blur'))
      return
    }
    case 'resize': {
      const elements = Array.from(document.querySelectorAll(step.selector))
      if (elements.length === 0) throw new Error(`resize: no element matches ${step.selector}`)
      notifyResize(elements, step.width ?? 0, step.height ?? 0)
      return
    }
    case 'cues': {
      const el = query(step.selector)
      if (!(el instanceof HTMLTrackElement))
        throw new Error(
          `cues: "${step.selector}" matched a <${el.tagName.toLowerCase()}>, not a <track>`,
        )
      reachCues(el, step.cues)
      return
    }
    case 'pointer': {
      const target = eventTarget(step.selector)
      const pressed = step.event === 'pointerdown' || step.event === 'pointermove'
      const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: step.clientX ?? 0,
        clientY: step.clientY ?? 0,
        button: step.event === 'pointermove' ? -1 : 0,
        buttons: pressed ? 1 : 0,
      }
      target.dispatchEvent(
        new PointerEvent(step.event, {
          ...init,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        }),
      )
      const mouse = {
        pointerdown: 'mousedown',
        pointermove: 'mousemove',
        pointerup: 'mouseup',
        pointercancel: undefined,
        lostpointercapture: undefined,
      }[step.event]
      if (mouse) target.dispatchEvent(new MouseEvent(mouse, init))
      return
    }
    case 'transfer': {
      if (step.files || step.data || !transfer)
        transfer = createTransferData(step.files ?? [], step.data ?? {})
      const paste = step.event === 'paste'
      const init = {
        bubbles: true,
        cancelable: step.event !== 'dragleave' && step.event !== 'dragend',
        composed: true,
      }
      const event = paste ? new Event('paste', init) : new MouseEvent(step.event, init)
      Object.defineProperty(event, paste ? 'clipboardData' : 'dataTransfer', { value: transfer })
      query(step.selector).dispatchEvent(event)
      const outcome = `@${step.event} default ${event.defaultPrevented ? 'prevented' : 'kept'}`
      return paste ? outcome : `${outcome} dropEffect=${transfer.dropEffect}`
    }
    case 'message': {
      const source = step.from
        ? ((query(step.from) as HTMLIFrameElement).contentWindow ?? null)
        : null
      if (step.from && !source) throw new Error(`message: ${step.from} has no window`)
      window.dispatchEvent(
        new MessageEvent('message', {
          data: structuredClone(step.data),
          origin: step.origin ?? '',
          source,
        }),
      )
      return
    }
    case 'localStorage':
      writeLocalStorageFromOtherTab(step.key, step.value)
      return
    case 'mark': {
      const elements = document.querySelectorAll(step.selector)
      if (elements.length === 0) throw new Error(`mark: no element matches ${step.selector}`)
      elements.forEach((el, index) => el.setAttribute('data-conformance-mark', String(index)))
      return
    }
    case 'advance':
    case 'props':
    case 'children':
    case 'settle':
    case 'invoke':
    case 'navigate':
    case 'locale':
    case 'http':
    case 'auth':
    case 'control':
    case 'fetch':
    case 'unmount':
    case 'remount':
      return
  }
}
