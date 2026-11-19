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

/** Options for {@link reapplyRestAttributes}. */ export interface ReapplyRestAttributesOptions {
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

/**
 * Reads and removes a caller's `data-mol-id` from the host, for a component
 * whose React `...rest` target is an inner element: the value is re-rendered
 * on that element by the component's own `data-mol-id` binding, so it must not
 * stay on the wrapper as a duplicate.
 *
 * @param host - The component host element.
 * @returns The value, or undefined when the host had none.
 */
export function takeDataMolId(host: Element): string | undefined {
  const value = host.getAttribute('data-mol-id') ?? undefined
  host.removeAttribute('data-mol-id')
  return value
}

/**
 * Takes a `data-mol-id` the caller bound on the host (`[attr.data-mol-id]`) and writes the id the
 * component renders onto its element in the same pass, as React spreads it there in the render that
 * passed it. Call it from `ngAfterViewInit` and `ngAfterViewChecked`, before
 * {@link moveRestAttributes} / {@link reapplyRestAttributes}: by then the host attribute of this pass
 * is written, while the element's own `[attr.data-mol-id]` binding already ran. A component that
 * only stored the id showed it a change detection late, and a move that ran first carried the raw
 * host value over the component's own `automationId`.
 *
 * @param host - The component host element.
 * @param target - The element that carries the id, when rendered.
 * @param store - Keeps the taken host id for the component's `molId()`.
 * @param molId - The id the component renders, read after `store`.
 */
export function adoptHostDataMolId(
  host: Element,
  target: Element | undefined | null,
  store: (hostId: string) => void,
  molId: () => string | undefined,
): void {
  const hostId = takeDataMolId(host)
  if (hostId === undefined) return
  store(hostId)
  const id = molId()
  if (id !== undefined) target?.setAttribute('data-mol-id', id)
}
