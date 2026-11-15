/**
 * Svelte page-header and hero-section primitives — the Svelte counterpart of
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
 * AI-agent selectors. Node props are snippets (preferred) or plain text.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { HeroSection, PageHeader } from '@molecule/app-page-chrome-svelte'
 *   import { Button } from '@molecule/app-ui-svelte'
 *
 *   let open = $state(false)
 * </script>
 *
 * <PageHeader title="Projects" subtitle="Manage your active projects">
 *   {#snippet actions()}
 *     <Button onclick={() => (open = true)}>New project</Button>
 *   {/snippet}
 * </PageHeader>
 *
 * <HeroSection
 *   eyebrow="Welcome back"
 *   title="Your workspace"
 *   description="Everything you need to ship faster."
 * >
 *   {#snippet primaryAction()}
 *     <Button variant="solid">Get started</Button>
 *   {/snippet}
 * </HeroSection>
 * ```
 *
 * @remarks
 * Not to be confused with `@molecule/app-ui-svelte`'s own `<PageHeader>`
 * (props: `title`/`description`/`actions`/`breadcrumbs`): THIS PageHeader
 * takes `subtitle` (not `description`) and adds `icon`, `meta`, and
 * `emphasis`. Import from the package that matches the props you pass.
 * Styling resolves via `getClassMap()` from `@molecule/app-ui`, so a ClassMap
 * bond (e.g. `@molecule/app-ui-tailwind`) must be wired before render.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
