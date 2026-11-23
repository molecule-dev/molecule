/**
 * React-style inline style serialization for Angular host bindings.
 *
 * @module
 */

/**
 * CSS properties that take a raw number in React (no `px` suffix).
 * Mirrors React's `isUnitlessNumber` list.
 */
const UNITLESS = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'MozAnimationIterationCount',
  'MozBoxFlex',
  'MozLineClamp',
  'msGridRow',
  'msGridRowSpan',
  'msGridColumn',
  'msGridColumnSpan',
  'WebkitAnimationIterationCount',
  'WebkitBoxFlex',
  'WebkitLineClamp',
])

/**
 * Converts a camelCase CSS property name to kebab-case.
 *
 * @param key - The camelCase property name.
 * @returns The kebab-case CSS property name.
 */
export const kebab = (key: string): string =>
  key.startsWith('--') ? key : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

/** The longhands each property name sets, read from the CSSOM once per name. */
const longhandCache = new Map<string, readonly string[]>()

/** One scratch declaration block per document, reused by every call. */
const probes = new WeakMap<Document, CSSStyleDeclaration>()

/**
 * The longhand properties a declaration sets: itself for a longhand, every one it expands to for
 * a shorthand (`gap` → `row-gap`, `column-gap`).
 *
 * @param probe - A scratch declaration block.
 * @param name - The kebab-case property name.
 * @param value - Its value (a name the CSSOM rejects with it is read again with the next value).
 * @returns The longhand names.
 */
const longhandsOf = (
  probe: CSSStyleDeclaration,
  name: string,
  value: string,
): readonly string[] => {
  const known = longhandCache.get(name)
  if (known) return known
  probe.cssText = ''
  probe.setProperty(name, value)
  const names = Array.from({ length: probe.length }, (_, i) => probe.item(i))
  if (names.length) longhandCache.set(name, names)
  return names.length ? names : [name]
}

/**
 * The declarations as the DOM resolves them in this order, when a shorthand and a longhand it
 * covers both appear and their names sort the other way round: Angular's `[style]` binding keeps
 * its declarations sorted by property name, so `gap: 9px; column-gap: 3px` would reach the
 * element as `column-gap` then `gap`, and `gap` would erase the column gap a browser (and React,
 * which writes in object order) keeps. Resolved through the CSSOM, the text holds each longhand
 * once and any order applies it the same way. Null when nothing overlaps, or with no DOM.
 *
 * @param parts - `[name, value]` pairs in object order.
 * @returns The resolved declaration text, or null.
 */
const resolvedOverlaps = (parts: [string, string][]): string | null => {
  if (parts.length < 2 || typeof document === 'undefined') return null
  let probe = probes.get(document)
  if (!probe) {
    probe = document.createElement('div').style
    probes.set(document, probe)
  }
  const seen = new Map<string, string>()
  let inverted = false
  for (const [name, value] of parts) {
    if (name.startsWith('--')) continue
    for (const longhand of longhandsOf(probe, name, value)) {
      const earlier = seen.get(longhand)
      if (earlier !== undefined && earlier !== name && earlier > name) inverted = true
      seen.set(longhand, name)
    }
  }
  if (!inverted) return null
  probe.cssText = ''
  for (const [name, value] of parts) probe.setProperty(name, value)
  return probe.cssText.replace(/;\s*$/, '') || null
}

/**
 * Serializes a React-style style object the way React writes it to the DOM:
 * camelCase keys become kebab-case, numbers gain `px` unless the property is
 * unitless, and declaration order follows object key order (the conformance
 * normalizer sorts declarations anyway). A shorthand and a longhand it covers
 * that Angular's sorted style binding would apply out of order come back
 * resolved, as the CSSOM applies them in object order.
 *
 * @param style - The style object (or undefined).
 * @returns The `style` attribute text, or null when there is nothing to set.
 */
export function styleText(style: Record<string, unknown> | undefined | null): string | null {
  if (!style) return null
  const parts: [string, string][] = []
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === false) continue
    const text =
      typeof value === 'number' ? (UNITLESS.has(key) ? String(value) : `${value}px`) : String(value)
    parts.push([kebab(key), text])
  }
  if (!parts.length) return null
  return resolvedOverlaps(parts) ?? parts.map(([name, text]) => `${name}: ${text}`).join('; ')
}
