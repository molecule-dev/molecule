/**
 * MJML email template provider for molecule.dev.
 *
 * Implements the `TemplateProvider` interface using MJML for responsive email
 * template rendering. Variable interpolation uses Handlebars syntax. Templates
 * are first interpolated with data, then compiled from MJML to responsive HTML
 * that works across all major email clients.
 *
 * @example
 * ```typescript
 * import { setProvider, render } from '@molecule/api-templating'
 * import { provider } from '@molecule/api-templating-mjml'
 *
 * setProvider(provider)
 *
 * const html = await render(`
 *   <mjml>
 *     <mj-body>
 *       <mj-section>
 *         <mj-column>
 *           <mj-text>Hello {{name}}!</mj-text>
 *         </mj-column>
 *       </mj-section>
 *     </mj-body>
 *   </mjml>
 * `, { name: 'World' })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
