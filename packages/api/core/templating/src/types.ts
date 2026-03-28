/**
 * Type definitions for the templating core interface.
 *
 * @module
 */

/**
 * A compiled template that can be rendered multiple times with different data
 * without re-parsing.
 */
export interface CompiledTemplate {
  /** An opaque identifier for the compiled template. */
  id: string

  /** The original template source string. */
  source: string

  /**
   * Provider-specific compiled representation.
   * This is intentionally opaque — callers use `renderCompiled()` to render.
   */
  compiled: unknown
}

/**
 * A template helper function registered with the template engine.
 * Receives arguments from the template and returns a string.
 */
export type TemplateHelper = (...args: unknown[]) => string

/**
 * Configuration options for template rendering.
 */
export interface RenderOptions {
  /** Whether to HTML-escape output by default. Defaults to `true`. */
  escape?: boolean

  /** Additional helpers available during rendering. */
  helpers?: Record<string, TemplateHelper>

  /** Additional partials available during rendering. */
  partials?: Record<string, string>
}

/**
 * Template provider interface.
 *
 * All template providers must implement this interface. Bond packages
 * (Handlebars, MJML, Liquid, etc.) provide concrete implementations.
 */
export interface TemplateProvider {
  /**
   * Renders a template string with the provided data.
   *
   * @param template - The template source string.
   * @param data - Key-value pairs to inject into the template.
   * @param options - Optional rendering configuration.
   * @returns The rendered output string.
   */
  render(template: string, data: Record<string, unknown>, options?: RenderOptions): Promise<string>

  /**
   * Pre-compiles a template for repeated rendering. Use this when the same
   * template will be rendered multiple times with different data.
   *
   * @param template - The template source string.
   * @returns A compiled template object.
   */
  compile(template: string): Promise<CompiledTemplate>

  /**
   * Renders a previously compiled template with the provided data.
   * This is faster than `render()` for templates used multiple times.
   *
   * @param compiled - A compiled template from `compile()`.
   * @param data - Key-value pairs to inject into the template.
   * @returns The rendered output string.
   */
  renderCompiled(compiled: CompiledTemplate, data: Record<string, unknown>): string

  /**
   * Registers a named helper function available in all templates.
   *
   * @param name - The helper name used in templates (e.g., `{{uppercase name}}`).
   * @param fn - The helper implementation.
   */
  registerHelper(name: string, fn: TemplateHelper): void

  /**
   * Registers a named partial template that can be included in other templates.
   *
   * @param name - The partial name used in templates (e.g., `{{> header}}`).
   * @param template - The partial template source string.
   */
  registerPartial(name: string, template: string): void
}

/**
 * Configuration options for template providers.
 */
export interface TemplateConfig {
  /** Whether to HTML-escape output by default. Defaults to `true`. */
  escape?: boolean

  /** Directory path to load template files from. */
  templateDir?: string

  /** File extension for template files (e.g., `'.hbs'`, `'.mjml'`). */
  fileExtension?: string
}
