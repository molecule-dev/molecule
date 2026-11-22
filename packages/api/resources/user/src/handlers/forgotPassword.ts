import crypto from 'crypto'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import type * as types from '../types.js'
import { hashResetToken } from '../utilities/hashResetToken.js'
import { normalizeEmail } from '../utilities/normalizeEmail.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for password reset initiation. */
export interface ForgotPasswordRequest extends MoleculeRequest {
  body: {
    email?: string
  }
}

/**
 * Generates a password reset token, stores its hash in the secrets table, and sends a reset
 * email via the bonded email provider. Returns 200 whether or not the email exists, to prevent
 * user enumeration. With no email provider bonded it returns 501
 * `user.error.passwordResetUnavailable` for every address, since no reset email can be sent.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - Optional. Ignored — the reset flow reads and writes secrets directly.
 * @returns A request handler that responds with `{ statusCode: 200, body: { success: true } }`, or
 *   501 when no email provider is bonded.
 */
export const forgotPassword = ({
  name: _name,
  tableName,
  schema: _schema,
}: types.HandlerResource) => {
  return async (req: ForgotPasswordRequest) => {
    try {
      const { email } = req.body

      if (!email) {
        return {
          statusCode: 400,
          body: { error: t('user.error.emailRequired'), errorKey: 'user.error.emailRequired' },
        }
      }

      // With no email provider bonded no reset email can go out for ANY account, so say so
      // instead of answering "success" and leaving the user waiting for an email that never
      // comes. The answer is decided before the lookup, the same for every address, so it
      // reveals nothing about which accounts exist.
      const emailProvider = get<{ sendMail(opts: Record<string, unknown>): Promise<unknown> }>(
        'email',
      )
      if (!emailProvider) {
        logger.warn(
          'Password reset requested but no email provider is bonded, so no reset email can be sent. Bond an email transport (e.g. @molecule/api-emails-sendgrid) to enable password reset.',
        )
        return {
          statusCode: 501,
          body: {
            error: t('user.error.passwordResetUnavailable'),
            errorKey: 'user.error.passwordResetUnavailable',
          },
        }
      }

      // Find user by email — normalized to match how signup stores it. A raw
      // mixed-case lookup silently finds nothing, and the 200-no-reveal response
      // (anti-enumeration) then hides the failure: the user never gets a reset.
      const normalizedEmail = normalizeEmail(email)
      const user = normalizedEmail
        ? await findOne<types.Props>(tableName, [
            { field: 'email', operator: '=', value: normalizedEmail },
          ])
        : null

      if (!user) {
        // Don't reveal whether the email exists.
        return { statusCode: 200, body: { success: true } }
      }

      // Generate a reset token. The RAW token is emailed to the user; only its
      // sha256 hash is persisted, so a DB read never yields a usable token.
      const passwordResetToken = crypto.randomBytes(32).toString('hex')
      const passwordResetTokenAt = new Date().toISOString()

      await updateById(`${tableName}Secrets`, user.id, {
        passwordResetToken: hashResetToken(passwordResetToken),
        passwordResetTokenAt,
      })

      try {
        const appName = getConfig('APP_NAME', 'App') ?? 'App'
        // The site origin, or the app origin when only that one is configured: a deployment
        // that sets just APP_ORIGIN must still get a link in the email, not a bare token.
        const siteOrigin = getConfig('SITE_ORIGIN', '') || getConfig('APP_ORIGIN', '')

        // The reset page prefills the address from the link: the follow-up login needs it.
        const resetUrl = siteOrigin
          ? `${siteOrigin}/reset-password?token=${passwordResetToken}&email=${encodeURIComponent(user.email ?? email)}`
          : ''

        // Default the sender to the app's OWN domain (derived from SITE_ORIGIN),
        // never a placeholder like `noreply@example.com`: a provider (e.g. Mailgun)
        // rejects a `from` whose domain isn't its verified sending domain, so a
        // placeholder silently BOUNCES this reset email — a critical flow. An
        // explicit EMAIL_FROM still wins; the localhost fallback is dev-only (prod
        // sets SITE_ORIGIN).
        let defaultFrom = 'no-reply@localhost'
        try {
          if (siteOrigin) defaultFrom = `no-reply@${new URL(siteOrigin).hostname}`
        } catch (_error) {
          // Malformed SITE_ORIGIN — keep the localhost fallback.
        }

        await emailProvider.sendMail({
          from: getConfig('EMAIL_FROM', defaultFrom),
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
      } catch (error) {
        logger.error('Failed to send password reset email:', error)
      }

      analytics.track({ name: 'user.password_reset_requested', userId: user.id }).catch((error) => {
        logger.debug('user.password_reset_requested analytics track failed', {
          error,
          userId: user.id,
        })
      })

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
