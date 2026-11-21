/**
 * Solid JSX type additions for the attributes the test mocks set as DOM
 * attributes (Solid's `attr:` namespace), which the shipped `solid-js` types
 * do not declare.
 *
 * `ExplicitAttributes` is Solid's documented augmentation point: each key
 * becomes an `attr:<key>` JSX attribute that Solid writes with
 * `setAttribute`, exactly what React's equivalent prop produces in the DOM.
 * (`@molecule/app-ui-solid` declares `value` for its own components and the
 * mock inputs mirror its `attr:value`; the declarations do not reach this
 * package's compilation, so the mocks carry their own.)
 *
 * Lives under `__tests__/` so it types only the mocks and never ships: the
 * package build excludes this directory.
 *
 * @module
 */

declare module 'solid-js/jsx-runtime' {
  namespace JSX {
    interface ExplicitAttributes {
      /** Forced attribute form of an input's `value` (React's attribute). */
      value: string | number | readonly string[]
      /** Forced attribute form of HTML's global `translate` marker. */
      translate: string
    }
  }
}

export {}
