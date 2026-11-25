/**
 * Divides a class string for a native element, which has no CSS cascade.
 *
 * @module
 */

import type { NativeClassSplit, NativeGridClasses } from '@molecule/app-ui'

import { descendantRule, joinClass, splitVariants, stateRule } from './device.js'
import { FONT_SIZE_VARIANTS, lineHeightClass, WEB_FONT_SIZES } from './fontSizes.js'

/** Named font-size utilities: each also sets a line height. */
const FONT_SIZE = /^text-(?:xs|sm|base|lg|[2-9]?xl)$/

/** Arbitrary font sizes (`text-[15px]`): a font size only. */
const ARBITRARY_FONT_SIZE = /^text-\[[\d.]+(?:px|rem|em)\]$/

/** The responsive breakpoints, including the base size, in cascade order. */
const BREAKPOINTS = FONT_SIZE_VARIANTS.map((variant) => variant.slice(0, -1))

/**
 * Returns the base or responsive key for a utility that needs no other variant to apply.
 * @param variants - The utility's variant prefixes.
 * @returns A breakpoint key, or `null` for state and other selectors.
 */
function breakpointOf(variants: readonly string[]): string | null {
  if (variants.length === 0) return ''
  const [variant] = variants
  return variants.length === 1 && variant !== undefined && BREAKPOINTS.includes(variant)
    ? variant
    : null
}

/** Font-weight utilities. */
const FONT_WEIGHT =
  /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/

/** The weight each named font-weight utility sets. */
const WEIGHTS: Readonly<Record<string, number>> = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
}

/**
 * The weight a font-weight utility sets.
 *
 * @param utility - A font-weight utility without its variants (`font-bold`, `font-[650]`).
 * @returns The weight.
 */
function weightOf(utility: string): number {
  const name = utility.slice('font-'.length)
  return WEIGHTS[name] ?? Number(name.slice(1, -1))
}

/** The line heights the named `leading-*` utilities set, as multiples of the font size. */
const LEADING: Readonly<Record<string, number>> = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
}

/**
 * The line height in pixels at each breakpoint that sets a font size or line height.
 * A `leading-*` class wins over a named font size's line height, and a larger breakpoint
 * retains any metrics the new classes leave unset.
 *
 * @param text - Text classes (inherited ones first).
 * @returns The base and responsive line heights.
 */
function lineHeightOf(text: readonly string[]): Readonly<Record<string, number>> {
  const metrics: Record<string, string[]> = { '': [] }
  for (const cls of text) {
    const { variants, utility } = splitVariants(cls)
    const at = breakpointOf(variants)
    if (at === null) continue
    if (
      FONT_SIZE.test(utility) ||
      ARBITRARY_FONT_SIZE.test(utility) ||
      utility.startsWith('leading-')
    ) {
      ;(metrics[at] ??= []).push(utility)
    }
  }

  let size = 16
  // The preflight on html supplies the inherited line-height when no utility sets it.
  let sizeLeading = 1.5
  let leading: { px: number } | { ratio: number } | undefined
  const heights: Record<string, number> = {}
  for (const at of BREAKPOINTS) {
    const utilities = metrics[at]
    if (!utilities) continue
    for (const utility of utilities) {
      const named = WEB_FONT_SIZES[utility.slice('text-'.length)]
      if (named && FONT_SIZE.test(utility)) {
        size = Number.parseFloat(named.size) * 16
        sizeLeading = Number(named.lineHeight)
        continue
      }
      const arbitrary = /^text-\[(\d+(?:\.\d+)?)(px|rem|em)\]$/.exec(utility)
      if (arbitrary?.[1]) {
        size = Number(arbitrary[1]) * (arbitrary[2] === 'px' ? 1 : 16)
        continue
      }
      const value = utility.slice('leading-'.length)
      const ratio = LEADING[value] ?? /^\[(\d+(?:\.\d+)?)\]$/.exec(value)?.[1]
      if (ratio !== undefined) leading = { ratio: Number(ratio) }
      else {
        const px = /^\d+(?:\.\d+)?$/.test(value)
          ? Number(value) * 4
          : Number(/^\[(\d+(?:\.\d+)?)px\]$/.exec(value)?.[1] ?? Number.NaN)
        if (!Number.isNaN(px)) leading = { px }
      }
    }
    heights[at] = leading && 'px' in leading ? leading.px : size * (leading?.ratio ?? sizeLeading)
  }
  return heights
}

