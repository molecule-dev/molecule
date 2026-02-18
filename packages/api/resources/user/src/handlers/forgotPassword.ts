import { v4 as uuid } from 'uuid'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for password reset initiation. */
export interface ForgotPasswordRequest extends MoleculeRequest {
  body: {
    email?: string
  }
}

/**
 * Generates a UUID password reset token, stores it in the secrets table, and sends a reset
 * email via the bonded email provider (if available). Always returns 200 regardless of whether
 * the email exists, to prevent user enumeration.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 200, body: { success: true } }`.
 */
export const forgotPassword = ({ name: _name, tableName, schema: _schema }: types.Resource) => {
  return async (req: ForgotPasswordRequest) => {
    try {
      const { email } = req.body

      if (!email) {
        return {
          statusCode: 400,
          body: { error: t('user.error.emailRequired'), errorKey: 'user.error.emailRequired' },
        }
      }

      // Find user by email.
      const user = await findOne<types.Props>(tableName, [
        { field: 'email', operator: '=', value: email },
      ])

      if (!user) {
        // Don't reveal whether the email exists.
        return { statusCode: 200, body: { success: true } }
      }

      // Generate a reset token.
      const passwordResetToken = uuid()
      const passwordResetTokenAt = new Date().toISOString()

      await updateById(`${tableName}Secrets`, user.id, { passwordResetToken, passwordResetTokenAt })

      // Try to send email if email service is bonded.
      try {
        const emailProvider = get<{ sendMail(opts: Record<string, unknown>): Promise<unknown> }>(
          'email',
        )
        if (emailProvider) {
          const appName = getConfig('APP_NAME', 'App') ?? 'App'
          const siteOrigin = getConfig('SITE_ORIGIN', '')

          const resetUrl = siteOrigin
            ? `${siteOrigin}/reset-password?token=${passwordResetToken}`
            : ''

          await emailProvider.sendMail({
            from: getConfig('EMAIL_FROM', 'noreply@example.com'),
            to: email,
            subject: t(
              'user.email.passwordResetSubject',
              { appName },
              { locale: ((user as Record<string, unknown>)?.locale as string) || 'en' },
            ),
            subjectKey: 'user.email.passwordResetSubject',
            text:
              t(
                'user.email.passwordResetText',
                { token: passwordResetToken },
                { locale: ((user as Record<string, unknown>)?.locale as string) || 'en' },
              ) +
              '\n\n' +
              (resetUrl
                ? t(
                    'user.email.passwordResetLink',
                    { url: resetUrl },
                    { locale: ((user as Record<string, unknown>)?.locale as string) || 'en' },
                  )
                : ''),
            textKey: 'user.email.passwordResetText',
            html:
              t(
                'user.email.passwordResetHtml',
                { token: passwordResetToken },
                { locale: ((user as Record<string, unknown>)?.locale as string) || 'en' },
              ) +
              (resetUrl
                ? t(
                    'user.email.passwordResetHtmlLink',
                    { url: resetUrl },
                    { locale: ((user as Record<string, unknown>)?.locale as string) || 'en' },
                  )
                : ''),
            htmlKey: 'user.email.passwordResetHtml',
          })
        }
      } catch (error) {
        logger.error('Failed to send password reset email:', error)
      }

      analytics.track({ name: 'user.password_reset_requested', userId: user.id }).catch(() => {})

      return { statusCode: 200, body: { success: true } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('user.error.failedToProcessPasswordReset'),
          errorKey: 'user.error.failedToProcessPasswordReset',
        },
      }
    }
  }
}
