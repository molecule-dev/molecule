/**
 * `@molecule/app-ui-nativewind/preset`: the Tailwind v3 preset a NativeWind app
 * loads so the classes this ClassMap returns mean what they mean on the web.
 *
 * ```js
 * // tailwind.config.js
 * const molecule = require('@molecule/app-ui-nativewind/preset')
 * module.exports = {
 *   content: ['./src/**\/*.{ts,tsx}', ...molecule.moleculeContent(__dirname)],
 *   presets: [require('nativewind/preset'), molecule],
 * }
 * ```
 *
 * - Every colour token of `@molecule/app-ui-tailwind`'s `base.css` exists under
 *   the web's class name (`bg-surface-container`, `text-on-primary`, …). Each is
 *   a CSS variable, so a theme bond can switch the palette at runtime:
 *   `bg-primary` → `var(--color-primary)`, `bg-primary/25` →
 *   `rgb(var(--color-primary-rgb) / 0.25)`.
 * - `:root` carries `base.css`'s light defaults, so an app with no theme bond
 *   still paints. `@molecule/app-theme-nativewind` supplies the active theme.
 * - `dark:` follows the theme bond (`darkMode: 'class'`), not only the OS.
 * - Where Tailwind v3 (NativeWind) and v4 (the web) give a class different
 *   values, this preset uses the web's.
 *
 * The token names and defaults are generated into `preset-tokens.cjs` at build
 * time from `@molecule/app-ui-tailwind`'s token table, so there is no second
 * copy to drift.
 *
 * @module
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

const { defaults, names } = require('./preset-tokens.cjs')
const fontSizes = require('./preset-font-sizes.cjs')

/** Whether Tailwind is building for a device (NativeWind sets `NATIVEWIND_OS`; unset means web). */
const native = ['ios', 'android', 'native'].includes(process.env.NATIVEWIND_OS ?? '')

/**
 * The colour a token class resolves to, with or without an opacity modifier.
 *
 * @param {string} name - The token (`primary`, `surface-container`, …).
 * @returns {(options: { opacityValue?: string }) => string} Tailwind's colour function.
 */
function tokenColor(name) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `var(--color-${name})`
      : `rgb(var(--color-${name}-rgb) / ${opacityValue})`
}

/**
 * Every theme colour token, as a Tailwind colour.
 *
 * @type {Record<string, ReturnType<typeof tokenColor>>}
 */
const colors = {}
for (const name of names) colors[name] = tokenColor(name)

/**
 * The scales Tailwind v4 (the web) renamed or revalued since v3 (NativeWind),
 * per v4's upgrade guide: `shadow-sm` became `shadow-xs` and `shadow` became
 * `shadow-sm`, the same for `rounded`, `blur` and `drop-shadow`; a bare
 * `ring` is 1px of the current colour, and a bare `border` is the current
 * colour. Values are v4's `theme.css`.
 */
const webScales = {
  borderRadius: { xs: '0.125rem', sm: '0.25rem' },
  // NativeWind's own preset gives a device stronger shadows; these are the web's.
  boxShadow: {
    '2xs': '0 1px rgb(0 0 0 / 0.05)',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    none: '0 0 #0000',
  },
  blur: { xs: '4px', sm: '8px' },
  dropShadow: {
    xs: '0 1px 1px rgb(0 0 0 / 0.05)',
    sm: '0 1px 2px rgb(0 0 0 / 0.15)',
    md: '0 3px 3px rgb(0 0 0 / 0.12)',
    lg: '0 4px 4px rgb(0 0 0 / 0.15)',
    xl: '0 9px 7px rgb(0 0 0 / 0.1)',
  },
  ringWidth: { DEFAULT: '1px' },
  ringColor: { DEFAULT: 'currentColor' },
  borderColor: { DEFAULT: 'currentColor' },
  // v4 takes any whole-number duration; the ClassMap uses this one.
  transitionDuration: { 250: '250ms' },
  // v4's sizes set a unitless line height, which a child that sets only a font size inherits as a
  // ratio; NativeWind resolves a unitless line height against each element's own font size.
  fontSize: Object.fromEntries(
    Object.entries(fontSizes).map(([name, { size, lineHeight }]) => [name, [size, { lineHeight }]]),
  ),
}

/**
 * The sans font: on a device, the one NativeWind's own preset picks for the
 * platform (a family a device does not have is an error on iOS); on the web,
 * Tailwind's.
 *
 * @returns {unknown} The font family value.
 */
function sansFont() {
  if (!native) return require('tailwindcss/defaultTheme').fontFamily.sans
  const sans = require('nativewind/preset')()?.theme?.extend?.fontFamily?.sans
  if (!sans)
    throw new Error(
      '@molecule/app-ui-nativewind/preset: nativewind/preset no longer defines fontFamily.sans',
    )
  return sans
}

