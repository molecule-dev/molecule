/**
 * The web's default colour palette (`gray-400`, `red-500`, …) for a device. Tailwind v4 (the web)
 * defines it in OKLCH with values revised since v3 (NativeWind), so a device would paint
 * `text-gray-400` a different grey; the preset builds the palette from v4's `theme.css` instead.
 *
 * @module
 */

/**
 * An OKLCH colour as the sRGB hex colour a browser paints it on an sRGB screen (each channel
 * clipped to the gamut).
 *
 * @param lightness - Lightness, 0 to 1.
 * @param chroma - Chroma.
 * @param hue - Hue, in degrees.
 * @returns The colour, `#rrggbb`.
 */
export function oklchToHex(lightness: number, chroma: number, hue: number): string {
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return `#${linear
    .map((value) => {
      const encoded = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055
      return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
        .toString(16)
        .padStart(2, '0')
    })
    .join('')}`
}

/** A palette colour of v4's `theme.css` (`--color-gray-400: oklch(70.7% 0.022 261.325);`). */
const SHADE = /--color-([a-z]+)-(\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g

/** A plain colour of v4's `theme.css` (`--color-black: #000;`). */
const PLAIN = /--color-([a-z]+):\s*(#[0-9a-f]{3,8});/g

/**
 * The default palette of Tailwind v4's `theme.css`, as Tailwind v3 colours: each shade as the sRGB
 * hex colour a browser paints, and the plain colours (`black`, `white`) as written.
 *
 * @param themeCss - The text of v4's `theme.css`.
 * @returns The palette (`{ gray: { '400': '#99a1af', … }, black: '#000', … }`).
 */
export function webPalette(themeCss: string): Record<string, string | Record<string, string>> {
  const palette: Record<string, string | Record<string, string>> = {}
  for (const [, name, shade, l, c, h] of themeCss.matchAll(SHADE)) {
    if (!name || !shade) continue
    let shades = palette[name]
    if (typeof shades !== 'object') {
      shades = {}
      palette[name] = shades
    }
    shades[shade] = oklchToHex(Number(l) / 100, Number(c), Number(h))
  }
  for (const [, name, value] of themeCss.matchAll(PLAIN)) if (name && value) palette[name] = value
  return palette
}
