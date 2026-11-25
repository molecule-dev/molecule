/** A React-shaped inline style object. Custom property names retain their spelling. */
export type CSSStyle = Record<string, string | number | boolean | null | undefined>

/** Inline styles applied to one element. */
export interface InlineStyleBinding {
  /** Apply the next style object and clear declarations that dropped out. */
  update: (style: unknown) => void
  /** Clear the binding's declarations from the element. */
  destroy: () => void
}

// Match react-dom's unitless names, including its exact vendor spellings.
// react-style-text.test.ts checks this behavior against the installed renderer.
const unitless = new Set([
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
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'MozAnimationIterationCount',
  'MozBoxFlex',
  'MozBoxFlexGroup',
  'MozLineClamp',
  'msAnimationIterationCount',
  'msFlex',
  'msZoom',
  'msFlexGrow',
  'msFlexNegative',
  'msFlexOrder',
  'msFlexPositive',
  'msFlexShrink',
  'msGridColumn',
  'msGridColumnSpan',
  'msGridRow',
  'msGridRowSpan',
  'WebkitAnimationIterationCount',
  'WebkitBoxFlex',
  'WebKitBoxFlexGroup',
  'WebkitBoxOrdinalGroup',
  'WebkitColumnCount',
  'WebkitColumns',
  'WebkitFlex',
  'WebkitFlexGrow',
  'WebkitFlexPositive',
  'WebkitFlexShrink',
  'WebkitLineClamp',
])

/**
 * Converts a React property name to its CSS spelling.
 *
 * @param name - A camelCase, vendor-prefixed or custom property name.
 * @returns The CSS property name.
 */
export function toCssPropertyName(name: string): string {
  if (name.startsWith('--')) return name
  return name.replace(/[A-Z]/g, '-$&').toLowerCase().replace(/^ms-/, '-ms-')
}

/**
 * Converts the object's own entries to CSS declarations in object key order.
 *
 * @param style - A React-shaped style object.
 * @returns CSS declaration pairs, or undefined for an absent object.
 */
function declarations(style: unknown): [name: string, text: string][] | undefined {
  if (!style || typeof style !== 'object') return undefined

  const parts: [string, string][] = []
  const entries: [string, unknown][] = Object.entries(style)
  for (const [name, value] of entries) {
    if (value == null || typeof value === 'boolean' || value === '') continue
    const cssName = toCssPropertyName(name)
    const needsUnit =
      typeof value === 'number' && value !== 0 && !name.startsWith('--') && !unitless.has(name)
    parts.push([cssName, needsUnit ? `${value}px` : ('' + value).trim()])
  }
  return parts
}

/**
 * Serializes a React-shaped style object as React DOM's style attribute value.
 * The renderer escapes the value when it writes HTML.
 *
 * @param style - The style object, or an absent value.
 * @param space - An optional space after separators for existing bindings that use spaced CSS.
 * @returns The CSS declaration text, or undefined when there are no declarations.
 */
export function reactStyleText(style: unknown, space: '' | ' ' = ''): string | undefined {
  const parts = declarations(style)
  if (!parts?.length) return undefined
  return parts.map(([name, text]) => `${name}:${space}${text}`).join(`;${space}`)
}

/**
 * Normalizes a React-shaped style object for renderers that accept a CSS property map.
 *
 * @param style - The style object, or an absent value.
 * @returns CSS property names and string values, or undefined for an absent object.
 */
export function toStyleProps(style: unknown): Record<string, string> | undefined {
  const parts = declarations(style)
  return parts && Object.fromEntries(parts)
}

/**
 * Binds a React-shaped style object to an element. Changes reach the CSSOM in object key
 * order. The binding clears declarations it applied and preserves styles from other writers.
 *
 * @param node - An HTML or SVG element with inline styles.
 * @param style - The initial style object, or an absent value.
 * @returns The binding's update and cleanup hooks.
 */
export function bindInlineStyle(node: ElementCSSInlineStyle, style: unknown): InlineStyleBinding {
  const css = node.style
  interface Declaration {
    text: string
    value: string
    priority: string
  }
  let applied = new Map<string, Declaration>()

  const update = (next: unknown): void => {
    const parts = (declarations(next) ?? []).filter(([, value]) => value)
    const names = new Set(parts.map(([name]) => name))
    const external = new Set<string>()
    for (const [name, { value, priority }] of applied) {
      if (css.getPropertyValue(name) !== value || css.getPropertyPriority(name) !== priority) {
        external.add(name)
      }
    }
    for (const name of applied.keys()) {
      if (!names.has(name) && !external.has(name)) css.setProperty(name, '')
    }

    const retained = new Map<string, Declaration>()
    const written = new Map<string, string>()
    for (const [name, text] of parts) {
      const previous = applied.get(name)
      if (previous?.text === text && external.has(name)) {
        retained.set(name, previous)
        continue
      }
      const important = /\s*!\s*important$/i.exec(text)
      const value = important ? text.slice(0, important.index) : text
      const priority = important ? 'important' : ''
      const before = css.getPropertyValue(name)
      const beforePriority = css.getPropertyPriority(name)
      css.setProperty(name, value, priority)
      const after = css.getPropertyValue(name)
      const afterPriority = css.getPropertyPriority(name)
      if (
        after !== before ||
        afterPriority !== beforePriority ||
        (after === value && afterPriority === priority) ||
        (after === previous?.value && afterPriority === previous.priority)
      ) {
        written.set(name, text)
      }
    }

    for (const [name, text] of written) {
      const value = css.getPropertyValue(name)
      if (value) retained.set(name, { text, value, priority: css.getPropertyPriority(name) })
    }
    applied = retained
  }

  update(style)
  return { update, destroy: () => update(undefined) }
}
