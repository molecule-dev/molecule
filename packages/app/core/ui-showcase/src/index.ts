/**
 * Component showcase specifications for cross-framework visual regression testing.
 *
 * Provides framework-agnostic data describing which components to render
 * and which prop combinations to test. Used by showcase templates in mlcl
 * to generate minimal apps per framework, then screenshotted by Playwright.
 *
 * @module
 */

export { showcaseComponents } from './components.js'
export type { ComponentShowcase } from './types.js'
export { generateCombinations } from './utils.js'
