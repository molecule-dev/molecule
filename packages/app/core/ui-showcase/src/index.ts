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
 * // One render job per (component spec × prop combination) — a framework template renders each
 * // with the named export `component` from `@molecule/app-ui-{framework}`.
 * interface ShowcaseCase {
 *   component: string
 *   specIndex: number
 *   props: Record<string, unknown>
 *   children?: string
 * }
 *
 * const cases: ShowcaseCase[] = showcaseComponents.flatMap((spec, specIndex) =>
 *   generateCombinations(spec.propMatrix).map((combo) => ({
 *     component: spec.name,
 *     specIndex, // the same component appears in several specs — key screenshots by index
 *     props: { ...spec.defaultProps, ...combo }, // the matrix value wins over the default
 *     children: spec.children === false ? undefined : spec.children,
 *   })),
 * )
 *
 * const buttons = cases.filter((c) => c.component === 'Button')
 * console.log(buttons.length, buttons[0]?.props) // 120 { variant: 'solid', color: 'primary', size: 'xs' }
 * ```
 *
 * @remarks
 * - **This is visual-regression TEST DATA, not UI.** Nothing here renders; do not import it
 *   into an application to build screens — use `@molecule/app-ui-react` (or your framework's
 *   UI package) directly.
 * - `name` is a component EXPORT name (`'Button'`), not a ClassMap key; Svelte templates map
 *   it to `get{Name}Classes` and use `svelteElement` as the host tag.
 * - `generateCombinations({})` yields ONE empty combination (render once with defaults); an
 *   axis with an empty array yields ZERO combinations — the spec silently renders nothing.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './utils.js'
