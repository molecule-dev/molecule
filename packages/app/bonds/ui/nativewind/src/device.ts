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
function splitVariants(cls: string): { variants: string[]; utility: string } {
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

/**
 * Whether a variant styles something a device has no equivalent for: another
 * element's state (`peer-*`, `group-*`), a pseudo-element (`before`, `after`,
 * `file`, …) or an arbitrary selector (`[&_tr]`).
 *
 * @param variant - One variant.
 * @returns Whether NativeWind cannot apply it on a device.
 */
function isDeviceOnlyUnsupportedVariant(variant: string): boolean {
  return (
    /^(?:peer|group)(?:-|$)/.test(variant) ||
    /^(?:before|after|file|marker|selection|first-letter|first-line|backdrop)$/.test(variant) ||
    variant.startsWith('[')
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
