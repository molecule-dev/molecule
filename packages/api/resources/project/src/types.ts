/**
 * Project types.
 *
 * @module
 */

/**
 * Branding applied to a scaffolded project. Derived from user cues gathered
 * during discovery, or randomized so generated apps are visually distinct.
 */
export interface BrandingSpec {
  /** Display name (header, auth pages, PWA manifest, OG tags). */
  appName: string
  /** Primary brand color as a hex string (e.g. `#1a8917`). */
  brandColor: string
  /** Short description used in the PWA manifest and meta tags. */
  appDescription: string
  /** About/footer link. */
  websiteUrl?: string
  /** Logo dimensions in pixels. */
  logoSize?: number
  /** Whether the spec came from explicit user cues or was randomized. */
  source: 'user' | 'random'
}

/**
 * A user project record (name, type, framework, packages, sandbox state, settings).
 */
export interface Project {
  id: string
  userId: string
  name: string
  slug: string
  projectType: 'api' | 'app' | 'full-stack' | 'status-page'
  framework: string | null
  packages: string[]
  /** Flagship template slug the project was scaffolded from, if any. */
  templateSlug: string | null
  /** Branding chosen for the project during discovery, if any. */
  brandingSpec: BrandingSpec | null
  envVars: Record<string, string>
  sandboxId: string | null
  sandboxStatus: 'creating' | 'queued' | 'running' | 'sleeping' | 'stopped'
  lastActiveAt: string | null
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Create Project Input type.
 */
export type CreateProjectInput = Pick<Project, 'name' | 'projectType'> & {
  framework?: string
  packages?: string[]
}

/**
 * Update Project Input type.
 *
 * `framework`, `packages`, `projectType`, `templateSlug`, and `brandingSpec`
 * are writable so the post-discovery selection step can persist the chosen
 * starting point before the sandbox boots.
 */
export type UpdateProjectInput = Partial<
  Pick<
    Project,
    | 'name'
    | 'settings'
    | 'envVars'
    | 'sandboxId'
    | 'sandboxStatus'
    | 'framework'
    | 'packages'
    | 'projectType'
    | 'templateSlug'
    | 'brandingSpec'
  >
>
