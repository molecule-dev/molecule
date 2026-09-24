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
 *
 * import { HeroSection, PageHeader } from '@molecule/app-page-chrome-react'
 * import { Button } from '@molecule/app-ui-react'
 *
 * export function ProjectsPage() {
 *   const [projects, setProjects] = useState(['Website redesign', 'Mobile app'])
 *   return (
 *     <main>
 *       <PageHeader
 *         breadcrumbs={<nav aria-label="Breadcrumb"><a href="/">Home</a> / Projects</nav>}
 *         title="Projects"
 *         subtitle="Manage your active projects"
 *         meta={<span>{`${projects.length} active`}</span>}
 *         actions={<Button onClick={() => setProjects((p) => [...p, `Project ${p.length + 1}`])}>New project</Button>}
 *         dataMolId="projects-header"
 *       />
 *       <ul>{projects.map((name) => <li key={name}>{name}</li>)}</ul>
 *     </main>
 *   )
 * }
 *
 * export function LandingPage() {
 *   return (
 *     <HeroSection
 *       align="center"
 *       eyebrow="New in 2.0"
 *       title="Ship your app this week"
 *       description="Everything you need to launch, in one workspace."
 *       primaryAction={<Button variant="solid" color="primary">Get started</Button>}
 *       secondaryAction={<Button variant="ghost">See pricing</Button>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Not to be confused with `@molecule/app-ui-react`'s own `<PageHeader>`
 * (props: `title`/`description`/`actions`/`breadcrumbs`): THIS PageHeader
 * takes `subtitle` (not `description`) and adds `icon`, `meta`, and
 * `emphasis`. Import from the package that matches the props you pass.
 * BOTH components render an `<h1>` — use one per page (a `PageHeader` OR a `HeroSection`), not
 * both. Every slot is plain `ReactNode`: `breadcrumbs`, `actions` and the hero CTAs are NOT
 * generated for you (no router links, no default buttons), and no text is translated — pass
 * already-translated strings. Neither component is sticky or sets a background.
 *
 * Styling resolves via `getClassMap()` from `@molecule/app-ui`, so a ClassMap
 * bond (e.g. `@molecule/app-ui-tailwind`) must be wired before render.
 *
 * @module
 */

export * from './HeroSection.js'
export * from './PageHeader.js'
