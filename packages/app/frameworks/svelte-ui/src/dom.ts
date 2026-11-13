/**
 * DOM helpers shared by the Svelte components: generated ids, the
 * document-body portal action, the focus-trap query and the reference-counted
 * body scroll lock. Each mirrors the exact behavior of its React counterpart
 * so portals, focus and locking are indistinguishable between frameworks.
 *
 * @module
 */

/** Elements the WAI-ARIA APG dialog pattern treats as tab-stops for the focus trap. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

let idCounter = 0

/**
 * Generates a unique id, standing in for React's `useId()` where a component
 * needs a stable per-instance id prefix (a plain module-level counter, the
 * framework's own way — ids only have to be unique, never to match React's
 * `useId` strings: the parity normalizer renumbers every id, including a
 * dangling reference, by order of appearance).
 *
 * @returns A fresh unique id string.
 */
export function useGeneratedId(): string {
  idCounter += 1
  return `mol-uid-${idCounter}`
}

/**
 * Returns the tab-stop elements inside a container, in DOM (tab) order.
 *
 * @param container - The element to search within.
 * @returns The focusable descendants, in document order.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

// Module-level open-modal stack: every open Modal instance registers its id
// here. Escape and the Tab focus-trap only act for the TOPMOST entry, so a
// confirm dialog stacked over a drawer does not let one Escape press close
// both (mirrors the React Modal's stack).
const openModalStack: string[] = []

/**
 * Pushes a modal instance onto the open-stack (it becomes the topmost).
 *
 * @param id - The modal instance id.
 */
export function pushModalStack(id: string): void {
  if (!openModalStack.includes(id)) openModalStack.push(id)
}

/**
 * Removes a modal instance from the open-stack.
 *
 * @param id - The modal instance id.
 */
export function popModalStack(id: string): void {
  const index = openModalStack.indexOf(id)
  if (index !== -1) openModalStack.splice(index, 1)
}

/**
 * Whether the given modal instance is currently the topmost of the stack.
 *
 * @param id - The modal instance id.
 * @returns True when the instance is the topmost open modal.
 */
export function isTopOfModalStack(id: string): boolean {
  return openModalStack.length > 0 && openModalStack[openModalStack.length - 1] === id
}

/**
 * Svelte action that moves the element it is placed on into `document.body`,
 * reproducing React's `createPortal(…, document.body)` output: the portal
 * children become direct body children, in mount order, with no extra wrapper
 * element. Svelte still owns the node and removes it from wherever it sits on
 * teardown.
 *
 * @param node - The element to portal into the document body.
 */
export function bodyPortal(node: HTMLElement): void {
  if (typeof document !== 'undefined') document.body.appendChild(node)
}

// Reference-counted body scroll lock: two overlays can be open at once; closing
// either one must not unlock page scroll behind the other.
let scrollLockCount = 0
let previousBodyOverflow = ''

/**
 * Locks body scroll on the first caller; later callers just increment the count.
 */
