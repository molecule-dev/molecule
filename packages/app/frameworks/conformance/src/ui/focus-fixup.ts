/**
 * The HTML focus fixup rule, applied when a step settles.
 *
 * When the focused element stops being focusable (an input disabled while a submit is pending, a
 * field hidden or removed), a browser moves focus to the body at its next rendering update. jsdom
 * does the same on a 16 ms timer, so whether a snapshot taken right after the step sees the move
 * depends on how fast the run is: the same case passed or failed by machine load. The kit applies
 * the rule itself before each snapshot, so every framework, and the React recording, shows the
 * focus a rendered frame would.
 *
 * `isFocusableArea` follows jsdom's `isFocusableAreaElement` (`living/helpers/focusing.js`) through
 * the public DOM; `focus-fixup.test.ts` checks it against jsdom's own fixup.
 *
 * @module
 */

const HTML_NS = 'http://www.w3.org/1999/xhtml'
const SVG_NS = 'http://www.w3.org/2000/svg'

/** The form controls a `disabled` state or `type="hidden"` takes out of the focus order. */
const FORM_CONTROLS = new Set(['input', 'select', 'textarea', 'button'])

/**
 * The element's flat-tree parent: its assigned slot, else its parent element, else the host of the
 * shadow root it sits in.
 *
 * @param element - The element.
 * @returns Its flat-tree parent, or null at the top.
 */
function flatTreeParent(element: Element): Element | null {
  if (element.assignedSlot) return element.assignedSlot
  if (element.parentElement) return element.parentElement
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

/**
 * Whether a `tabindex` attribute parses as an integer (HTML's rule: any integer makes an element
 * focusable).
 *
 * @param element - The element.
 * @returns True when it has an integer tabindex.
 */
const hasIntegerTabIndex = (element: Element): boolean =>
  !Number.isNaN(parseInt(element.getAttribute('tabindex') ?? '', 10))

/**
 * Whether an element is a focusable area (HTML "focusable area"), as jsdom decides it: connected,
 * rendered (no `display: none` on it or a flat-tree ancestor), and a form control that is not
 * disabled or hidden, an element with an integer `tabindex`, an `iframe`, an `a` with `href`, a
 * details' first `summary`, or an element with `contenteditable`.
 *
 * @param element - The element.
 * @returns True when it can hold focus.
 */
export function isFocusableArea(element: Element): boolean {
  if (!element.isConnected) return false
  const view = element.ownerDocument.defaultView
  if (!view) return false
  for (let node: Element | null = element; node; node = flatTreeParent(node))
    if (view.getComputedStyle(node).display === 'none') return false
  const name = element.localName
  if (element.namespaceURI === HTML_NS) {
    if (FORM_CONTROLS.has(name)) {
      if (name === 'input' && (element as HTMLInputElement).type === 'hidden') return false
      return !element.matches(':disabled')
    }
    if (hasIntegerTabIndex(element)) return true
    if (name === 'iframe') return true
    if (name === 'a' && element.hasAttribute('href')) return true
    const details = element.parentElement
    if (
      name === 'summary' &&
      details?.localName === 'details' &&
      details.querySelector(':scope > summary') === element
    )
      return true
    return element.hasAttribute('contenteditable')
  }
  if (element.namespaceURI === SVG_NS)
    return hasIntegerTabIndex(element) || (name === 'a' && element.hasAttribute('href'))
  return false
}

/**
 * The focused element when it is no longer a focusable area, the element the focus fixup rule
 * moves focus off.
 *
 * @param doc - The document (the global one by default; none in a node-environment suite).
 * @returns That element, or null when focus is on the body or on an element that can hold it.
 */
export function elementFocusFixupMoves(
  doc: Document | undefined = globalThis.document,
): HTMLElement | SVGElement | null {
  if (!doc) return null
  const active = doc.activeElement
  if (!active || active === doc.body || active === doc.documentElement) return null
  if (isFocusableArea(active)) return null
  return active instanceof HTMLElement || active instanceof SVGElement ? active : null
}
