/**
 * Hook-site lanes: state a hook keeps across a re-mount of the same site.
 *
 * React keeps a hook's state for as long as its component instance lives; an
 * argument change RE-RENDERS the same instance, so an in-flight request, a
 * pending save or a form draft survives it. In Angular a hook function runs
 * once per component instantiation, and new arguments arrive by re-creating
 * the component — so the hooks whose state must survive an argument change
 * (`useHttp`, `useOptimisticValue`, `useForm`) keep that state in a LANE: a
 * module-level record the destroyed instance parks and the next instance of
 * the same hook kind adopts when it mounts in the same place.
 *
 * A lane is parked only while the site is plausibly being re-created: the
 * park records the host element's container, and a microtask — which runs
 * after the synchronously-removed container of a real unmount, but before the
 * awaited re-creation of an argument change — drops the lane when that
 * container has left the document. A site that went away starts fresh.
 *
 * @module
 */

/** One parked lane per hook kind; the newest park wins. */
const parked = new Map<string, unknown>()

/**
 * Adopts this hook kind's parked lane, if the site was re-created rather than
 * closed.
 *
 * @param kind - The hook kind (`'useHttp'`); one lane per kind and site.
 * @returns The parked lane, or `undefined` when the site starts fresh.
 */
export function adoptLane<T>(kind: string): T | undefined {
  const lane = parked.get(kind)
  if (lane !== undefined) parked.delete(kind)
  return lane as T | undefined
}

/**
 * Parks this hook kind's lane for the next instance at the same site.
 *
 * @param kind - The hook kind (`'useHttp'`).
 * @param lane - The lane to hand over.
 * @param site - The site {@link captureSite} recorded (the host's container);
 *   `null` drops the lane.
 */
export function parkLane(kind: string, lane: unknown, site: Element | null): void {
  parked.set(kind, lane)
  queueMicrotask(() => {
    if (parked.get(kind) !== lane) return
    // Adopted already, or a newer park replaced this one.
    if (!site || !site.isConnected) parked.delete(kind)
  })
}

/**
 * Records the site's container element: the host's parent once the host is in
 * the document. A hook runs during component creation, BEFORE the caller
 * appends the host, and the host is detached again before `onDestroy` runs —
 * so the only reliable moment to read the parent is a microtask after mount.
 * The container (not the host) is the right anchor: it survives a re-mount of
 * the host at the same site and leaves the document only when the site closes.
 *
 * @param host - The host element (`inject(ElementRef).nativeElement`).
 * @param onSite - Receives the container once the host is attached (or `null`
 *   when the host never gets one).
 */
export function captureSite(host: HTMLElement, onSite: (site: Element | null) => void): void {
  queueMicrotask(() => onSite(host.parentElement))
}
