/**
 * Cases for the router hooks.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `useLocation()`: the router's current location. */
export const useLocationCases: HookCases = {
  hook: 'useLocation',
  cases: [
    { name: 'initial route with a query', context: { route: '/items?page=2' } },
    {
      name: 'follows navigation',
      steps: [
        { type: 'navigate', to: '/a' },
        { type: 'navigate', to: '/b?x=1' },
      ],
    },
  ],
}

/** `useNavigate()`: a function that navigates. */
export const useNavigateCases: HookCases = {
  hook: 'useNavigate',
  cases: [{ name: 'navigates to a path', steps: [{ type: 'call', args: ['/settings'] }] }],
}
