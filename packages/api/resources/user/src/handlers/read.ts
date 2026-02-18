import { getLogger } from '@molecule/api-bond'
import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type * as types from '../types.js'
import { getPlan } from '../utilities/getPlan.js'

const logger = getLogger()

/**
 * Reads a user by ID from the database. Attaches plan info (with expiration/renewal status) via the
 * bonded PlanService if available. When reading the authenticated user's own record, also includes
 * two-factor authentication status from the secrets table.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 200, body: { props, plan?, twoFactorEnabled? } }`.
 */
export const read = ({ name: _name, tableName, schema: _schema }: types.Resource) => {
  return async (req: MoleculeRequest, res: MoleculeResponse) => {
    try {
      const { session } = res.locals
      const id = req.params.id as string

      const user = await findById<types.Props>(tableName, id)

      if (!user) {
        return {
          statusCode: 404,
          body: { error: t('user.error.notFound'), errorKey: 'user.error.notFound' },
        }
      }

      // Attach plan info if available.
      const plan = await getPlan(user)
      const body: Record<string, unknown> = { props: user }

      if (plan) {
        body.plan = plan
      }

      // If reading self, also include two-factor setup info.
      if (session?.userId === id) {
        try {
          const secrets = await findById<types.SecretProps>(`${tableName}Secrets`, id)

          if (secrets) {
            body.twoFactorEnabled = user.twoFactorEnabled || false
            body.hasPendingTwoFactor = Boolean(secrets.pendingTwoFactorSecret)
          }
        } catch {
          // Non-critical.
        }
      }

      return { statusCode: 200, body }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: { error: t('user.error.failedToReadUser'), errorKey: 'user.error.failedToReadUser' },
      }
    }
  }
}
