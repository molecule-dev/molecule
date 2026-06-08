/**
 * Restores the global `JSX` namespace that React 19 / @types/react 19 removed
 * (it now lives at `React.JSX`). Components in this package annotate return
 * types as `JSX.Element`; this shim maps the global namespace onto React's so
 * those references resolve without editing every file. Type-only; erased at
 * build time.
 */
import type * as React from 'react'

declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType
    type Element = React.JSX.Element
    type ElementClass = React.JSX.ElementClass
    interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

export {}
