/**
 * React types of the renderer-neutral elements' children and refs.
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

/** The `ref` every element takes: the element itself on the web, the host view on native. */
export interface ElementRefProps {
  /** Receives the rendered element (see {@link ElementHandle}). */
  ref?: Ref<ElementHandle>
}
