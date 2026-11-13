/**
 * Rest-attribute handling for components whose React root is a fragment or
 * portal (element-selector host): React spreads `...rest` (`aria-*`,
 * `data-*`, `id`, …) onto a specific inner element, while the conformance
 * adapter binds them onto the Angular host. These helpers move them.
 *
 * @module
 */

/** Host attributes that never move (framework + component host markers). */
const KEEP = /^(class|style|data-parity-)/

const isNgAttr = (name: string): boolean => name.startsWith('ng-') || name.startsWith('_ng')

/**
 * Moves every rest attribute (`aria-*`, `data-*`, `id`, …) from the host
 * element onto the element React spreads `{...rest}` onto.
 *
 * Adapter bindings write each attribute once (case props are static), so a
 * move at first view init is stable.
 *
 * @param host - The component host element.
 * @param target - The element React's `...rest` targets.
 * @returns The moved attribute names.
 */
export function moveRestAttributes(host: Element, target: Element | undefined | null): string[] {
  if (!target) return []
  const moved: string[] = []
  for (const attr of Array.from(host.attributes)) {
    const name = attr.name
    if (KEEP.test(name) || isNgAttr(name) || name.startsWith('mol-')) continue
    target.setAttribute(name, attr.value)
    host.removeAttribute(name)
    moved.push(name)
  }
  return moved
}
