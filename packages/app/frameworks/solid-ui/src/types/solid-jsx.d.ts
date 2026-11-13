/**
 * Solid JSX type additions for attributes this package sets as DOM
 * attributes (Solid's `attr:` namespace), which the shipped `solid-js` types
 * do not declare.
 *
 * `ExplicitAttributes` is Solid's documented augmentation point: each key
 * becomes an `attr:<key>` JSX attribute that Solid writes with
 * `setAttribute`, exactly what React's equivalent prop produces in the DOM.
 *
 * @module
 */

declare module 'solid-js/jsx-runtime' {
  namespace JSX {
    interface ExplicitAttributes {
      /** Forced attribute form of an SVG glyph's `focusable` flag. */
      focusable: string
      /** Forced attribute form of an input's `value` (React's attribute). */
      value: string | number | readonly string[]
    }
  }
}

export {}
