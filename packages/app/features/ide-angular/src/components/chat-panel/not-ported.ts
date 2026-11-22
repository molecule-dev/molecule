/**
 * The skeleton's one reporting channel: every slice or section the ChatPanel
 * port has not reached yet calls {@link notPorted} from the action React
 * performs, and the listeners a test registers with {@link onNotPorted} hear
 * it, in the order the port runs it.
 *
 * It logs nothing. A message on the panel's logger is a call the conformance
 * recorder compares, and React never makes it, so a stub that only registers
 * at mount would fail every case on the report itself; a case that really
 * exercises an unported behaviour fails on its own DOM and request comparison.
 *
 * The final port grep is empty — every call disappears as its unit lands. The
 * call sites are the R0 markers' actions (`<slice>.<fn>`), never view code, so
 * a report names the React concern the caller was in.
 *
 * @module
 */

/** Who hears each report, in registration order. */
const listeners = new Set<(action: string) => void>()

/**
 * Hears every report until the returned function is called.
 *
 * @param listener - Called with the action of each report, as it happens.
 * @returns Stops listening.
 */
export function onNotPorted(listener: (action: string) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Reports an unported React action to every listener.
 *
 * @param action - The React action, as `<slice>.<fn>` (e.g. `submit.handleSubmit`).
 */
export function notPorted(action: string): void {
  for (const listener of listeners) listener(action)
}
