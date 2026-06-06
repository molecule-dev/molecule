/**
 * React page-header and hero-section primitives.
 *
 * Exports:
 * - `<PageHeader>` — top-of-page header with breadcrumbs + title/subtitle + actions + meta.
 * - `<HeroSection>` — dashboard/landing hero with text + optional media column.
 *
 * Both accept `className` for per-brand accent styling.
 *
 * @example
 * ```tsx
 * import { PageHeader, HeroSection } from '@molecule/app-page-chrome-react'
 *
 * <PageHeader
 *   title="Projects"
 *   subtitle="Manage your active projects"
 *   actions={<Button onClick={() => setOpen(true)}>New project</Button>}
 * />
 *
 * <HeroSection
 *   eyebrow="Welcome back"
 *   title="Your workspace"
 *   description="Everything you need to ship faster."
 *   primaryAction={<Button variant="solid">Get started</Button>}
 * />
 * ```
 *
 * @module
 */

export * from './HeroSection.js'
export * from './PageHeader.js'
