/**
 * The ESLint flat config every Molecule workspace runs, as one package.
 *
 * A workspace's `eslint.config.js` passes its own URL, so the config reads that workspace's
 * `package.json` (and `migrations/`) and switches its rules on from what it declares: React's
 * hook rules where React is a dependency, the query-cache rules where
 * `@molecule/app-query-react` is, the Vue and Svelte component rules where their ESLint
 * plugins are devDependencies, and the resource-table rule from the resource packages and
 * migrations it has. Every rule's plugin is this package's own dependency, so the workspace
 * declares one lint package and `eslint`.
 *
 * @example
 * ```js
 * // eslint.config.js
 * import { moleculeEslintConfig } from '@molecule/eslint-config'
 *
 * export default await moleculeEslintConfig(import.meta.url)
 * ```
 *
 * @example
 * ```js
 * // A project's own rules go after the shared ones.
 * import { moleculeEslintConfig } from '@molecule/eslint-config'
 *
 * export default [
 *   ...(await moleculeEslintConfig(import.meta.url)),
 *   { rules: { 'no-console': 'error' } },
 * ]
 * ```
 *
 * @example
 * ```js
 * // Another config that wants only the rules: register the plugin under its usual name.
 * import { moleculeLocalPlugin } from '@molecule/eslint-config'
 *
 * export default [
 *   {
 *     plugins: { 'molecule-local': moleculeLocalPlugin },
 *     rules: { 'molecule-local/require-catch-binding': 'error' },
 *   },
 * ]
 * ```
 *
 * @module
 */

export * from './config.mjs'
export * from './plugin.mjs'
