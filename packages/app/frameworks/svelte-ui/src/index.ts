/**
 * Svelte UI class generators for molecule.dev.
 *
 * Unlike the React and Vue packages, which export framework components, this
 * package exports pure TypeScript CLASS GENERATORS (plus variant maps and
 * helpers like `cn` and `getIconData`) that your own Svelte components call to
 * produce UIClassMap-resolved class strings: `getButtonClasses`,
 * `getCardClasses`, `getModalContentClasses`, `getInputClasses`, and one
 * generator family per `@molecule/app-ui` component interface.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setClassMap } from '@molecule/app-ui'
 *   import { classMap } from '@molecule/app-ui-tailwind'
 *   import { getButtonClasses } from '@molecule/app-ui-svelte'
 *
 *   // Once at app startup (root layout), before anything renders:
 *   setClassMap(classMap)
 *
 *   export let variant: 'solid' | 'outline' = 'solid'
 *   $: classes = getButtonClasses({ variant, color: 'primary', size: 'md' })
 * </script>
 *
 * <button class={classes} on:click><slot /></button>
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before the first generator call** — every generator resolves
 *   through `getClassMap()` from `@molecule/app-ui`, which THROWS until a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) is set. Do it in the root layout's module context or first
 *   component script.
 * - Recompute reactively: wrap generator calls in `$:` (or `$derived` in runes mode) so class
 *   strings update when props change — a plain `const` computes once.
 * - There are no prebuilt Svelte components here; per-component usage recipes are on each
 *   generator's docs below.
 *
 * @module
 */

export * from './components/index.js'
export * from './types.js'
export * from './utilities.js'
export * from './utilities/index.js'
