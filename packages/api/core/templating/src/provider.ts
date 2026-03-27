/**
 * Template provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-templating-handlebars`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  CompiledTemplate,
  RenderOptions,
  TemplateHelper,
  TemplateProvider,
} from './types.js'

const BOND_TYPE = 'templating'
expectBond(BOND_TYPE)

/**
 * Registers a template provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The template provider implementation to bond.
 */
export const setProvider = (provider: TemplateProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded template provider, throwing if none is configured.
 *
 * @returns The bonded template provider.
 * @throws {Error} If no template provider has been bonded.
 */
export const getProvider = (): TemplateProvider => {
  try {
    return bondRequire<TemplateProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('templating.error.noProvider', undefined, {
        defaultValue: 'Template provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a template provider is currently bonded.
 *
 * @returns `true` if a template provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Renders a template string with the provided data.
 *
 * @param template - The template source string.
 * @param data - Key-value pairs to inject into the template.
 * @param options - Optional rendering configuration.
 * @returns The rendered output string.
 * @throws {Error} If no template provider has been bonded.
 */
export const render = async (
  template: string,
  data: Record<string, unknown>,
  options?: RenderOptions,
): Promise<string> => {
  return getProvider().render(template, data, options)
}

/**
 * Pre-compiles a template for repeated rendering.
 *
 * @param template - The template source string.
 * @returns A compiled template object.
 * @throws {Error} If no template provider has been bonded.
 */
export const compile = async (template: string): Promise<CompiledTemplate> => {
  return getProvider().compile(template)
}

/**
 * Renders a previously compiled template with the provided data.
 *
 * @param compiled - A compiled template from `compile()`.
 * @param data - Key-value pairs to inject into the template.
 * @returns The rendered output string.
 * @throws {Error} If no template provider has been bonded.
 */
export const renderCompiled = (
  compiled: CompiledTemplate,
  data: Record<string, unknown>,
): string => {
  return getProvider().renderCompiled(compiled, data)
}

/**
 * Registers a named helper function available in all templates.
 *
 * @param name - The helper name used in templates.
 * @param fn - The helper implementation.
 * @throws {Error} If no template provider has been bonded.
 */
export const registerHelper = (name: string, fn: TemplateHelper): void => {
  getProvider().registerHelper(name, fn)
}

/**
 * Registers a named partial template that can be included in other templates.
 *
 * @param name - The partial name used in templates.
 * @param template - The partial template source string.
 * @throws {Error} If no template provider has been bonded.
 */
export const registerPartial = (name: string, template: string): void => {
  getProvider().registerPartial(name, template)
}
