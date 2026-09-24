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
 * ```typescript
 * // src/lib/ui.ts — class strings for your own Svelte components.
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Bond the ClassMap BEFORE this package is first imported — it resolves some classes at import time.
 * setClassMap(classMap)
 * const { getButtonClasses, getCardClasses, getInputClasses } = await import('@molecule/app-ui-svelte')
 *
 * export const cardClass = getCardClasses({ variant: 'outlined', padding: 'lg' })
 * export const saveButtonClass = getButtonClasses({ color: 'primary', fullWidth: true })
 * export function nameInputClass(error?: string): string {
 *   return getInputClasses({ size: 'md', error })
 * }
 *
 * // In a component:
 * // <div class={cardClass}>
 * //   <input class={nameInputClass(errors.name)} bind:value={name} />
 * //   <button class={saveButtonClass} onclick={save}>{$t('common.save')}</button>
 * // </div>
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before this package is even IMPORTED**, not just before the first
 *   generator call. Every generator resolves through `getClassMap()` from `@molecule/app-ui`,
 *   which THROWS until a ClassMap bond (e.g. `@molecule/app-ui-tailwind`) is set — and ~35
 *   exported constants (`inputWrapperClass`, `cardPaddingMap`, `alertDismissClass`, …) call it at
 *   module load. A static `import { getButtonClasses } from '@molecule/app-ui-svelte'` in the same
 *   file as `setClassMap()` is hoisted above it and throws "No UIClassMap has been set". Bond in a
 *   module evaluated first (e.g. a `bonds.ts` imported at the top of `main.ts`), or `await
 *   import()` this package after bonding as above. Those constants never pick up a later
 *   `setClassMap()` — prefer the `get*Class*()` functions.
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
