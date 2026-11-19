/**
 * The bond's `MemoryRouter`: Solid Router's `MemoryRouter` over a
 * {@link createSolidMemoryHistory}, published to every molecule hook under it.
 *
 * @module
 */

import {
  MemoryRouter as SolidMemoryRouter,
  type MemoryRouterProps as SolidMemoryRouterProps,
} from '@solidjs/router'
import { type JSX, splitProps } from 'solid-js'

import { MemoryHistoryContext } from './context.js'
import { createSolidMemoryHistory } from './memory-history.js'
import type { SolidMemoryHistory } from './types.js'

/** Props for {@link MemoryRouter}: Solid Router's, with React Router's `initialEntries`. */
export interface MemoryRouterProps extends Omit<SolidMemoryRouterProps, 'history'> {
  /** The memory history to run on. One is made from `initialEntries` when it is omitted. */
  history?: SolidMemoryHistory
  /** The paths a new history starts at; the last one is current. Defaults to `['/']`. */
  initialEntries?: string[]
}

/**
 * Solid Router's `MemoryRouter` on a memory history every molecule hook under it reads:
 * each entry's state and key, and Back and Forward as pops. Under Solid Router's own
 * `MemoryRouter` only `useMoleculeRouter({ history })` sees them.
 *
 * @param props - Solid Router's `MemoryRouter` props, plus `initialEntries`.
 * @returns The router.
 * @example
 * ```tsx
 * import { Route } from '@solidjs/router'
 * import { MemoryRouter } from '@molecule/app-routing-solid-router'
 *
 * <MemoryRouter initialEntries={['/settings/team?tab=billing']}>
 *   <Route path="/settings/:account" component={Settings} />
 * </MemoryRouter>
 * ```
 */
export function MemoryRouter(props: MemoryRouterProps): JSX.Element {
  const [own, rest] = splitProps(props, ['history', 'initialEntries'])
  const history = own.history ?? createSolidMemoryHistory(own.initialEntries)
  return (
    <MemoryHistoryContext.Provider value={history}>
      <SolidMemoryRouter {...rest} history={history} />
    </MemoryHistoryContext.Provider>
  )
}
