/**
 * React Router v7 provider for `@molecule/app-routing`.
 *
 * This package provides a React Router implementation of the molecule Router interface,
 * allowing you to use molecule's routing abstractions with React Router.
 *
 * @module `@molecule/app-routing-react-router`
 *
 * @example
 * ```tsx
 * import { BrowserRouter, Routes, Route } from 'react-router-dom'
 * import { MoleculeRouterProvider } from '@molecule/app-routing-react-router'
 *
 * function App() {
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
 */

export * from './hooks.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
