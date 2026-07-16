/**
 * React page-header and hero-section primitives.
 *
 * Exports:
 * - `<PageHeader>` — top-of-page header with breadcrumbs + title/subtitle +
 *   leading icon + right-aligned actions + meta row. `emphasis="extrabold"`
 *   switches the title to the larger dashboard treatment.
 * - `<HeroSection>` — dashboard/landing hero with text + optional media
 *   column; `align="center"` for marketing-style heroes.
 *
 * Both accept `className` for per-brand accent styling and `dataMolId` for
 * AI-agent selectors.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { PageHeader, HeroSection } from '@molecule/app-page-chrome-react'
 * import { Button } from '@molecule/app-ui-react'
 *
 * function ProjectsPage() {
 *   const [open, setOpen] = useState(false)
 *   return (
 *     <>
 *       <PageHeader
 *         title="Projects"
 *         subtitle="Manage your active projects"
 *         actions={<Button onClick={() => setOpen(true)}>New project</Button>}
 *       />
 *       <HeroSection
 *         eyebrow="Welcome back"
 *         title="Your workspace"
 *         description="Everything you need to ship faster."
 *         primaryAction={<Button variant="solid">Get started</Button>}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * Not to be confused with `@molecule/app-ui-react`'s own `<PageHeader>`
 * (props: `title`/`description`/`actions`/`breadcrumbs`): THIS PageHeader
 * takes `subtitle` (not `description`) and adds `icon`, `meta`, and
 * `emphasis`. Import from the package that matches the props you pass.
 * Styling resolves via `getClassMap()` from `@molecule/app-ui`, so a ClassMap
 * bond (e.g. `@molecule/app-ui-tailwind`) must be wired before render.
 *
 * @module
 */

export * from './HeroSection.js'
export * from './PageHeader.js'
