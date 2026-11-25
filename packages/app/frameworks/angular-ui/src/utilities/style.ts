/**
 * React-style inline styles for Angular bindings.
 *
 * @module
 */

import { bindInlineStyle, reactStyleText, toStyleProps } from '@molecule/app-inline-style-dom'

export {
  toCssPropertyName as kebab,
  reactStyleText,
  toStyleProps,
} from '@molecule/app-inline-style-dom'

/** Scratch elements and their cached CSS shorthand expansions, per document. */
const probes = new WeakMap<Document, { node: HTMLElement; longhands: Map<string, string[]> }>()

/**
 * The declaration names after applying a property to an empty CSSOM style.
 *
 * @param probe - The scratch element and its cache.
 * @param name - The CSS property name.
 * @param value - The declaration's value.
 * @returns The names the declaration sets.
 */
function longhandsOf(
  probe: { node: HTMLElement; longhands: Map<string, string[]> },
  name: string,
  value: string,
): string[] {
  const known = probe.longhands.get(name)
  if (known) return known

  const { style } = probe.node
  style.cssText = ''
  bindInlineStyle(probe.node, { [name]: value })
  const names = Array.from({ length: style.length }, (_, index) => style.item(index))
  if (names.length) probe.longhands.set(name, names)
  return names.length ? names : [name]
}

/**
 * Angular sorts `[style]` declarations by name. Resolve shorthands and longhands that
 * the sort would reorder, so Angular applies them with the precedence of the original object.
 *
 * @param props - CSS property names and values, in object order.
 * @returns The resolved CSS text when the sort would reorder an overlap.
 */
function resolveStyleOrder(props: Record<string, string>): string | undefined {
  const parts = Object.entries(props)
  if (parts.length < 2 || typeof document === 'undefined') return undefined

  let probe = probes.get(document)
  if (!probe) {
    probe = { node: document.createElement('div'), longhands: new Map() }
    probes.set(document, probe)
  }
  const seen = new Map<string, string>()
  for (const [name, value] of parts) {
    if (name.startsWith('--')) continue
    for (const longhand of longhandsOf(probe, name, value)) {
      const earlier = seen.get(longhand)
      if (earlier !== undefined && earlier > name) {
        probe.node.style.cssText = ''
        bindInlineStyle(probe.node, props)
        return probe.node.style.cssText.replace(/;\s*$/, '') || undefined
      }
      seen.set(longhand, name)
    }
  }
  return undefined
}

/**
 * Serializes a React-shaped style object for Angular's `[style]` binding.
 * Resolves overlapping properties that Angular would apply out of order.
 *
 * @param style - The style object, or an absent value.
 * @returns CSS declaration text, or null when there are no declarations.
 */
export function styleText(style: Record<string, unknown> | undefined | null): string | null {
  const props = toStyleProps(style)
  return (props && resolveStyleOrder(props)) ?? reactStyleText(style, ' ') ?? null
}
