/**
 * React Router v7 provider for `@molecule/app-routing`.
 *
 * This package provides a React Router implementation of the molecule Router interface,
 * allowing you to use molecule's routing abstractions with React Router.
 *
 * @example
 * ```tsx
 * import { BrowserRouter, Routes, Route } from 'react-router-dom'
 * import { setRouter } from '@molecule/app-routing'
 * import { MoleculeRouterProvider } from '@molecule/app-routing-react-router'
 *
 * function App() {
 *   // onRouterReady bonds the adapter so molecule packages using
 *   // @molecule/app-routing's navigate()/getRouter() share THIS router.
 *   return (
 *     <BrowserRouter>
 *       <MoleculeRouterProvider onRouterReady={setRouter}>
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
 * - **`MoleculeRouterProvider` alone does NOT bond the router.** It only provides
 *   React context for this package's hooks (`useMoleculeRouter`, …). Pass
 *   `onRouterReady={setRouter}` (from `@molecule/app-routing`) — otherwise other
 *   molecule packages silently get the core's auto-created fallback browser router
 *   and navigate with full-page reloads.
 * - **Do NOT wire the exported `provider` const** in a React Router app — it is a
 *   no-hooks fallback (empty params, `window.location.href` navigation). Use
 *   `MoleculeRouterProvider` (or `createReactRouter` with hook values) instead.
 * - The adapter must live INSIDE `<BrowserRouter>` (it calls React Router hooks).
 * - `setRouter` is exported by `@molecule/app-routing`, not by this package.
 *
 * @module @molecule/app-routing-react-router
 */

export * from './hooks.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
