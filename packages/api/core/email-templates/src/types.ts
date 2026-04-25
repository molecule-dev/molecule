/**
 * Type definitions for the email-templates layer.
 *
 * Templates are typed records that pair an i18n key with an English fallback
 * for each of `subject`, `text`, and (optionally) `html`. The render layer
 * resolves the locale-appropriate string via `t()` and substitutes variables
 * via the i18n library's interpolation. The `EmailTransport` bond actually
 * sends the rendered message.
 *
 * @module
 */

import type { EmailAddress } from '@molecule/api-emails'

/**
 * Definition of a transactional email template.
 *
 * Each template defines i18n keys for the subject and body fields plus
 * English defaults that are used when no translation is registered for the
 * caller's locale. Variable interpolation is performed by the i18n library
 * (e.g. `Welcome, {{userName}}!` substitutes `vars.userName`).
 */
export interface EmailTemplate {
  /** Stable identifier for the template (e.g. `'subscription.started'`). */
  key: string

  /** i18n key resolved by `t()` for the email subject line. */
  subjectKey: string

  /** English fallback used when no translation exists for `subjectKey`. */
  defaultSubject: string

  /** i18n key resolved by `t()` for the plain-text body. */
  textKey: string

  /** English fallback used when no translation exists for `textKey`. */
  defaultText: string

  /** Optional i18n key resolved by `t()` for the HTML body. */
  htmlKey?: string

  /** Optional English fallback used when no translation exists for `htmlKey`. */
  defaultHtml?: string

  /**
   * Optional declaration of the variables this template expects. Used purely
   * for type inference at registration sites — runtime rendering is permissive.
   */
  variables?: readonly string[]
}

/**
 * Variables passed at render time. Values are flattened to strings for
 * substitution; objects/arrays are JSON-stringified.
 */
export type EmailTemplateVariables = Record<string, unknown>

/** Result of rendering a template — ready to feed into `EmailTransport.sendMail`. */
export interface RenderedEmail {
  /** Rendered subject. */
  subject: string

  /** Rendered plain-text body. */
  text: string

  /** Rendered HTML body, when the template defined one. */
  html?: string
}

/** Options passed to `sendTemplate`. */
export interface SendTemplateOptions {
  /** Recipient address (string or `EmailAddress`). */
  to: string | EmailAddress | (string | EmailAddress)[]

  /** Sender address. */
  from: string | EmailAddress

  /** Optional CC recipients. */
  cc?: string | EmailAddress | (string | EmailAddress)[]

  /** Optional BCC recipients. */
  bcc?: string | EmailAddress | (string | EmailAddress)[]

  /** Optional reply-to address. */
  replyTo?: string | EmailAddress

  /** Variables interpolated into the rendered template. */
  variables?: EmailTemplateVariables

  /**
   * Optional locale override used when looking up translations. Most apps
   * resolve locale from the request and pass it explicitly.
   */
  locale?: string
}
