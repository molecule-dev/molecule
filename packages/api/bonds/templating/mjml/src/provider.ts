/**
 * MJML implementation of TemplateProvider.
 *
 * Uses MJML for rendering responsive email templates. Variable interpolation
 * is handled with Handlebars syntax (`{{variable}}`). Templates are first
 * interpolated with data, then compiled from MJML to responsive HTML.
 *
 * @module
 */

import Handlebars from 'handlebars'
import mjml2html from 'mjml'

import type {
  CompiledTemplate,
  RenderOptions,
  TemplateHelper,
  TemplateProvider,
} from '@molecule/api-templating'

import type { MjmlTemplateConfig } from './types.js'

/** Counter for generating unique compiled template IDs. */
let compiledIdCounter = 0

/**
 * Creates an MJML template provider.
 *
 * @param config - Provider configuration.
 * @returns A `TemplateProvider` backed by MJML with Handlebars interpolation.
 */
export const createProvider = (config: MjmlTemplateConfig = {}): TemplateProvider => {
  const env = Handlebars.create()

  if (config.helpers) {
    for (const [name, fn] of Object.entries(config.helpers)) {
      env.registerHelper(name, fn)
    }
  }

  if (config.partials) {
    for (const [name, partial] of Object.entries(config.partials)) {
      env.registerPartial(name, partial)
    }
  }

  const mjmlOptions = {
    validationLevel: config.validationLevel ?? 'soft',
    minify: config.minify ?? false,
    beautify: config.beautify ?? false,
    filePath: config.filePath,
  }

  /**
   * Interpolates variables in a template string using Handlebars, then
   * converts the resulting MJML to responsive HTML.
   *
   * @param mjmlSource - The MJML template source string with Handlebars syntax.
   * @param data - Key-value pairs to inject into the template.
   * @param options - Optional rendering configuration.
   * @returns The rendered responsive HTML string.
   */
  const renderMjml = (
    mjmlSource: string,
    data: Record<string, unknown>,
    options?: RenderOptions,
  ): string => {
    const localEnv = applyLocalOptions(env, options)
    const noEscape = options?.escape === false
    const interpolated = localEnv.compile(mjmlSource, { noEscape })(data)
    const result = mjml2html(interpolated, mjmlOptions)

    if (result.errors?.length && mjmlOptions.validationLevel === 'strict') {
      throw new Error(
        `MJML validation errors: ${result.errors.map((error) => error.formattedMessage).join('; ')}`,
      )
    }

    return result.html
  }

  return {
    async render(
      template: string,
      data: Record<string, unknown>,
      options?: RenderOptions,
    ): Promise<string> {
      return renderMjml(template, data, options)
    },

    async compile(template: string): Promise<CompiledTemplate> {
      compiledIdCounter += 1
      return {
        id: `mjml-${String(compiledIdCounter)}`,
        source: template,
        compiled: env.compile(template, { noEscape: false }),
      }
    },

    renderCompiled(compiled: CompiledTemplate, data: Record<string, unknown>): string {
      const fn = compiled.compiled as Handlebars.TemplateDelegate
      const interpolated = fn(data)
      const result = mjml2html(interpolated, mjmlOptions)
      return result.html
    },

    registerHelper(name: string, fn: TemplateHelper): void {
      env.registerHelper(name, fn)
    },

    registerPartial(name: string, template: string): void {
      env.registerPartial(name, template)
    },
  }
}

/**
 * Applies per-render helpers and partials to a Handlebars environment.
 *
 * @param parent - The parent Handlebars environment.
 * @param options - Render options containing additional helpers/partials.
 * @returns A Handlebars environment with merged options.
 */
const applyLocalOptions = (
  parent: typeof Handlebars,
  options?: RenderOptions,
): typeof Handlebars => {
  if (!options?.helpers && !options?.partials) {
    return parent
  }

  const local = Handlebars.create()

  const parentHelpers = (
    parent as unknown as { helpers: Record<string, Handlebars.HelperDelegate> }
  ).helpers
  const parentPartials = (parent as unknown as { partials: Record<string, Handlebars.Template> })
    .partials

  for (const [name, helper] of Object.entries(parentHelpers)) {
    local.registerHelper(name, helper)
  }
  for (const [name, partial] of Object.entries(parentPartials)) {
    local.registerPartial(name, partial as string)
  }

  if (options.helpers) {
    for (const [name, fn] of Object.entries(options.helpers)) {
      local.registerHelper(name, fn)
    }
  }
  if (options.partials) {
    for (const [name, partial] of Object.entries(options.partials)) {
      local.registerPartial(name, partial)
    }
  }

  return local
}

/**
 * The provider implementation with default configuration (soft validation).
 */
export const provider: TemplateProvider = createProvider()