/** Flex-direction utilities. */
const DIRECTION = /^flex-(?:row|col)(?:-reverse)?$/

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

/** The display each display utility sets. */
const DISPLAY: Readonly<Record<string, NativeClassSplit['display']>> = {
  block: 'block',
  inline: 'inline',
  'inline-block': 'inline-block',
  flex: 'flex',
  'inline-flex': 'inline-flex',
  grid: 'grid',
  'inline-grid': 'inline-grid',
  contents: 'contents',
  hidden: 'none',
}

/**
 * The display an absolutely positioned or fixed element computes to (CSS 2.1 §9.7): it leaves the
 * line, so an inline display becomes the block display of the same kind. An element with no
 * display class, an inline `span` by its tag, is a block too. Other displays keep their value.
 */
const BLOCKIFIED: Readonly<Record<string, NativeClassSplit['display']>> = {
  inline: 'block',
  'inline-block': 'block',
  'inline-flex': 'flex',
  'inline-grid': 'grid',
}

/** A position utility; the last one with no variant sets the position. */
const POSITION = /^(?:static|relative|absolute|fixed|sticky)$/

/**
 * The pixels a gap utility sets and the gaps it sets (`gap-4` is 16 for both, `gap-x-2` 8 between
 * columns), on Tailwind's 4px spacing scale.
 *
 * @param utility - A utility without its variants.
 * @returns The gaps and pixels, or `null` for a utility that is not a gap.
 */
function gapOf(utility: string): { axis: 'x' | 'y' | null; px: number } | null {
  const match = /^gap-(?:([xy])-)?(.+)$/.exec(utility)
  if (!match?.[2]) return null
  const axis = (match[1] as 'x' | 'y' | undefined) ?? null
  const value = match[2]
  if (value === 'px') return { axis, px: 1 }
  if (/^\d+(?:\.\d+)?$/.test(value)) return { axis, px: Number(value) * 4 }
  const arbitrary = /^\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(value)
  if (arbitrary?.[1]) return { axis, px: Number(arbitrary[1]) * (arbitrary[2] === 'rem' ? 16 : 1) }
  return null
}

/** Item alignments of a grid (`items-center`). */
const ITEMS = /^items-(start|end|center|stretch|baseline)$/

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
  grid: null,
  'inline-grid': null,
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
 * A class for descendants with one tag (`[&_p]:leading-relaxed`) goes to `descendants` instead.
 * A class that requires data attributes (`data-[state=checked]:bg-primary`) applies, without
 * those variants, only when the element's `data` match them.
 *
 * @param className - The element's classes.
 * @param inheritedText - The text classes in effect for its container's text.
 * @param data - The element's data attributes, by name without `data-`.
 * @returns The split classes.
 */
export function splitForNative(
  className: string,
  inheritedText = '',
  data?: Readonly<Record<string, string | undefined>>,
): NativeClassSplit {
  const resolved = withState(className, data)
  const key = `${resolved}\u0000${inheritedText}`
  const cached = CACHE.get(key)
  if (cached) return cached
  const split = computeSplit(resolved, inheritedText)
  if (CACHE.size >= CACHE_LIMIT) CACHE.clear()
  CACHE.set(key, split)
  return split
}

/**
 * The classes that apply to an element with these data attributes: a class whose `data-[…]`
 * variants all match, without them, and every class that requires none.
 *
 * @param className - The element's classes.
 * @param data - Its data attributes, by name without `data-`.
 * @returns The classes.
 */