/**
 * The ClassMap's type roles (`font-body`, `font-label`, `font-display`,
 * `font-headline`). On the web, `base.css` gives each the app's sans font until
 * the app names one; here each is the platform's sans font. An app that loads
 * its own fonts extends `fontFamily` in its `tailwind.config.js`.
 */
const fontRoles = { body: sansFont(), label: sansFont(), display: sansFont(), headline: sansFont() }
/** `font-inherit` (the Textarea entry) on Expo web, as base.css defines it; a device drops it. */
const webFonts = native ? {} : { inherit: 'inherit' }

/**
 * `font-document`: the font `base.css` gives the web's `html` and `body`, which every text
 * inherits there. A device has no document: native elements start their text from it
 * (`nativeRootText` in the ClassMap).
 */
const documentFont = {
  document: native ? sansFont() : 'var(--mol-font-sans, system-ui, sans-serif)',
}

/**
 * The animations the ClassMap names, as `base.css` defines them on the web.
 * A device animates opacity (Reanimated runs the frames NativeWind compiles);
 * Expo web runs the transforms too.
 */
const animations = {
  keyframes: {
    'mol-enter': {
      from: { opacity: '0', transform: 'scale(0.95)' },
      to: { opacity: '1', transform: 'scale(1)' },
    },
    'mol-exit': {
      from: { opacity: '1', transform: 'scale(1)' },
      to: { opacity: '0', transform: 'scale(0.95)' },
    },
    'mol-accordion-down': {
      from: { opacity: '0', transform: 'translateY(-0.25rem)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    'mol-accordion-up': {
      from: { opacity: '1', transform: 'translateY(0)' },
      to: { opacity: '0', transform: 'translateY(-0.25rem)' },
    },
    'mol-indeterminate-progress': {
      '0%': { opacity: '1', transform: 'translateX(-100%)' },
      '50%': { opacity: '0.5' },
      '100%': { opacity: '1', transform: 'translateX(100%)' },
    },
    'mol-shimmer': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
  },
  animation: {
    in: 'mol-enter 150ms ease-out',
    out: 'mol-exit 150ms ease-in forwards',
    'accordion-down': 'mol-accordion-down 200ms ease-out',
    'accordion-up': 'mol-accordion-up 200ms ease-in forwards',
    'indeterminate-progress': 'mol-indeterminate-progress 1.5s ease-in-out infinite',
    shimmer: 'mol-shimmer 1.5s ease-in-out infinite',
  },
}

/**
 * The installed directories of the `@molecule` packages that ship class strings,
 * wherever npm put them (the app's `node_modules`, or a workspace root's when it
 * hoists). Their `exports` have no CommonJS entry, so `require.resolve` cannot
 * find them; this walks Node's lookup directories instead.
 *
 * @param {string} [fromDir] - The app directory (default: the working directory).
 * @returns {string[]} Content globs for Tailwind.
 */
function moleculeContent(fromDir = process.cwd()) {
  const packages = [
    '@molecule/app-ui-nativewind',
    '@molecule/app-ui-tailwind',
    '@molecule/app-styling-tailwind',
  ]
  return packages.flatMap((name) => {
    let dir = path.resolve(fromDir)
    for (;;) {
      const candidate = path.join(dir, 'node_modules', name)
      if (fs.existsSync(path.join(candidate, 'package.json'))) {
        return [path.join(fs.realpathSync(candidate), 'dist/**/*.{js,cjs}')]
      }
      const parent = path.dirname(dir)
      if (parent === dir) return []
      dir = parent
    }
  })
}

module.exports = {
  // The theme bond sets the scheme; `dark:` must follow it, not only the OS.
  darkMode: 'class',
  // Tailwind v4 has no bg-opacity-*/text-opacity-* utilities. With these on,
  // v3 routes every plain colour through --tw-*-opacity, and a colour could not
  // keep its own alpha (`overlay`).
  corePlugins: {
    backgroundOpacity: false,
    textOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    ringOpacity: false,
    placeholderOpacity: false,
  },
  theme: {
    extend: {
      colors,
      ...webScales,
      ...animations,
      fontFamily: { ...fontRoles, ...documentFont, ...webFonts },
    },
  },
  plugins: [
    /**
     * Light defaults on `:root` (as `base.css` carries them on the web) and the
     * variants the ClassMap uses that v3 lacks.
     *
     * @param {{ addBase: (base: object) => void, addVariant: (name: string, definition: string) => void }} api - Tailwind's plugin API.
     */
    function moleculeBase({ addBase, addVariant }) {
      addBase({ ':root': defaults })
      // A phone is always a coarse pointer; on the web it is a media query, as in v4.
      addVariant('pointer-coarse', native ? '&' : '@media (pointer: coarse)')
    },
  ],
}

module.exports.moleculeContent = moleculeContent
