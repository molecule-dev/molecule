/**
 * DOM plumbing the Svelte components need to reproduce React's rendered
 * markup exactly: inline styles applied through the CSSOM, and an input's
 * initial value set as the `value` attribute (React's `defaultValue`).
 *
 * @module
 */

/** An inline style map: CSS property (dash-case) → value, `undefined` to leave it off. */
export type InlineStyle = Record<string, string | number | undefined>

/** A style action: applies a map now, and again whenever the map changes. */
export interface InlineStyleAction {
  /**
   * Applies the next map, removing declarations the previous one set and this
   * one does not.
   *
   * @param next - The new declarations.
   */
  update(next: InlineStyle): void
}

/**
 * Applies an inline style map one declaration at a time through the CSSOM —
 * `element.style.setProperty`, the path React's `style` prop takes — so the
 * serialized `style` attribute is exactly the one React produces.
 *
 * Assigning the whole map as a `cssText` string instead is not equivalent:
 * engines that serialize shorthand declarations differ (jsdom's CSS parser
 * drops `background` when a later `color` follows it in the same `cssText`),
 * which would show up as a style attribute React never renders.
 *
 * @param node - The element to style.
 * @param styles - The declarations.
 * @returns The action, whose `update` re-applies a changed map.
 */
export function inlineStyle(node: HTMLElement, styles: InlineStyle): InlineStyleAction {
  /** The properties the previous map set, so a dropped one is removed. */
  let applied: string[] = []

  /**
   * Applies one map over the previous one.
   *
   * @param next - The declarations to apply.
   */
  const apply = (next: InlineStyle): void => {
    for (const property of applied) {
      if (next[property] == null) node.style.removeProperty(property)
    }
    applied = []
    for (const [property, value] of Object.entries(next)) {
      if (value == null) continue
      node.style.setProperty(property, String(value))
      applied.push(property)
    }
  }

  apply(styles)
  return { update: apply }
}

/**
 * Sets an input's initial value as the `value` ATTRIBUTE, which is what
 * React's `defaultValue` prop does. The attribute fixes the field's default
 * value and leaves the live value alone once the user types; a `value` prop
 * would instead be re-applied on every update.
 *
 * The action never re-applies the value: React's `defaultValue` only takes
 * effect when the field mounts, so it returns no `update`.
 *
 * @param node - The input element.
 * @param value - The initial value.
 */
export function defaultInputValue(node: HTMLInputElement, value: string): void {
  node.setAttribute('value', value)
}
