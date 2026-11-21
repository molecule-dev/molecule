/**
 * A browser's `:focus-visible` judgement, the same for every framework and every jsdom.
 *
 * jsdom 31 matches `:focus-visible` exactly like `:focus`, so a tooltip that opens on keyboard
 * focus also opened after every click that returned focus to its trigger. jsdom 30's selector
 * engine kept an input history of its own whose answers depended on the cases before, and it
 * judged a script focus that followed a click as visible, which no browser does. The kit therefore
 * answers `el.matches(':focus-visible')` itself, by the heuristics of Selectors 4 §9.4 that
 * Chromium and Firefox implement:
 *
 * - a key press without Ctrl, Alt or Meta switches to keyboard input, and the focused element
 *   becomes focus-visible;
 * - a pointer press (or a touch) switches to pointer input, and nothing is focus-visible;
 * - an element that gains focus is focus-visible while keyboard input is current (Tab, an arrow
 *   key that moves focus, a script focusing in response to a key), and not after a pointer press
 *   (a click, or a script focusing in response to one);
 * - a focused element that takes text (a text field, a textarea, editable content) is always
 *   focus-visible.
 *
 * Every case starts as if the user had just clicked into the page ({@link resetFocusVisible}).
 * Any other query naming `:focus-visible` (a compound selector, `querySelector`, `closest`) throws,
 * so nothing can read jsdom's own answer.
 *
 * @module
 */

/** The input the user last gave the page. */
type Modality = 'keyboard' | 'pointer'

let modality: Modality = 'pointer'
/** The element the judgement made focus-visible, while it has focus. */
let visible: Element | null = null

/** Marks a prototype (or a window) whose methods (or listeners) this module installed. */
const INSTALLED = Symbol('conformance :focus-visible model')

/** Input types whose element takes no typed text (Selectors 4: "supports keyboard input"). */
const NO_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

/**
 * Whether an element takes typed text, which a browser shows as focus-visible however it was
 * focused. jsdom has no `isContentEditable`, so editable content is read from the attribute.
 *
 * @param el - The element.
 * @returns True for a writable text field, a writable textarea, or editable content.
 */
const takesText = (el: Element): boolean => {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled
  if (el instanceof HTMLInputElement)
    return !el.readOnly && !el.disabled && !NO_TEXT_INPUT_TYPES.has(el.type)
  for (let node: Element | null = el; node; node = node.parentElement) {
    const editable = node.getAttribute('contenteditable')
    if (editable === null) continue
    return editable !== 'false'
  }
  return false
}

/**
 * The kit's answer to `el.matches(':focus-visible')`.
 *
 * @param el - The element asked about.
 * @returns True when the element has focus and a browser would draw its focus indicator.
 */
const isFocusVisible = (el: Element): boolean =>
  el === el.ownerDocument.activeElement && (el === visible || takesText(el))

/**
 * The error for a query the model cannot answer.
 *
 * @param method - The DOM method called.
 * @param selectors - The selector it was given.
 * @returns The error to throw.
 */
const unsupported = (method: string, selectors: string): Error =>
  new Error(
    `conformance: ${method}(${JSON.stringify(selectors)}) names :focus-visible, which jsdom matches like :focus; the kit answers only el.matches(':focus-visible') the way a browser does, so ask that`,
  )

/** Reads the event target as an element, or null for the window or document. */
const elementOf = (event: Event): Element | null =>
  event.target instanceof Element ? event.target : null

/**
 * Follows the input the page receives. Capture listeners on the window run before every listener
 * a component adds, so a component's own `focus` or `keydown` handler already sees the judgement.
 *
 * @param win - The window to listen on.
 */
const listen = (win: Window): void => {
  if (Reflect.get(win, INSTALLED)) return
  Reflect.defineProperty(win, INSTALLED, { value: true })
  const options = { capture: true, passive: true }
  win.addEventListener(
    'keydown',
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      modality = 'keyboard'
      const active = win.document.activeElement
      if (active && active !== win.document.body && active !== win.document.documentElement)
        visible = active
    },
    options,
  )
  const pointer = (): void => {
    modality = 'pointer'
    visible = null
  }
  for (const type of ['pointerdown', 'mousedown', 'touchstart'])
    win.addEventListener(type, pointer, options)
  win.addEventListener(
    'focus',
    (event) => {
      const el = elementOf(event)
      if (el) visible = modality === 'keyboard' || takesText(el) ? el : null
    },
    options,
  )
  win.addEventListener(
    'blur',
    (event) => {
      if (elementOf(event) === visible) visible = null
    },
    options,
  )
}

/**
 * Replaces a selector method so a selector naming `:focus-visible` throws.
 *
 * @param owner - The prototype that defines the method.
 * @param method - The method's name.
 */
const refuseFocusVisible = (
  owner: object,
  method: 'closest' | 'querySelector' | 'querySelectorAll',
): void => {
  const native = Reflect.get(owner, method) as (this: unknown, selectors: string) => unknown
  Object.defineProperty(owner, method, {
    configurable: true,
    writable: true,
    value(this: unknown, selectors: string): unknown {
      if (String(selectors).includes('focus-visible')) throw unsupported(method, String(selectors))
      return native.call(this, selectors)
    },
  })
}

/**
 * Installs the model in the current window: `Element.prototype.matches` answers
 * `':focus-visible'` from it, other queries naming `:focus-visible` throw, and window capture
 * listeners follow the page's input. Safe to call any number of times.
 */
export function installFocusVisible(): void {
  if (typeof window === 'undefined' || typeof Element === 'undefined') return
  listen(window)
  const proto = Element.prototype
  if (Reflect.get(proto, INSTALLED)) return
  Reflect.defineProperty(proto, INSTALLED, { value: true })
  const nativeMatches = proto.matches
  Object.defineProperty(proto, 'matches', {
    configurable: true,
    writable: true,
    value(this: Element, selectors: string): boolean {
      const text = String(selectors)
      if (!text.includes('focus-visible')) return nativeMatches.call(this, text)
      if (text.trim() === ':focus-visible') return isFocusVisible(this)
      throw unsupported('matches', text)
    },
  })
  refuseFocusVisible(proto, 'closest')
  for (const owner of [proto, Document.prototype, DocumentFragment.prototype]) {
    refuseFocusVisible(owner, 'querySelector')
    refuseFocusVisible(owner, 'querySelectorAll')
  }
}

/**
 * Puts the judgement where every case starts: pointer input last and nothing focus-visible, as if
 * the user had just clicked into the page. So a case's recording never depends on the cases
 * before it (a Svelte `DeviceFrameSelector` case once passed alone and failed in its file, because
 * an earlier case had left jsdom's own engine holding an element it judged focus-visible).
 */
export function resetFocusVisible(): void {
  installFocusVisible()
  modality = 'pointer'
  visible = null
}
