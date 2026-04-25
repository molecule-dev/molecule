/**
 * Module-level template registry.
 *
 * Apps register their own templates (or override built-ins) via `registerTemplate`
 * / `registerTemplates`. The registry is consulted first; if a key is missing,
 * the built-in defaults from `defaults.ts` are used as the fallback.
 *
 * The registry is a process-wide singleton. Tests should call `clearRegistry()`
 * to drop overrides between cases.
 *
 * @module
 */

import { defaultTemplates } from './defaults.js'
import type { EmailTemplate } from './types.js'

const overrides = new Map<string, EmailTemplate>()

/**
 * Register or override a single template. Subsequent calls with the same
 * `key` replace the previous registration.
 *
 * @param template - The template to register.
 */
export const registerTemplate = (template: EmailTemplate): void => {
  overrides.set(template.key, template)
}

/**
 * Register or override several templates in one call.
 *
 * @param templates - The templates to register.
 */
export const registerTemplates = (templates: EmailTemplate[]): void => {
  for (const template of templates) {
    overrides.set(template.key, template)
  }
}

/**
 * Look up a template by key. Returns the registered override if any, then
 * falls back to the built-in defaults, and finally returns `undefined` when
 * no template is known.
 *
 * @param key - The template key.
 * @returns The matching template, or `undefined` if unregistered.
 */
export const getTemplate = (key: string): EmailTemplate | undefined => {
  return overrides.get(key) ?? defaultTemplates[key]
}

/**
 * Drop every override. The built-in defaults remain available via `getTemplate`.
 * Intended for tests; production code should not need to call this.
 */
export const clearRegistry = (): void => {
  overrides.clear()
}

/**
 * Returns every template currently visible — overrides, then any built-in
 * defaults whose key wasn't overridden.
 *
 * @returns A snapshot of all available templates.
 */
export const listTemplates = (): EmailTemplate[] => {
  const seen = new Map<string, EmailTemplate>()
  for (const [key, template] of overrides) {
    seen.set(key, template)
  }
  for (const [key, template] of Object.entries(defaultTemplates)) {
    if (!seen.has(key)) seen.set(key, template)
  }
  return [...seen.values()]
}
