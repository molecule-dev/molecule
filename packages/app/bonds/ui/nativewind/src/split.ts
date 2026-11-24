/**
 * Divides a class string for a native element, which has no CSS cascade.
 *
 * @module
 */

import type { NativeClassSplit } from '@molecule/app-ui'

import { splitVariants } from './device.js'
import { lineHeightClass } from './fontSizes.js'

/** Named font-size utilities: each also sets a line height. */
const FONT_SIZE = /^text-(?:xs|sm|base|lg|[2-9]?xl)$/

/** Arbitrary font sizes (`text-[15px]`): a font size only. */
const ARBITRARY_FONT_SIZE = /^text-\[[\d.]+(?:px|rem|em)\]$/

/** Font-weight utilities. */
const FONT_WEIGHT =
  /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/

/**
 * The inherited CSS properties a text utility sets, or `null` for a utility that is not a text
 * utility.
 *
 * @param utility - A utility without its variants.
 * @returns The property names.
 */
function textProperties(utility: string): readonly string[] | null {
  if (FONT_SIZE.test(utility)) return ['font-size', 'line-height']
  if (ARBITRARY_FONT_SIZE.test(utility)) return ['font-size']
  if (/^text-(?:left|center|right|justify|start|end)$/.test(utility)) return ['text-align']
  if (/^text-(?:ellipsis|clip)$/.test(utility)) return ['text-overflow']
  if (/^text-(?:wrap|nowrap|balance|pretty)$/.test(utility)) return ['text-wrap']
  if (utility.startsWith('text-')) return ['color']
  if (FONT_WEIGHT.test(utility)) return ['font-weight']
  if (utility.startsWith('font-')) return ['font-family']
  if (utility.startsWith('leading-')) return ['line-height']
  if (utility.startsWith('tracking-')) return ['letter-spacing']
  if (utility.startsWith('indent-')) return ['text-indent']
  if (utility.startsWith('whitespace-')) return ['white-space']
  if (utility.startsWith('underline-offset-')) return ['text-underline-offset']
  if (/^decoration-(?:solid|double|dotted|dashed|wavy)$/.test(utility))
    return ['text-decoration-style']
  if (/^decoration-(?:\d+|auto|from-font)$/.test(utility)) return ['text-decoration-thickness']
  if (utility.startsWith('decoration-')) return ['text-decoration-color']
  if (utility === 'italic' || utility === 'not-italic') return ['font-style']
  if (/^(?:uppercase|lowercase|capitalize|normal-case)$/.test(utility)) return ['text-transform']
  if (/^(?:underline|overline|line-through|no-underline)$/.test(utility))
    return ['text-decoration-line']
  if (/^break-(?:normal|words|all|keep)$/.test(utility)) return ['word-break']
  if (utility === 'antialiased' || utility === 'subpixel-antialiased') return ['font-smoothing']
  return null
}

/** The display each display utility sets (`grid` becomes flex on a device). */
const DISPLAY: Readonly<Record<string, NativeClassSplit['display']>> = {
  block: 'block',
  inline: 'inline',
  'inline-block': 'inline-block',
  flex: 'flex',
  'inline-flex': 'inline-flex',
  grid: 'flex',
  'inline-grid': 'inline-flex',
  hidden: 'none',
}

/**
 * Display utilities a native view has no equivalent for: they say how the element flows among
 * its siblings, which the native elements lay out themselves, so they leave the view's classes.
 * `inline-flex` and `inline-grid` still make a flex container: the view keeps `flex`.
 */
const FLOW_ONLY: Readonly<Record<string, string | null>> = {
  block: null,
  inline: null,
  'inline-block': null,
  'flow-root': null,
  contents: null,
  'inline-flex': 'flex',
  'inline-grid': 'flex',
}

/** Splits already made, by class string and inherited text (an app renders a bounded set). */
const CACHE = new Map<string, NativeClassSplit>()

/** The most splits {@link CACHE} keeps before it starts over. */
const CACHE_LIMIT = 4096

/**
 * The key of each property a text class sets: its variants plus the property, so `dark:text-x`
 * overrides only `dark:` colours.
 *
 * @param variants - The class's variants.
 * @param properties - The properties it sets.
 * @returns The keys.
 */
const keys = (variants: readonly string[], properties: readonly string[]): string[] =>
  properties.map((property) => [...variants, property].join(':'))

/**
 * Splits a device class string into the classes a native view applies and the text classes in
 * effect for its text, and reads the display its base classes set (the last display class wins).
 *
 * An inherited text class stays unless the element's own text classes set every property it
 * sets, as in CSS: a child's `text-primary` replaces an inherited `text-foreground`, and a
 * child's `leading-6` keeps an inherited `text-sm` (its font size) while overriding its line
 * height, because `leading-*` comes after `text-*` in the stylesheet on the web and on a device.
 *
 * @param className - The element's classes.
 * @param inheritedText - The text classes in effect for its container's text.
 * @returns The split classes.
 */
export function splitForNative(className: string, inheritedText = ''): NativeClassSplit {
  const key = `${className}\u0000${inheritedText}`
  const cached = CACHE.get(key)
  if (cached) return cached
  const split = computeSplit(className, inheritedText)
  if (CACHE.size >= CACHE_LIMIT) CACHE.clear()
  CACHE.set(key, split)
  return split
}

/**
 * {@link splitForNative} without the cache.
 *
 * @param className - The element's classes.
 * @param inheritedText - The text classes in effect for its container's text.
 * @returns The split classes.
 */
function computeSplit(className: string, inheritedText: string): NativeClassSplit {
  const view: string[] = []
  const own: string[] = []
  const ownKeys = new Set<string>()
  let display: NativeClassSplit['display'] = null
  let lines: number | null = null
  for (const cls of className.split(/\s+/)) {
    if (!cls) continue
    const { variants, utility } = splitVariants(cls)
    if (variants.length === 0 && (utility === 'truncate' || /^line-clamp-\d+$/.test(utility))) {
      lines = utility === 'truncate' ? 1 : Number(utility.slice('line-clamp-'.length))
      continue
    }
    if (variants.length === 0 && utility === 'line-clamp-none') {
      lines = null
      continue
    }
    const properties = textProperties(utility)
    if (properties) {
      own.push(cls)
      for (const key of keys(variants, properties)) ownKeys.add(key)
      continue
    }
    if (variants.length === 0 && utility in DISPLAY) display = DISPLAY[utility] ?? null
    const flow = FLOW_ONLY[utility]
    if (flow === undefined) view.push(cls)
    else if (flow !== null) view.push([...variants, flow].join(':'))
  }
  const inherited = inheritedText.split(/\s+/).flatMap((cls): string[] => {
    if (!cls) return []
    const { variants, utility } = splitVariants(cls)
    const properties = textProperties(utility) ?? []
    const overridden = keys(variants, properties).map((key) => ownKeys.has(key))
    if (overridden.every(Boolean)) return []
    if (!overridden.some(Boolean)) return [cls]
    // A named size whose font size the element sets keeps only its line height (a ratio): Tailwind 3
    // sorts `text-[15px]` before `text-base`, so the whole class would win the font size. A size
    // whose line height the element sets stays whole: `leading-*` comes after `text-*`.
    const fontSizeSet = ownKeys.has([...variants, 'font-size'].join(':'))
    const leading =
      FONT_SIZE.test(utility) && fontSizeSet ? lineHeightClass(utility.slice('text-'.length)) : null
    return leading ? [[...variants, leading].join(':')] : [cls]
  })
  return { view: view.join(' '), text: [...inherited, ...own].join(' '), display, lines }
}
