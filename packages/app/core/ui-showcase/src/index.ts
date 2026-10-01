/**
 * Component showcase specifications for cross-framework visual regression testing.
 *
 * Provides framework-agnostic data describing which components to render
 * and which prop combinations to test. Used by showcase templates in mlcl
 * to generate minimal apps per framework, then screenshotted by Playwright.
 *
 * @example
 * ```typescript
 * import { generateCombinations, showcaseComponents } from '@molecule/app-ui-showcase'
 *
 * const spec = showcaseComponents[0]   // e.g. Button — variant × color × size
 * const variants = generateCombinations(spec.propMatrix)
 * // a showcase app maps spec.name to the framework's UI export and renders
 * // one instance per variant, applying spec.defaultProps + spec.children
 * ```
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './utils.js'
