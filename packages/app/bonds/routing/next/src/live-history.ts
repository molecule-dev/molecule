/**
 * The live history of a component that renders with Next.js App Router values.
 *
 * @module
 */

import { useRef, useState } from 'react'

import { createHistoryRouter, type Router } from '@molecule/app-routing'

import { createNextHistory, type NextHistory } from './history.js'
import type { NextRouterConfig } from './types.js'

/**
 * Creates, once for the calling component's whole life, the molecule router and its live
 * history over the latest `next/navigation` values. The values are mirrored in every
 * render, because components below read the router while rendering.
 *
 * @param config - The values of the current render; `routes` registers on creation only.
 * @returns The component's router and its history.
 */
export function useLiveHistory(config: NextRouterConfig): { router: Router; history: NextHistory } {
  const configRef = useRef(config)
  configRef.current = config

  const [created] = useState(() => {
    const history = createNextHistory(() => configRef.current)
    return { router: createHistoryRouter(history, { routes: config.routes }), history }
  })
  return created
}
