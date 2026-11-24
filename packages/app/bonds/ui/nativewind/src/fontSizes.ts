/**
 * The web's font-size scale.
 *
 * @module
 */

/** A font size and the line height it sets. */
export interface WebFontSize {
  /** The font size. */
  readonly size: string
  /** The unitless line height, which CSS inherits as a ratio of each element's own font size. */
  readonly lineHeight: string
}

/**
 * The font sizes of Tailwind 4's theme (the web ClassMap's), with their unitless line heights:
 * the device preset uses them, so `text-sm` draws the same box on both, and a child that sets only
 * a font size (`text-[15px]`) takes the inherited ratio as it does on the web.
 */
export const WEB_FONT_SIZES: Readonly<Record<string, WebFontSize>> = {
  xs: { size: '0.75rem', lineHeight: String(1 / 0.75) },
  sm: { size: '0.875rem', lineHeight: String(1.25 / 0.875) },
  base: { size: '1rem', lineHeight: String(1.5 / 1) },
  lg: { size: '1.125rem', lineHeight: String(1.75 / 1.125) },
  xl: { size: '1.25rem', lineHeight: String(1.75 / 1.25) },
  '2xl': { size: '1.5rem', lineHeight: String(2 / 1.5) },
  '3xl': { size: '1.875rem', lineHeight: String(2.25 / 1.875) },
  '4xl': { size: '2.25rem', lineHeight: String(2.5 / 2.25) },
  '5xl': { size: '3rem', lineHeight: '1' },
  '6xl': { size: '3.75rem', lineHeight: '1' },
  '7xl': { size: '4.5rem', lineHeight: '1' },
  '8xl': { size: '6rem', lineHeight: '1' },
  '9xl': { size: '8rem', lineHeight: '1' },
}

/** The responsive variants a device applies to a font size (none is the base class). */
export const FONT_SIZE_VARIANTS: readonly string[] = ['', 'sm:', 'md:', 'lg:', 'xl:', '2xl:']

/**
 * The class that sets only a font size's line height, for an element that inherits the size but
 * sets its own font size (Tailwind 3 sorts `text-[15px]` before `text-base`, so the inherited class
 * would win the font size).
 *
 * @param name - The size name (`sm`).
 * @returns The class (`leading-[1.4285714285714286]`), or `null` for a name not in the scale.
 */
export function lineHeightClass(name: string): string | null {
  const size = WEB_FONT_SIZES[name]
  return size ? `leading-[${size.lineHeight}]` : null
}
