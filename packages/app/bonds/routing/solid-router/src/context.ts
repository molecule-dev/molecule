/**
 * The contexts a mounted `MoleculeRouterProvider` publishes its molecule `Router` on, and
 * the bond's `MemoryRouter` its memory history on. Internal to the bond: the hooks read
 * them, apps mount the components.
 *
 * @module
 */

import { createContext } from 'solid-js'

import type { Router } from '@molecule/app-routing'

import type { SolidMemoryHistory } from './types.js'

/**
 * The molecule `Router` of the nearest `MoleculeRouterProvider`, or `undefined` when no
 * provider is mounted (the hooks then build a component-owned router over the native one).
 */
export const MoleculeRouterContext = createContext<Router | undefined>(undefined)

/**
 * The memory history of the nearest bond `MemoryRouter`, or `undefined` under any other
 * router. Every molecule router built under it reads entries and moves from it.
 */
export const MemoryHistoryContext = createContext<SolidMemoryHistory | undefined>(undefined)
