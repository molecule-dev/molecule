/**
 * Angular page-header and hero-section primitives — the counterpart of
 * `@molecule/app-page-chrome-react`: the same props (React names), the same
 * DOM for the same input.
 *
 * Exports:
 * - `<PageHeader>` — top-of-page header with breadcrumbs + title/subtitle +
 *   leading icon + right-aligned actions + meta row. `emphasis="extrabold"`
 *   switches the title to the larger dashboard treatment.
 * - `<HeroSection>` — dashboard/landing hero with text + optional media
 *   column; `align="center"` for marketing-style heroes.
 *
 * Both accept `className` for per-brand accent styling and `dataMolId` for
 * AI-agent selectors. Node props are projected content: give each one
 * `slot="<name>"` in the host template.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { HeroSection, PageHeader } from '@molecule/app-page-chrome-angular'
 *
 * @Component({
 *   selector: 'app-projects',
 *   standalone: true,
 *   imports: [PageHeader, HeroSection],
 *   template: `
 *     <header mol-page-header>
 *       <span slot="title">Projects</span>
 *       <span slot="subtitle">Manage your active projects</span>
 *       <button slot="actions" type="button" (click)="open = true">New project</button>
 *     </header>
 *     <section mol-hero-section>
 *       <span slot="eyebrow">Welcome back</span>
 *       <span slot="title">Your workspace</span>
 *       <span slot="description">Everything you need to ship faster.</span>
 *     </section>
 *   `,
 * })
 * export class ProjectsPage {
 *   open = false
 * }
 * ```
 *
 * @remarks
 * Not to be confused with `@molecule/app-ui-angular`'s own `<PageHeader>`
 * (props: `title`/`description`/`actions`/`breadcrumbs`): THIS PageHeader
 * takes `subtitle` (not `description`) and adds `icon`, `meta`, and
 * `emphasis`. Import from the package that matches the props you pass.
 * Styling resolves via `getClassMap()` from `@molecule/app-ui`, so a ClassMap
 * bond (e.g. `@molecule/app-ui-tailwind`) must be wired before render.
 *
 * @module
 */

export * from './hero-section.component.js'
export * from './page-header.component.js'
export * from './types.js'
