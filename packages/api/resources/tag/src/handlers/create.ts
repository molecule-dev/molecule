import { create as dbCreate, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isTagAdmin } from '../authorizers/index.js'
import type { CreateTagInput, Tag } from '../types.js'

/**
 * Converts a string to a URL-friendly slug.
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
 * Creates a new tag with a unique slug derived from the name.
 *
 * Admin-only and enforced here (not merely via route middleware): tags are a
 * shared global taxonomy with no per-row owner, so creating a new taxonomy entry
 * is the same class of mutation as update/del. A non-admin caller is rejected
 * (401 when unauthenticated, 403 otherwise) before any tag row is inserted —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired. (Attaching an *existing* tag to a resource is a different, owner-
 * governed operation — see `addTag`/`removeTag`.)
 *
 * @param req - The incoming request with `CreateTagInput` body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }
  if (!(await isTagAdmin(res))) {
    res.status(403).json({
      error: t('tag.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage tags',
      }),
      errorKey: 'tag.error.forbidden',
    })
    return
  }

  const input = req.body as CreateTagInput

  if (!input.name?.trim()) {
    res.status(400).json({
      error: t('tag.error.nameRequired', undefined, { defaultValue: 'Tag name is required' }),
      errorKey: 'tag.error.nameRequired',
    })
    return
  }

  let slug = slugify(input.name)
  if (!slug) {
    res.status(400).json({
      error: t('tag.error.invalidName', undefined, { defaultValue: 'Tag name is invalid' }),
      errorKey: 'tag.error.invalidName',
    })
    return
  }

  const existing = await findOne('tags', [{ field: 'slug', operator: '=', value: slug }])
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  try {
    const result = await dbCreate<Tag>('tags', {
      name: input.name.trim(),
      slug,
      color: input.color ?? null,
      description: input.description ?? null,
    })

    logger.debug('Tag created', { tagId: result.data?.id, slug })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create tag', { slug, error })
    res.status(500).json({
      error: t('tag.error.createFailed', undefined, { defaultValue: 'Failed to create tag' }),
      errorKey: 'tag.error.createFailed',
    })
  }
}
