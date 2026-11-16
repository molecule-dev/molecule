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
 * The first move happens at view init; a caller whose rest attributes follow
 * state (an accessible label that switches with the locale) re-moves the
 * re-bound ones with {@link reapplyRestAttributes}.
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

/** Options for {@link reapplyRestAttributes}. */
export interface ReapplyRestAttributesOptions {
  /**
   * Move `aria-describedby` too. The default keeps it on the host: a
   * component that MERGES the host's `aria-describedby` with its own target
   * (the input/select/textarea family, see below) has already applied it on
   * an inner binding, and re-moving the re-bound value would erase that
   * merge. A component that spreads `aria-describedby` straight onto its
   * `...rest` target (Modal) has no merge to protect, so it opts in.
   */
  includeDescribedBy?: boolean
}

/**
 * Moves the rest attributes a caller RE-BOUND since the last move.
 *
 * Angular writes a changed `[attr.x]` binding back onto the host after
 * {@link moveRestAttributes} took its first value off it, so without this the
 * inner element keeps the first label forever while the host accumulates the
 * new one. `aria-describedby` is left alone by default: the input family
 * captured the host's value once and merges it with the field context's own
 * target on its inner binding, so re-moving a re-bound value would erase that
 * merge. A component that spreads the attribute onto `...rest` with no merge
 * (Modal) passes {@link ReapplyRestAttributesOptions.includeDescribedBy}.
 *
 * Idempotent: a host with nothing re-bound moves nothing.
 *
 * @param host - The component host element.
 * @param target - The element React's `...rest` targets.
 * @param options - Whether to move `aria-describedby` too.
 * @returns The moved attribute names.
 */
export function reapplyRestAttributes(
  host: Element,
  target: Element | undefined | null,
  options: ReapplyRestAttributesOptions = {},
): string[] {
  if (!target) return []
  const moved: string[] = []
  for (const attr of Array.from(host.attributes)) {
    const name = attr.name
    if (KEEP.test(name) || isNgAttr(name) || name.startsWith('mol-')) continue
    if (name === 'aria-describedby' && !options.includeDescribedBy) continue
    target.setAttribute(name, attr.value)
    host.removeAttribute(name)
    moved.push(name)
  }
  return moved
}
