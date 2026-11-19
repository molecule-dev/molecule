/**
 * React-compatible writing of an element-prop record onto a live element.
 *
 * React spreads a props object onto an element on every render: `on[A-Z]*`
 * functions become listeners, every other key becomes an attribute, and the
 * difference against the previous render is what reaches the DOM. Angular
 * ports that take such an object as data (a navigation link entry, a name
 * link's props) need the same rules; this writer holds them once.
 *
 * @module
 */

import type { Renderer2 } from '@angular/core'

import { styleText } from './style.js'
import { cn } from './utilities.js'

/**
 * Attribute names whose `false` is a real value rather than an absence, so
 * React writes `"false"` instead of removing the attribute.
 */
const TEXT_BOOLEAN = /^(aria-|data-)|^(contentEditable|draggable|spellCheck)$/

/**
 * Whether a prop key is an event handler React would register as a listener
 * (`onClick`, `onDoubleClickCapture`, …).
 *
 * @param key - The prop key.
 * @returns True for an `on` + uppercase key.
 */
const isListener = (key: string): boolean => /^on[A-Z]/.test(key)

/**
 * Serializes a React style object for the `style` attribute, ignoring a value
 * that is not an object (React only accepts an object there).
 *
 * @param style - The prop value.
 * @returns The attribute text, or undefined when there is nothing to write.
 */
const styleAttribute = (style: unknown): string | undefined =>
  typeof style === 'object' && style !== null
    ? (styleText(style as Record<string, unknown>) ?? undefined)
    : undefined

/**
 * Writes a React element-prop record onto one Angular element, re-applying
 * only what changed since the previous {@link ElementPropsWriter.write}.
 *
 * The rules are React's spread:
 *
 * - `on[A-Z]*` functions become listeners (`onClick` → `click`, a `Capture`
 *   suffix → capture phase, `onDoubleClick` → `dblclick`); a non-function
 *   value removes the listener, and so does dropping the key.
 * - `className` and `class` compose into one `class` attribute with `cn`.
 * - An object `style` is serialized with `styleText`.
 * - Every other key becomes an attribute: `null`/`undefined` removes it,
 *   `false` removes it (except text booleans, which write `"false"`), and
 *   `true` writes `""` (text booleans write `"true"`). Any other value is
 *   stringified.
 *
 * @example
 * ```ts
 * const writer = new ElementPropsWriter(renderer, anchor)
 * writer.write({ target: '_blank', rel: 'noopener', onClick })
 * writer.write({ target: '_self', rel: 'noopener' }) // replaces, removes the listener
 * writer.destroy()
 * ```
 */
export class ElementPropsWriter {
  private readonly renderer: Renderer2
  private readonly element: Element
  private applied = new Map<string, unknown>()
  private readonly listeners = new Map<string, () => void>()

  /**
   * Creates a writer bound to one element.
   *
   * @param renderer - Angular's renderer, which owns the platform's DOM writes.
   * @param element - The element the props are written onto.
   */
  constructor(renderer: Renderer2, element: Element) {
    this.renderer = renderer
    this.element = element
  }

  /**
   * Applies `props` to the element, touching only the keys whose value
   * changed since the previous call (and removing the ones that went).
   *
   * A key in `skip` is left alone: the caller's own template binding or
   * router link owns it. The channel keys are controlled the same way —
   * `className`/`class` compose into `class` unless `skip` holds `class`, and
   * `style` is serialized unless `skip` holds `style` (so a component whose
   * template already binds the class and style of the same element keeps
   * them).
   *
   * @param props - The React-shaped props record to write.
   * @param skip - Keys the caller owns; they are never written and any value
   * written by an earlier call is removed.
   */
  write(props: Readonly<Record<string, unknown>>, skip?: ReadonlySet<string>): void {
    const next = new Map<string, unknown>()
    for (const [key, value] of Object.entries(props)) {
      if (skip?.has(key)) continue
      if (key === 'className' || key === 'class') continue
      if (key === 'style') {
        next.set('style', styleAttribute(value))
        continue
      }
      next.set(key, value)
    }
    if (!skip?.has('class')) {
      const classes = cn(
        typeof props.className === 'string' ? props.className : undefined,
        typeof props.class === 'string' ? props.class : undefined,
      )
      if (classes) next.set('class', classes)
    }
    // A key the caller has since taken over stays as it is, and stays tracked
    // so a later call without the skip still removes what this writer applied.
    const kept = new Map<string, unknown>()
    for (const [key, value] of this.applied) if (skip?.has(key)) kept.set(key, value)
    const keys = new Set(next.keys())
    for (const key of this.applied.keys()) if (!skip?.has(key)) keys.add(key)
    for (const key of keys) {
      const value = next.get(key)
      if (this.applied.has(key) && this.applied.get(key) === value) continue
      this.removeListener(key)
      if (isListener(key)) {
        if (typeof value === 'function') {
          const capture = key.endsWith('Capture')
          const event = key.slice(2, capture ? -7 : undefined).toLowerCase()
          this.listeners.set(
            key,
            this.renderer.listen(
              this.element,
              event === 'doubleclick' ? 'dblclick' : event,
              (browserEvent: Event) => {
                value(browserEvent)
              },
              { capture },
            ),
          )
        }
      } else if (value == null || (value === false && !TEXT_BOOLEAN.test(key))) {
        this.renderer.removeAttribute(this.element, key)
      } else {
        this.renderer.setAttribute(
          this.element,
          key,
          value === true && !TEXT_BOOLEAN.test(key) ? '' : String(value),
        )
      }
    }
    this.applied = new Map([...kept, ...next])
  }

  /**
   * Removes every listener the writer added. The caller's element may outlive
   * the props: an Angular port calls this when the element is destroyed or
   * replaced.
   */
  destroy(): void {
    for (const remove of this.listeners.values()) remove()
    this.listeners.clear()
    this.applied = new Map()
  }

  /**
   * Removes the listener registered for one key, if any.
   *
   * @param key - The prop key whose listener goes.
   */
  private removeListener(key: string): void {
    const remove = this.listeners.get(key)
    if (!remove) return
    remove()
    this.listeners.delete(key)
  }
}
