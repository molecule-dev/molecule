import { getAnalytics } from '@molecule/api-bond'
import { create as dbCreate, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const analytics = getAnalytics()
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateProjectInput, Project } from '../types.js'

/**
 * Converts a string to a URL-friendly slug by lowercasing, replacing non-alphanumeric
 * characters with hyphens, and trimming leading/trailing hyphens.
 * @param name - The string to slugify.
 * @returns The slugified string.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Creates a new project with a unique slug derived from the project name. Requires `name` and
 * `projectType` in the request body. Optionally accepts `framework` and `packages`. Appends
 * a timestamp suffix to the slug if it already exists.
 * @param req - The incoming request with `CreateProjectInput` body and `userId`.
 * @param res - The response object for sending the created project or error.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (req.body as Record<string, unknown>).userId as string
  const input = req.body as CreateProjectInput

  if (!input.name || !input.projectType) {
    res.status(400).json({
      error: t('project.error.nameAndTypeRequired'),
      errorKey: 'project.error.nameAndTypeRequired',
    })
    return
  }

  let slug = slugify(input.name)

  // Ensure slug uniqueness
  const existing = await findOne('projects', [{ field: 'slug', operator: '=', value: slug }])
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  try {
    const result = await dbCreate<Project>('projects', {
      userId,
      name: input.name,
      slug,
      projectType: input.projectType,
      framework: input.framework ?? null,
      packages: JSON.stringify(input.packages ?? []),
      envVars: JSON.stringify({}),
      sandboxStatus: 'stopped',
      settings: JSON.stringify({}),
    })

    logger.debug('Project created', { projectId: result.data?.id, slug })
    analytics
      .track({
        name: 'project.created',
        userId,
        properties: { projectType: input.projectType, framework: input.framework ?? null },
      })
      .catch(() => {})
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create project', { userId, slug, error })
    res.status(500).json({
      error: t('project.error.createFailed'),
      errorKey: 'project.error.createFailed',
    })
  }
}
