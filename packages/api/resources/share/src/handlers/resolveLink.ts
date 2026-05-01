/**
 * Resolve public share link handler (anonymous access permitted).
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { resolveShareLink } from '../service.js'

/**
 * Resolves a public share-link slug to its `ShareLink` record. Returns
 * 404 when the slug is unknown, revoked, or expired. Does NOT require
 * authentication — the slug is the credential.
 *
 * @param req - The request with `slug` param.
 * @param res - The response object.
 */
export async function resolveLink(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { slug } = req.params
  if (!slug) {
    res.status(400).json({
      error: t('share.error.missingSlug', undefined, { defaultValue: 'Slug is required' }),
      errorKey: 'share.error.missingSlug',
    })
    return
  }

  try {
    const link = await resolveShareLink(slug)
    if (!link) {
      res.status(404).json({
        error: t('share.error.linkNotFound', undefined, {
          defaultValue: 'Share link not found',
        }),
        errorKey: 'share.error.linkNotFound',
      })
      return
    }
    res.json(link)
  } catch (error) {
    logger.error('Failed to resolve share link', { slug, error })
    res.status(500).json({
      error: t('share.error.linkResolveFailed', undefined, {
        defaultValue: 'Failed to resolve share link',
      }),
      errorKey: 'share.error.linkResolveFailed',
    })
  }
}
