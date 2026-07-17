/**
 * React Router v7 provider for `@molecule/app-routing`.
 *
 * This package provides a React Router implementation of the molecule Router interface,
 * allowing you to use molecule's routing abstractions with React Router.
 *
 * @example
 * ```tsx
 * import { BrowserRouter, Routes, Route } from 'react-router-dom'
 * import { MoleculeRouterProvider } from '@molecule/app-routing-react-router'
 *
 * function App() {
 *   // MoleculeRouterProvider bonds the adapter automatically (calls setRouter in an
 *   // effect on mount), so @molecule/app-routing's navigate()/getRouter() drive THIS
 *   // real React Router — no manual setRouter wiring needed.
 *   return (
 *     <BrowserRouter>
 *       <MoleculeRouterProvider>
 *         <Routes>
 *           <Route path="/" element={<Home />} />
 *           <Route path="/users/:id" element={<UserProfile />} />
 *         </Routes>
 *       </MoleculeRouterProvider>
 *     </BrowserRouter>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **`MoleculeRouterProvider` bonds the router for you.** On mount it calls
 *   `@molecule/app-routing`'s `setRouter` with the live adapter, so other molecule
 *   packages' `navigate()`/`getRouter()` drive React Router (real SPA navigation) —
 *   no manual wiring. Pass `onRouterReady` only if you also need the router instance
 *   (e.g. to register guards); bonding happens either way.
 * - **Do NOT wire the exported `provider` const** in a React Router app — it is a
 *   no-hooks fallback (empty params, `window.location.href` navigation). Use
 *   `MoleculeRouterProvider` (or `createReactRouter` with hook values) instead.
 * - The provider must live INSIDE `<BrowserRouter>` (it calls React Router hooks).
 *
 * @module @molecule/app-routing-react-router
 */

export * from './hooks.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
