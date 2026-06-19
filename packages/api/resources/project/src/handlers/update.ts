import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Project, UpdateProjectInput } from '../types.js'

/**
 * Coerce a stored JSON-bag column (`settings` / `envVars`) into a plain object
 * so an incoming partial PATCH can be merged onto it.
 *
 * The stored value is provider-shaped: Postgres `JSONB` round-trips to an
 * object, while SQLite/MySQL text columns hand back a raw JSON string. A
 * malformed, array, or empty value degrades to `{}` so the partial update still
 * merges against a clean base instead of throwing or silently overwriting.
 * @param value - The stored column value (object, JSON string, or nullish).
 * @returns The value as a plain key/value object.
 */
function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch (error) {
      // Malformed JSON in the column — merge against an empty base rather than
      // failing the whole update; we still want the incoming keys to persist.
      logger.warn('Failed to parse existing project JSON column; merging onto empty base', {
        error,
      })
    }
  }
  return {}
}

/**
 * Update.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string
  const input = req.body as UpdateProjectInput

  // Prefer the owner-scoped row the `authUser` route middleware already loaded
  // (see `routes.ts`); fall back to a direct lookup for consumers that gate the
  // route with their own access middleware (e.g. owner-or-team) before calling
  // this handler. Either way the caller is authorized upstream — this handler
  // does not re-derive ownership, so it does not narrow a team-member grant.
  const preloaded = res.locals.project as Project | undefined
  const project = preloaded?.id === id ? preloaded : await findById<Project>('projects', id)
  if (!project) {
    res.status(404).json({ error: t('project.error.notFound'), errorKey: 'project.error.notFound' })
    return
  }

  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.name !== undefined) data.name = input.name
  // `settings` and `envVars` are partial JSON bags: callers (e.g. the IDE's
  // /model, /effort, /maxloops, /autofix slash-commands) PATCH a single key at
  // a time. Merge incoming keys onto the stored value instead of wholesale
  // overwriting it, otherwise each single-key PATCH wipes every sibling key.
  if (input.settings !== undefined) {
    data.settings = JSON.stringify({ ...asObject(project.settings), ...input.settings })
  }
  if (input.envVars !== undefined) {
    data.envVars = JSON.stringify({ ...asObject(project.envVars), ...input.envVars })
  }
  if (input.sandboxId !== undefined) data.sandboxId = input.sandboxId
  if (input.sandboxStatus !== undefined) data.sandboxStatus = input.sandboxStatus

  try {
    const result = await updateById<Project>('projects', id, data)
    logger.debug('Project updated', { id })
    res.json(result.data)
  } catch (error) {
    logger.error('Failed to update project', { id, error })
    res.status(500).json({
      error: t('project.error.updateFailed'),
      errorKey: 'project.error.updateFailed',
    })
  }
}
