/**
 * Cross-mount state continuity for composables whose arguments a host can
 * swap by re-mounting them.
 *
 * @module
 */

/**
 * State one composable instance leaves to the mount that replaces it. The
 * state itself carries its liveness: once the host slot is truly gone (no
 * replacement adopted it), `dead` flips and the state's late work — an
 * in-flight response's callbacks, a pending save's notifications — settles as
 * quietly as React settles a request whose component unmounted.
 */
export interface ContinuityState {
  /** False while a live mount (or one awaiting adoption) holds this state. */
  dead: boolean
}

/** The slot offered by the most recent dispose, if the tick has not ended. */
let offered: { state: ContinuityState; app: unknown } | null = null

/** Every state offered this tick that no fresh mount has adopted. */
const pending = new Set<ContinuityState>()

let clearQueued = false

/**
 * Offers a disposed composable's state to the mount that replaces it.
 *
 * The offer lasts for the rest of the current synchronous block: a host that
 * re-mounts a composable with new arguments does so in one block (unmount,
 * then the fresh mount), while a real unmount is never followed by a mount of
 * the same slot in the same block.
 *
 * @param state - The state the disposed composable leaves behind; it is marked
 * dead at the end of the tick when no fresh mount adopts it.
 * @param app - The app the disposed composable ran in.
 */
export function offerContinuity(state: ContinuityState, app: unknown): void {
  offered = { state, app }
  pending.add(state)
  if (!clearQueued) {
    clearQueued = true
    queueMicrotask(() => {
      clearQueued = false
      offered = null
      for (const offeredState of pending) offeredState.dead = true
      pending.clear()
    })
  }
}

/**
 * Adopts the state of the composable this one replaces, when there is one.
 *
 * State is adopted only across APP instances: a component replaced by another
 * inside one app (a `v-if` swap) keeps per-instance state, exactly like React
 * replacing one element with another. Only a host that mounts a fresh app over
 * a just-disposed one — the way a host swaps a composable's arguments by
 * re-mounting it — continues the previous state, which is what React's
 * re-render on new arguments preserved.
 *
 * @param app - The app the calling composable runs in.
 * @returns The adopted state, or null when this mount starts fresh.
 */
export function adoptContinuity<T extends ContinuityState>(app: unknown): T | null {
  const slot = offered
  if (!slot || slot.app === app || slot.state.dead) return null
  offered = null
  pending.delete(slot.state)
  return slot.state as T
}