export function lockBodyScroll(): void {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

/**
 * Decrements the lock count; restores the original overflow only once it reaches zero.
 */
export function unlockBodyScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

/**
 * Svelte action that keeps a checkbox's `checked` DOM state mirroring a prop
 * the way React renders a controlled input: BOTH the property and the reflected
 * `checked` attribute are set (React's initial render writes the attribute;
 * Svelte's `checked={x}` writes only the property, so the attribute never
 * appears and parity snapshots diverge).
 *
 * @param node - The checkbox input to keep in sync.
 * @param value - Whether the checkbox is checked.
 * @returns The action with an update that re-syncs on prop changes.
 */
export function reflectChecked(
  node: HTMLInputElement,
  value: boolean,
): { update: (next: boolean) => void } {
  const apply = (next: boolean): void => {
    node.checked = next
    if (next) node.setAttribute('checked', '')
    else node.removeAttribute('checked')
  }
  apply(value)
  return { update: apply }
}

/**
 * React prop names whose delegated DOM event differs from the lowercased prop
 * suffix: React binds onFocus/onBlur to the BUBBLING focusin/focusout events,
 * not to focus/blur (which do not bubble), so a handler on a child element
 * fires for both the native event and any redispatched one.
 */
const REST_EVENT_TYPES: Record<string, string> = {
  onFocus: 'focusin',
  onBlur: 'focusout',
}

/**
 * Svelte action attaching the `on*` handlers inside a rest-prop bag as real
 * event listeners on the element (React spreads handlers; Svelte's attribute
 * spread cannot forward prop-derived event keys).
 *
 * @param node - The element the handlers are attached to.
 * @param props - The rest props; every `on*` function becomes a listener.
 * @returns The action with an update that re-attaches on prop changes.
 */
export function spreadEvents(
  node: Element,
  props: Record<string, unknown>,
): { update: (next: Record<string, unknown>) => void; destroy: () => void } {
  let current = props
  const attached: [string, EventListener][] = []
  const detach = (): void => {
    for (const [type, listener] of attached) node.removeEventListener(type, listener)
    attached.length = 0
  }
  const attach = (): void => {
    for (const [key, value] of Object.entries(current)) {
      if (key.startsWith('on') && typeof value === 'function') {
        const type = REST_EVENT_TYPES[key] ?? key.slice(2).toLowerCase()
        const listener = value as EventListener
        node.addEventListener(type, listener)
        attached.push([type, listener])
      }
    }
  }
  attach()
  return {
    update(next: Record<string, unknown>): void {
      detach()
      current = next
      attach()
    },
    destroy: detach,
  }
}

/**
 * Svelte action reproducing react-dom's input `value`/`defaultValue` handling
 * exactly (`initInput`/`updateInput` in ReactDOMInput.js), which Svelte's
 * `value={x}` binding does not: the value is applied through BOTH the
 * `value` property and the `defaultValue` property (whose reflection is the
 * DOM `value` attribute — that is why React inputs carry a `value` attribute
 * that tracks every re-render's non-null `value`, keeps the initial value for
 * a `defaultValue`-driven input, and disappears once a re-render sees neither).
 *
 * @param node - The input element.
 * @param props - `{ value, defaultValue }` as passed to React's `<input>`.
 * @returns The action with an update that re-applies on prop changes.
 */
export function reactInputValue(
  node: HTMLInputElement,
  props: { value?: unknown; defaultValue?: unknown },
): { update: (next: { value?: unknown; defaultValue?: unknown }) => void } {
  let lastDefaultValue: unknown
  let mounted = false
  const setDefaultValue = (text: string): void => {
    if (node.defaultValue !== text) node.defaultValue = text
  }
  const apply = (next: { value?: unknown; defaultValue?: unknown }): void => {
    const { value, defaultValue } = next
    if (!mounted) {
      // initInput: the property is seeded from value ?? defaultValue, and the
      // attribute (via the defaultValue property) carries the same string —
      // assigned unconditionally, so an empty string still writes value="".
      if (value !== undefined && value !== null) {
        const text = String(value)
        if (node.value !== text) node.value = text
        node.defaultValue = text
      } else if (defaultValue !== undefined && defaultValue !== null) {
        const text = String(defaultValue)
        if (node.value !== text) node.value = text
        node.defaultValue = text
      }
    } else if (value !== undefined && value !== null) {
      const text = String(value)
      if (node.value !== text) node.value = text
      setDefaultValue(text)
    } else if (defaultValue !== undefined && defaultValue !== null) {
      // updateInput leaves the property alone for a defaultValue-driven input.
      setDefaultValue(String(defaultValue))
    } else if (lastDefaultValue !== undefined && lastDefaultValue !== null) {
      node.removeAttribute('value')
    }
    lastDefaultValue = defaultValue
    mounted = true
  }
  apply(props)
  return { update: apply }
}
