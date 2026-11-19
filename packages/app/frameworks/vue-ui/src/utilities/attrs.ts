/**
 * Fallthrough-attribute helpers shared by the Vue UI components.
 *
 * Every component mirrors its `@molecule/app-ui-react` counterpart exactly:
 * React destructures its named props and spreads what remains (`{...rest}`)
 * onto the root element. In Vue the named props are declared (so they never
 * appear in `attrs`), `inheritAttrs` is off, and these helpers rebuild the
 * same spread: `restAttrs` is the `{...rest}` and `classOf`/`styleOf` merge
 * the `className`/`style` props with Vue's own `class`/`style` attrs so both
 * spellings reach the same element with the same tokens.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Vue's fallthrough attributes (everything not declared as a prop). */
export type FallthroughAttrs = Record<string, unknown>

/** A style value as Vue accepts it (object, or a declaration string). */
export type StyleValue = Record<string, string | number | undefined> | string | undefined

/**
 * The React `...rest` spread: every fallthrough attr except `class` and
 * `style`, which {@link classOf} and {@link styleOf} merge separately, with
 * React's DOM-callback names (`onKeyDown`, `onDoubleClick`, `onFocus`, …)
 * rewritten to the Vue listener keys of the events React listens to, and
 * `BaseProps.automationId` as the `data-mol-id` attribute it documents.
 *
 * @param attrs - Vue fallthrough attrs.
 * @returns Attrs to spread onto the root element.
 */
export function restAttrs(attrs: FallthroughAttrs): FallthroughAttrs {
  const rest: FallthroughAttrs = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style') continue
    rest[listenerKey(key)] = value
  }
  return rest
}

/**
 * A caller's listener from Vue's fallthrough attrs, for a component that runs its own handler
 * first and then the caller's (as React's kit does after destructuring the prop). Vue types attrs
 * as `unknown`; a listener is a function, or an array of them when one is bound twice. Anything
 * else is no listener, so a non-function attr can never be called.
 *
 * @param attrs - Vue fallthrough attrs.
 * @param name - The attr key (`onMouseEnter`, `onSort`, …).
 * @returns A function calling every listener with its arguments, or `undefined` when there is none.
 */
export function attrListener<A extends unknown[]>(
  attrs: FallthroughAttrs,
  name: string,
): ((...args: A) => void) | undefined {
  const value = attrs[name]
  if (typeof value === 'function') {
    return (...args: A): void => {
      value(...args)
    }
  }
  if (Array.isArray(value)) {
    const listeners = value.filter((entry) => typeof entry === 'function')
    if (listeners.length === 0) return undefined
    return (...args: A): void => {
      for (const listener of listeners) listener(...args)
    }
  }
  return undefined
}

/**
 * The element `class` value: the component's `className` prop (React's name)
 * plus Vue's own `class` attr, for callers that use either spelling.
 *
 * @param className - The `className` prop value.
 * @param attrs - Vue fallthrough attrs.
 * @returns The class strings to join with the component's own classes.
 */
export function classOf(
  className: string | undefined,
  attrs: FallthroughAttrs,
): (string | undefined)[] {
  const extra = attrs.class
  if (extra === undefined || extra === null || extra === '') return [className]
  return [className, Array.isArray(extra) ? extra.join(' ') : (extra as string)]
}

/**
 * The element `style` value: the component's `style` prop plus Vue's own
 * `style` attr, as a value Vue's `h()` normalizes (an array it concatenates).
 *
 * @param style - The `style` prop value.
 * @param attrs - Vue fallthrough attrs.
 * @returns A style value for `h()`, or `undefined` when neither is set.
 */
export function styleOf(style: StyleValue, attrs: FallthroughAttrs): unknown {
  const attrStyle = attrs.style as StyleValue
  if (style === undefined && attrStyle === undefined) return undefined
  if (attrStyle === undefined) return style
  if (style === undefined) return attrStyle
  return [style, attrStyle]
}

/**
 * A node-valued prop as the adapter and templates send it: a VNode (or array
 * of VNodes) under the prop, or a named slot of the same name — whichever is
 * present, exactly once.
 *
 * @param value - The prop's value (usually a VNode or VNode[]).
 * @param slot - The same-named slot's render function, when provided.
 * @returns The node content to render, or `undefined`.
 */
export function nodeProp<T>(value: T | undefined, slot: (() => unknown) | undefined): T | unknown {
  if (value !== undefined && value !== null && value !== false) return value
  return slot?.()
}

/**
 * Children Vue's `h()` accepts. `VNodeChild` (the type React's `Children`
 * maps onto) also includes the `null`/`undefined`/`void` atoms — all three
 * render as nothing — but `h()`'s children parameter rejects them, so a
 * React-shaped children value is narrowed with this before it is passed.
 */
export type RenderableChildren = Exclude<VNodeChild, null | undefined | void>

/**
 * React's DOM-callback names whose native event is not the lowercased name: React's `onFocus`
 * and `onBlur` listen to the bubbling `focusin` and `focusout`, and its `onDoubleClick` to
 * `dblclick`. Keyed by the lowercased name after `on`.
 */
const REACT_EVENT_ALIASES: Record<string, string> = {
  focus: 'focusin',
  blur: 'focusout',
  doubleclick: 'dblclick',
}

/**
 * The Vue listener key for an `on*` attr. React forwards DOM callbacks verbatim
 * (`onKeyDown`, `onDoubleClick`, `onFocus`), but Vue hyphenates whatever follows `on`
 * (`onKeyDown` would listen for `key-down`). The key is rewritten to `on` + the capitalised
 * DOM event React listens to (`onKeydown`, `onDblclick`, `onFocusin`), keeping Vue's
 * `Once`/`Passive`/`Capture` modifiers. A key already in that form maps to itself.
 * `automationId` becomes `data-mol-id`.
 *
 * @param key - The attr name.
 * @returns The key to spread onto a native element.
 */
function listenerKey(key: string): string {
  if (key === 'automationId' || key === 'automation-id') return 'data-mol-id'
  const match = /^on([A-Z][a-zA-Z]*?)((?:Once|Passive|Capture)*)$/.exec(key)
  if (!match) return key
  const name = match[1].toLowerCase()
  const event = REACT_EVENT_ALIASES[name] ?? name
  return `on${event[0].toUpperCase()}${event.slice(1)}${match[2]}`
}
