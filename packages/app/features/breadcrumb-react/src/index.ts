/**
 * React breadcrumb navigation component.
 *
 * Exports `<Breadcrumb>` — a list of crumbs where each but the last is a
 * link. The final crumb renders as plain text with `aria-current="page"`.
 * Pass `onNavigate` to intercept clicks and hand off to a router.
 *
 * @example
 * ```tsx
 * import { BrowserRouter, Route, Routes, useNavigate } from 'react-router'
 *
 * import { Breadcrumb } from '@molecule/app-breadcrumb-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * setClassMap(classMap) // once, at startup
 *
 * function ProjectPage() {
 *   const navigate = useNavigate()
 *   const project = { id: 'apollo', name: 'Apollo Redesign' }
 *   return (
 *     <Breadcrumb
 *       items={[
 *         { label: 'Home', to: '/' },
 *         { label: 'Projects', to: '/projects' },
 *         { label: project.name },
 *       ]}
 *       onNavigate={(to) => navigate(to)}
 *     />
 *   )
 * }
 *
 * export function App() {
 *   return (
 *     <BrowserRouter>
 *       <Routes>
 *         <Route path="/" element={<h1>Home</h1>} />
 *         <Route path="/projects" element={<h1>Projects</h1>} />
 *         <Route path="/projects/:id" element={<ProjectPage />} />
 *       </Routes>
 *     </BrowserRouter>
 *   )
 * }
 * ```
 *
 * @remarks
 * Without `onNavigate`, crumbs render as plain `<a href>` (full page
 * load in SPAs) — pass `onNavigate={(to) => navigate(to)}` to stay
 * client-side; with it, crumbs render as `<button>`s. The LAST item always
 * renders as plain text with `aria-current="page"` (even if it has a
 * `to`); an earlier item without `to` renders as plain text too, but
 * without `aria-current`. No router dependency is required by the
 * component itself. It calls `getClassMap()`, which throws until
 * `setClassMap(...)` from `@molecule/app-ui` ran. The `<nav>`'s
 * `aria-label` is the fixed English string "Breadcrumb" (not translated);
 * crumb labels are rendered as given — translate them before passing.
 *
 * @module
 */

export * from './Breadcrumb.js'
