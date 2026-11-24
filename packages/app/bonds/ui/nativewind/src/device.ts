/**
 * Adapts the web ClassMap's class strings to what NativeWind can apply on a
 * device, so every class this ClassMap returns has an effect on iOS and Android.
 *
 * @module
 */

/**
 * Splits a class into its variants and its utility (`sm:hover:bg-x` →
 * `['sm', 'hover']`, `bg-x`), keeping `:` inside brackets.
 *
 * @param cls - One class.
 * @returns The variants and the utility.
 */
export function splitVariants(cls: string): { variants: string[]; utility: string } {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < cls.length; i++) {
    const char = cls[i]
    if (char === '[' || char === '(') depth++
    else if (char === ']' || char === ')') depth--
    else if (char === ':' && depth === 0) {
      parts.push(cls.slice(start, i))
      start = i + 1
    }
  }
  return { variants: parts, utility: cls.slice(start) }
}

/** A variant that styles the element's descendants with one tag (`[&_p]`), capturing the tag. */
const DESCENDANT = /^\[&_([a-z][a-z0-9]*)\]$/

/**
 * The descendant rule a class is (`[&_p]:leading-relaxed`, `dark:[&_p]:text-x`): the tag it
 * styles and the class those descendants apply (`leading-relaxed`, `dark:text-x`).
 *
 * @param cls - One class.
 * @returns The tag and class, or `null` when the class styles the element itself.
 */
export function descendantRule(cls: string): { tag: string; cls: string } | null {
  const { variants, utility } = splitVariants(cls)
  const at = variants.findIndex((variant) => DESCENDANT.test(variant))
  if (at === -1) return null
  const tag = DESCENDANT.exec(variants[at] ?? '')?.[1]
  if (!tag) return null
  return { tag, cls: [...variants.slice(0, at), ...variants.slice(at + 1), utility].join(':') }
}

/** A variant that matches one of the element's own data attributes (`data-[state=open]`, `data-[disabled]`). */
const DATA_ATTRIBUTE = /^data-\[([a-z][a-z0-9-]*)(?:=([^\]]*))?\]$/

/**
 * The data attributes a class's variants require of its element (`data-[state=checked]:bg-x`
 * requires `data-state="checked"`; `data-[disabled]:` only that `data-disabled` is present) and
 * the class without those variants, which a native element applies when its own attributes match,
 * as the attribute selector does on the web.
 *
 * @param cls - One class.
 * @returns The required attributes (a `null` value: present with any value) and the class, or
 *   `null` when the class requires none.
 */
export function stateRule(
  cls: string,
): { attributes: ReadonlyArray<{ name: string; value: string | null }>; cls: string } | null {
  const { variants, utility } = splitVariants(cls)
  const attributes: { name: string; value: string | null }[] = []
  const rest: string[] = []
  for (const variant of variants) {
    const match = DATA_ATTRIBUTE.exec(variant)
    if (match?.[1]) attributes.push({ name: match[1], value: match[2] ?? null })
    else rest.push(variant)
  }
  if (attributes.length === 0) return null
  return { attributes, cls: [...rest, utility].join(':') }
}

/**
 * Whether a variant styles something a device has no equivalent for: another
 * element's state (`peer-*`, `group-*`), a pseudo-element (`before`, `after`,
 * `file`, …) or an arbitrary selector (`[&>svg]`, `[&_tr:last-child]`) other than a
 * descendant with one tag (`[&_p]`), which the native elements apply ({@link descendantRule}).
 *
 * @param variant - One variant.
 * @returns Whether NativeWind cannot apply it on a device.
 */
function isDeviceOnlyUnsupportedVariant(variant: string): boolean {
  return (
    /^(?:peer|group)(?:-|$)/.test(variant) ||
    /^(?:before|after|file|marker|selection|first-letter|first-line|backdrop)$/.test(variant) ||
    (variant.startsWith('[') && !DESCENDANT.test(variant))
  )
}

/** A border width utility (`border`, `border-b`, `border-2`, `border-x-4`, `border-[2px]`). */
const BORDER_WIDTH = /^border(?:-[trblxyse])?(?:-\d+|-\[[\d.]+(?:px|rem|em)\])?$/

/** A border style utility, which is neither a width nor a colour. */
const BORDER_STYLE = /^border-(?:solid|dashed|dotted|double|hidden|none)$/

/**
 * Rewrites one class string for a device.
 *
 * - Sibling spacing (`space-x-*`, `space-y-*`) selects `> * + *`; it becomes
 *   `gap-x-*` / `gap-y-*` (every React Native view is a flex container).
 * - Dividers (`divide-*`), marker classes (`group`, `peer`), `font-inherit`, the variants in
 *   {@link isDeviceOnlyUnsupportedVariant}, and the web enter/exit amounts
 *   (`fade-in-0`, `zoom-out-95`, `slide-in-from-top-full`: CSS variables a
 *   device animation cannot read) are dropped. `animate-in` / `animate-out` stay
 *   and run the preset's fade.
 * - A border with no colour class is the web's `currentColor`; React Native
 *   draws it black (invisible on a dark theme), so it gets `border-foreground`,
 *   the colour of the text it would take on the web.
 *
 * @param classes - A class string from the web ClassMap.
 * @returns The class string for a device.
 */
export function forDevice(classes: string): string {
  const out: string[] = []
  let hasBorderWidth = false
  let hasBorderColor = false
  for (const cls of classes.split(/\s+/)) {
    if (!cls) continue
    const { variants, utility } = splitVariants(cls)
    if (variants.some(isDeviceOnlyUnsupportedVariant)) continue
    if (utility === 'group' || utility === 'peer') continue
    // A device does not cascade fonts into a text input: there is nothing to inherit.
    if (utility === 'font-inherit') continue
    if (/^divide-/.test(utility)) continue
    if (/^(?:fade|zoom)-(?:in|out)-/.test(utility) || /^slide-(?:in|out)-/.test(utility)) continue
    const space = /^(-?)space-([xy])-(.+)$/.exec(utility)
    if (space) {
      if (space[1] || space[3] === 'reverse') continue
      out.push([...variants, `gap-${space[2]}-${space[3]}`].join(':'))
      continue
    }
    if (utility.startsWith('border')) {
      if (BORDER_WIDTH.test(utility)) {
        if (variants.length === 0 && !/-0$/.test(utility)) hasBorderWidth = true
      } else if (variants.length === 0 && !BORDER_STYLE.test(utility)) hasBorderColor = true
    }
    out.push(cls)
  }
  if (hasBorderWidth && !hasBorderColor) out.push('border-foreground')
  return out.join(' ')
}
