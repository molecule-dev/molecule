/**
 * Handlebars implementation of TemplateProvider.
 *
 * Uses the Handlebars template engine for rendering templates with
 * Mustache-compatible syntax, helpers, and partials.
 *
 * @module
 */

import Handlebars from 'handlebars'

import type { CompiledTemplate, RenderOptions, TemplateHelper, TemplateProvider } from '@molecule/api-templating'

import type { HandlebarsTemplateConfig } from './types.js'

/** Counter for generating unique compiled template IDs. */
let compiledIdCounter = 0

/**
 * Creates a Handlebars template provider.
 *
 * @param config - Provider configuration.
 * @returns A `TemplateProvider` backed by Handlebars.
 */
export const createProvider = (config: HandlebarsTemplateConfig = {}): TemplateProvider => {
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

  return {
    async render(
      template: string,
      data: Record<string, unknown>,
      options?: RenderOptions,
    ): Promise<string> {
      const localEnv = createLocalEnv(env, options)
      const noEscape = options?.escape === false || (options?.escape === undefined && config.escape === false)
      const compiled = localEnv.compile(template, { noEscape })
      return compiled(data)
    },

    async compile(template: string): Promise<CompiledTemplate> {
      const noEscape = config.escape === false
      const compiled = env.compile(template, { noEscape })
      compiledIdCounter += 1
      return {
        id: `hbs-${String(compiledIdCounter)}`,
        source: template,
        compiled,
      }
    },

    renderCompiled(compiled: CompiledTemplate, data: Record<string, unknown>): string {
      const fn = compiled.compiled as Handlebars.TemplateDelegate
      return fn(data)
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
 * Creates a child Handlebars environment with per-render helpers and partials.
 *
 * @param parent - The parent Handlebars environment.
 * @param options - Render options containing additional helpers/partials.
 * @returns A Handlebars environment with merged helpers and partials.
 */
const createLocalEnv = (
  parent: typeof Handlebars,
  options?: RenderOptions,
): typeof Handlebars => {
  if (!options?.helpers && !options?.partials) {
    return parent
  }

  const local = Handlebars.create()

  // Copy parent helpers and partials
  const parentHelpers = (parent as unknown as { helpers: Record<string, Handlebars.HelperDelegate> }).helpers
  const parentPartials = (parent as unknown as { partials: Record<string, Handlebars.Template> }).partials

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
 * The provider implementation with default configuration.
 */
export const provider: TemplateProvider = createProvider()
