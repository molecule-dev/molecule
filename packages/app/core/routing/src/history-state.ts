/**
 * Navigation state in native routers that only store an object: Angular Router, Vue
 * Router, Solid Router and SvelteKit merge their own keys into `history.state`, so a
 * string, an array or a `Date` would be spread or rejected. These two helpers carry any
 * value the browser can store, as React Router does, while a plain object stays as it
 * is (so the app's own code reading the native router's state still finds its keys).
 *
 * @module
 */

/**
 * The key a non-object state value is stored under. Routers built here keep their own
 * bookkeeping under other `__molecule` keys, so a plain object holding any key with
 * that prefix is wrapped too.
 */
export const HISTORY_STATE_VALUE_KEY = '__moleculeState'

/**
 * Whether `value` is a plain object a native router can merge its keys into.
 *
 * @param value - The navigation state.
 * @returns Whether it is a plain object.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Turns any navigation state into the object a native router stores.
 *
 * @param state - The state passed to `navigate` (any value the browser can store).
 * @param isNativeKey - Whether a key belongs to the native router (Vue Router's
 * `position`, Angular's `navigationId`): an object using one is wrapped, so the
 * native router cannot overwrite it.
 * @returns The state itself when it is a plain object without a `__molecule` key or a
 * native key, the value wrapped under {@link HISTORY_STATE_VALUE_KEY} otherwise, or
 * `undefined` for no state.
 *
 * @example
 * ```ts
 * toHistoryStateRecord({ from: 'list' }) // { from: 'list' }
 * toHistoryStateRecord('note') // { __moleculeState: 'note' }
 * toHistoryStateRecord({ position: 2 }, (key) => key === 'position') // { __moleculeState: { position: 2 } }
 * ```
 */
export const toHistoryStateRecord = (
  state: unknown,
  isNativeKey: (key: string) => boolean = () => false,
): Record<string, unknown> | undefined => {
  if (state === undefined) return undefined
  const reserved = (key: string): boolean => key.startsWith('__molecule') || isNativeKey(key)
  if (isPlainObject(state) && !Object.keys(state).some(reserved)) return state
  return { [HISTORY_STATE_VALUE_KEY]: state }
}

/**
 * Reads back the state {@link toHistoryStateRecord} stored. Strip the native router's
 * own keys first.
 *
 * @param record - The app's part of the stored state.
 * @returns The value passed to `navigate`, or `undefined` when there was none.
 *
 * @example
 * ```ts
 * fromHistoryStateRecord({ __moleculeState: 'note' }) // 'note'
 * fromHistoryStateRecord({ from: 'list' }) // { from: 'list' }
 * ```
 */
export const fromHistoryStateRecord = (record: Record<string, unknown> | undefined): unknown => {
  if (record === undefined) return undefined
  return HISTORY_STATE_VALUE_KEY in record ? record[HISTORY_STATE_VALUE_KEY] : record
}
