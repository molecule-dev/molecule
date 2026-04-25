/**
 * Template rendering.
 *
 * Resolves the locale-appropriate `subject`, `text`, and (optional) `html`
 * for a given template by delegating to the bonded i18n provider via `t()`.
 * Variables are interpolated by the i18n library — every template uses
 * `{{variable}}` syntax in both English fallbacks and translation files.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import type { EmailTemplate, EmailTemplateVariables, RenderedEmail } from './types.js'

/**
 * Render a template into a `RenderedEmail` ready to send.
 *
 * @param template - The template to render.
 * @param variables - Optional values used for `{{variable}}` interpolation.
 * @param locale - Optional locale override (e.g. `'fr'`); defaults to the
 *   bonded i18n provider's current locale.
 * @returns The rendered subject, text, and (optional) html.
 */
export const renderTemplate = (
  template: EmailTemplate,
  variables: EmailTemplateVariables = {},
  locale?: string,
): RenderedEmail => {
  const interpolation = normalizeVariables(variables)

  const subject = t(template.subjectKey, interpolation, {
    defaultValue: template.defaultSubject,
    locale,
  })

  const text = t(template.textKey, interpolation, {
    defaultValue: template.defaultText,
    locale,
  })

  let html: string | undefined
  if (template.htmlKey) {
    html = t(template.htmlKey, interpolation, {
      defaultValue: template.defaultHtml ?? template.defaultText,
      locale,
    })
  }

  return { subject, text, ...(html != null ? { html } : {}) }
}

/**
 * Normalize template variables for the i18n interpolator. The i18n provider's
 * `t()` accepts `Record<string, string | number | boolean | Date>` for
 * substitution; other shapes are JSON-stringified so the message renders
 * something readable instead of `[object Object]`.
 */
const normalizeVariables = (
  variables: EmailTemplateVariables,
): Record<string, string | number | boolean | Date> => {
  const out: Record<string, string | number | boolean | Date> = {}
  for (const [key, value] of Object.entries(variables)) {
    if (value == null) {
      out[key] = ''
      continue
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    ) {
      out[key] = value
      continue
    }
    try {
      out[key] = JSON.stringify(value)
    } catch {
      out[key] = String(value)
    }
  }
  return out
}
