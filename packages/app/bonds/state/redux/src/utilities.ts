/**
 * Redux utility functions.
 *
 * @module
 */

import type { ThunkAPI } from './types.js'

/**
 * Selector helper with memoization.
 *
 * @example
 * ```typescript
 * const selectCount = createSelector(
 *   (state: RootState) => state.counter.count,
 *   (count) => count * 2
 * )
 * ```
 *
 * @param args - Input selectors followed by a result function. The result function receives the output of each input selector.
 * @returns A memoized selector that only recomputes when its input selector results change (shallow equality).
 */
export const createSelector = <T, Args extends unknown[], R>(
  ...args: [...selectors: ((state: T) => unknown)[], resultFn: (...args: Args) => R]
): ((state: T) => R) => {
  // Handle single-argument case (identity selector)
  if (args.length === 1) {
    const selector = args[0] as (state: T) => R
    let lastInput: T | undefined
    let lastResult: R | undefined

    return (state: T): R => {
      if (state !== lastInput) {
        lastResult = selector(state)
        lastInput = state
      }
      return lastResult as R
    }
  }

  const selectors = args.slice(0, -1) as ((state: T) => unknown)[]
  const resultFn = args[args.length - 1] as (...args: unknown[]) => R

  let lastArgs: unknown[] | undefined
  let lastResult: R | undefined

  return (state: T): R => {
    const currentArgs = selectors.map((selector) => selector(state))

    // Check if args changed
    const argsChanged =
      !lastArgs ||
      lastArgs.length !== currentArgs.length ||
      lastArgs.some((arg, i) => arg !== currentArgs[i])

    if (argsChanged) {
      lastResult = resultFn(...currentArgs)
      lastArgs = currentArgs
    }

    return lastResult as R
  }
}

/**
 * Create an async thunk action creator with automatic pending/fulfilled/rejected lifecycle.
 *
 * @example
 * ```typescript
 * const fetchUser = createAsyncAction<User, string>(
 *   'user/fetch',
 *   async (userId, { dispatch, getState }) => {
 *     const response = await api.getUser(userId)
 *     return response.data
 *   }
 * )
 *
 * dispatch(fetchUser('123'))
 * ```
 * @param typePrefix - The action type prefix (e.g., 'user/fetch'). Generates pending, fulfilled, and rejected subtypes.
 * @param payloadCreator - Async function receiving the argument and thunk API, returning the result.
 * @returns A thunk action creator with `.pending`, `.fulfilled`, and `.rejected` string properties for use in reducers.
 */
export const createAsyncAction = <Result, Arg = void>(
  typePrefix: string,
  payloadCreator: (arg: Arg, thunkAPI: ThunkAPI<unknown>) => Promise<Result>,
): ((
  arg: Arg,
) => (dispatch: (action: unknown) => void, getState: () => unknown) => Promise<Result>) & {
  pending: string
  fulfilled: string
  rejected: string
} => {
  const pending = `${typePrefix}/pending`
  const fulfilled = `${typePrefix}/fulfilled`
  const rejected = `${typePrefix}/rejected`

  const actionCreator = (arg: Arg) => {
    return async (dispatch: (action: unknown) => void, getState: () => unknown) => {
      const abortController = new AbortController()

      dispatch({ type: pending, payload: arg })

      try {
        const result = await payloadCreator(arg, {
          dispatch,
          getState,
          signal: abortController.signal,
        })
        dispatch({ type: fulfilled, payload: result })
        return result
      } catch (error) {
        dispatch({
          type: rejected,
          payload: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }
  }

  actionCreator.pending = pending
  actionCreator.fulfilled = fulfilled
  actionCreator.rejected = rejected

  return actionCreator
}
