/**
 * Project types.
 *
 * @module
 */

/**
 * A user project record (name, type, framework, packages, sandbox state, settings).
 */
export interface Project {
  id: string
  userId: string
  name: string
  slug: string
  projectType: 'api' | 'app'
  framework: string | null
  packages: string[]
  envVars: Record<string, string>
  sandboxId: string | null
  sandboxStatus: 'creating' | 'running' | 'sleeping' | 'stopped'
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
 */
export type UpdateProjectInput = Partial<
  Pick<Project, 'name' | 'settings' | 'envVars' | 'sandboxId' | 'sandboxStatus'>
>
