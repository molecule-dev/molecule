/**
 * React types of the renderer-neutral elements' children and refs, the same as the web kit's
 * (`@molecule/app-ui-react/elements`), so a feature compiled against the web declarations is
 * type-correct here.
 *
 * @module
 */

import type { ReactElement, ReactNode, Ref } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

/**
 * What an element holds: anything React renders. A native container puts bare text in a `Text`,
 * as the web puts it in an anonymous box, with the text classes the container hands down.
 */
export type ElementNode = ReactNode

/**
 * What an `Svg` or `G` holds: shapes, groups and `SvgText`. A string is not accepted, because
 * an SVG draws text only inside a text element.
 */
export type ShapeNode = ReactElement | null | undefined | false | readonly ShapeNode[]

/** The `ref` every element takes: the host view on native. */
export interface ElementRefProps {
  /** Receives the rendered host view (see {@link ElementHandle}). */
  ref?: Ref<ElementHandle>
}
