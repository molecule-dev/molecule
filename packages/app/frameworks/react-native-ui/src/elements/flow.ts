/**
 * How components flow in a line, for the native layout of inline content.
 *
 * @module
 */

import type { InlineKind } from '@molecule/app-ui'

/** How each registered component flows, by its props. */
const INLINE = new Map<unknown, (props: Record<string, unknown>) => InlineKind>()
const CONTENTS = new Map<unknown, (props: Record<string, unknown>) => boolean>()

/** Registers a provider that can share its parent's layout using display contents. */
export function registerContents(
  component: unknown,
  hasContents: (props: Record<string, unknown>) => boolean,
): void {
  CONTENTS.set(component, hasContents)
}

/** Whether the element's children take part directly in its parent's layout. */
export function displaysContents(component: unknown, props: Record<string, unknown>): boolean {
  return CONTENTS.get(component)?.(props) ?? false
}

/**
 * Registers how a component flows inside a container that is not a flex container: as inline
 * text (it renders a `Text` that joins the line), as an inline box (it sits in the line beside
 * text), or as a block. Every element registers itself; a component that renders an inline
 * element at its root (a button, a badge, an icon) registers too, or it is laid out as a block.
 *
 * @param component - The component.
 * @param kind - Its kind for given props.
 */
export function registerInline(
  component: unknown,
  kind: (props: Record<string, unknown>) => InlineKind,
): void {
  INLINE.set(component, kind)
}

/**
 * How a registered component flows with the given props.
 *
 * @param component - The component.
 * @param props - Its props.
 * @returns Its kind, or `undefined` when it never registered.
 */
export function registeredKind(
  component: unknown,
  props: Record<string, unknown>,
): InlineKind | undefined {
  return INLINE.get(component)?.(props)
}

/**
 * Whether a component registered how it flows.
 *
 * @param component - The component.
 * @returns Whether it did.
 */
export function isRegistered(component: unknown): boolean {
  return INLINE.has(component) || CONTENTS.has(component)
}
