/**
 * Convenience wrapper that renders a template and sends it via the bonded
 * `EmailTransport`.
 *
 * @module
 */

import { getTransport } from '@molecule/api-emails'
import type { EmailMessage, EmailSendResult } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'

import { renderTemplate } from './render.js'
import { getTemplate } from './registry.js'
import type { SendTemplateOptions } from './types.js'

/**
 * Render a template and send it via the bonded email transport.
 *
 * Looks up the template via `getTemplate(key)` (registered overrides first,
 * then built-in defaults), renders it for the requested locale + variables,
 * and dispatches the rendered message via the bonded transport.
 *
 * @param key - The template key (e.g. `'subscription.started'`).
 * @param options - Recipient, sender, optional cc/bcc/replyTo, variables, locale.
 * @returns The transport's `EmailSendResult`.
 * @throws {Error} If the template is unregistered or no email transport is bonded.
 */
export const sendTemplate = async (
  key: string,
  options: SendTemplateOptions,
): Promise<EmailSendResult> => {
  const template = getTemplate(key)
  if (!template) {
    throw new Error(
      t(
        'emailTemplates.error.unknownTemplate',
        { key },
        {
          defaultValue: `sendTemplate: no template registered with key "${key}".`,
        },
      ),
    )
  }

  const rendered = renderTemplate(template, options.variables ?? {}, options.locale)

  const message: EmailMessage = {
    from: options.from,
    to: options.to,
    subject: rendered.subject,
    text: rendered.text,
    ...(rendered.html != null ? { html: rendered.html } : {}),
    ...(options.cc != null ? { cc: options.cc } : {}),
    ...(options.bcc != null ? { bcc: options.bcc } : {}),
    ...(options.replyTo != null ? { replyTo: options.replyTo } : {}),
    subjectKey: template.subjectKey,
    textKey: template.textKey,
    ...(template.htmlKey != null ? { htmlKey: template.htmlKey } : {}),
  }

  return getTransport().sendMail(message)
}
