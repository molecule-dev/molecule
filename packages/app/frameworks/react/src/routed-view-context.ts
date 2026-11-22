/**
 * The routed view's context. Kept out of the package's exports: a routed view is provided only
 * through `RouterProvider`'s `routedView`, so it can never be provided without a router.
 *
 * @module
 */

import type { ComponentType } from 'react'
import { createContext } from 'react'

/**
 * Context for the routed view: the component the routing bond renders where the matched child
 * route goes (React Router's `Outlet`). `null` when the bond has none (Next.js passes a
 * layout its page as children).
 */
export const RoutedViewContext = createContext<ComponentType | null>(null)
RoutedViewContext.displayName = 'MoleculeRoutedViewContext'
