/**
 * The raw-markup action for an SVG element.
 *
 * React's `Icon` puts the bonded icon set's SVG string on the root `<svg>` with
 * `dangerouslySetInnerHTML`, i.e. `svg.innerHTML = string`. Svelte's raw-html
 * block does NOT reproduce that inside the SVG wrapper: it builds the fragment
 * in an HTML `<template>` (the SVG namespace is only known when the block sits
 * directly in a template's SVG element), so `<line/>`/`<circle/>` self-closing
 * tags nest instead of closing and the children land in the HTML namespace. A
 * separate `Markup` component has the same problem. Writing
 * `innerHTML` on the `<svg>` element itself parses in the SVG namespace, which
 * is exactly what React's prop does.
 *
 * The input comes only from the bonded icon set (`@molecule/app-icons`) — the
 * same trust boundary React's `dangerouslySetInnerHTML` call has.
 *
 * @module
 */

/**
 * Keeps an SVG element's children equal to the given trusted markup.
 *
 * @param node - The `<svg>` the action is attached to.
 * @param markup - Trusted SVG markup from the bonded icon set.
 * @returns The action's update hook for later values.
 */
export function svgMarkup(node: SVGElement, markup: string): { update: (next: string) => void } {
  /**
   * Writes one markup string as the element's children.
   *
   * @param next - The markup.
   */
  const apply = (next: string): void => {
    node.innerHTML = next
  }

  apply(markup)
  return { update: apply }
}