function withState(
  className: string,
  data: Readonly<Record<string, string | undefined>> = {},
): string {
  if (!className.includes('data-[')) return className
  return className
    .split(/\s+/)
    .flatMap((cls) => {
      const rule = cls ? stateRule(cls) : null
      if (!rule) return cls ? [cls] : []
      const matches = rule.attributes.every(({ name, value }) =>
        value === null ? data[name] !== undefined : data[name] === value,
      )
      return matches ? [rule.cls] : []
    })
    .join(' ')
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
  // Whether the element's base position takes it out of flow (`absolute`, `fixed`).
  let outOfFlow = false
  let verticalAlign: NativeClassSplit['verticalAlign']
  let lines: number | null = null
  // A web flex container lays its items in a row unless a class says otherwise; a device's in a
  // column. Each `flex` class without a direction class is given `flex-row` at its variants.
  const flexAt: string[][] = []
  let direction = false
  const descendants: Record<string, string[]> = {}
  const columns: Record<string, number | string> = {}
  const rows: Record<string, number | string> = {}
  const columnGap: Record<string, number> = {}
  const rowGap: Record<string, number> = {}
  const alignItems: Record<string, NativeGridClasses['alignItems'][string]> = {}
  const span: Record<string, number | 'full'> = {}
  let sizedWidth = false
  let sizedHeight = false
  for (const cls of className.split(/\s+/)) {
    if (!cls) continue
    const rule = descendantRule(cls)
    if (rule) {
      ;(descendants[rule.tag] ??= []).push(rule.cls)
      continue
    }
    const { variants, utility, important } = splitVariants(cls)
    if (utility === 'align-middle') {
      if (variants.length === 0) verticalAlign = 'middle'
      continue
    }
    if (/^(?:w|size)-/.test(utility)) sizedWidth = true
    if (/^(?:h|size)-/.test(utility)) sizedHeight = true
    // A grid's columns, gaps and item alignment, and a grid item's span, at each breakpoint. A
    // device has no grid layout: the native elements lay one out from these, and the column and
    // span classes, which NativeWind cannot apply, leave the view.
    const at = breakpointOf(variants)
    if (at !== null) {
      const cols = /^grid-cols-(?:(\d+)|(none)|\[(.+)\])$/.exec(utility)
      if (cols) {
        columns[at] = cols[1] ? Number(cols[1]) : cols[2] ? 1 : (cols[3] ?? '').replace(/_/g, ' ')
        continue
      }
      const gridRows = /^grid-rows-(?:(\d+)|(none)|\[(.+)\])$/.exec(utility)
      if (gridRows) {
        rows[at] = gridRows[1]
          ? Number(gridRows[1])
          : gridRows[2]
            ? 0
            : (gridRows[3] ?? '').replace(/_/g, ' ')
        continue
      }
      const spans = /^col-span-(\d+|full)$/.exec(utility)
      if (spans?.[1]) {
        span[at] = spans[1] === 'full' ? 'full' : Number(spans[1])
        continue
      }
      const gap = gapOf(utility)
      if (gap) {
        if (gap.axis !== 'y') columnGap[at] = gap.px
        if (gap.axis !== 'x') rowGap[at] = gap.px
      }
      const items = ITEMS.exec(utility)?.[1] as NativeGridClasses['alignItems'][string] | undefined
      if (items) alignItems[at] = items
    }
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
    if (variants.length === 0 && POSITION.test(utility))
      outOfFlow = utility === 'absolute' || utility === 'fixed'
    if (utility === 'flex' || utility === 'inline-flex') flexAt.push(variants)
    if (DIRECTION.test(utility)) direction = true
    const flow = FLOW_ONLY[utility]
    if (flow === undefined) view.push(cls)
    else if (flow !== null) view.push(joinClass(variants, flow, important))
  }
  const inherited = inheritedText.split(/\s+/).flatMap((cls): string[] => {
    if (!cls) return []
    const { variants, utility, important } = splitVariants(cls)
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
    return leading ? [joinClass(variants, leading, important)] : [cls]
  })
  if (!direction) for (const variants of flexAt) view.push([...variants, 'flex-row'].join(':'))
  if (outOfFlow) display = display === null ? 'block' : (BLOCKIFIED[display] ?? display)
  const text = [...inherited, ...own]
  let weight: number | null = null
  for (const cls of text) {
    const { variants, utility } = splitVariants(cls)
    if (variants.length === 0 && FONT_WEIGHT.test(utility)) weight = weightOf(utility)
  }
  const tags = Object.keys(descendants)
  return {
    view: view.join(' '),
    text: text.join(' '),
    display,
    lines,
    weight,
    lineHeight: lineHeightOf(text),
    ...(verticalAlign ? { verticalAlign } : {}),
    descendants:
      tags.length === 0
        ? NO_DESCENDANTS
        : Object.fromEntries(tags.map((tag) => [tag, (descendants[tag] ?? []).join(' ')])),
    grid:
      display === 'grid' || display === 'inline-grid'
        ? { columns, rows, columnGap, rowGap, alignItems }
        : null,
    span: Object.keys(span).length === 0 ? NO_SPAN : span,
    sized: { width: sizedWidth, height: sizedHeight },
  }
}

/** The span of an element that is no grid item with a span class. */
const NO_SPAN: Readonly<Record<string, number | 'full'>> = Object.freeze({})

/** The descendant classes of an element that gives its descendants none. */
const NO_DESCENDANTS: Readonly<Record<string, string>> = Object.freeze({})
