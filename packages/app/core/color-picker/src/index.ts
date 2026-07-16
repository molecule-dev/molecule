/**
 * Color picker core interface for molecule.dev.
 *
 * Framework-agnostic contract for color selection **state** (current value,
 * format, alpha, presets). Bond a provider (e.g.
 * `@molecule/app-color-picker-default`) to supply the logic; your UI renders
 * the picker and feeds interactions into the instance.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/app-color-picker'
 * import { provider } from '@molecule/app-color-picker-default'
 *
 * setProvider(provider)                    // once, at app startup (bonds.ts)
 *
 * const picker = requireProvider().createPicker({
 *   value: '#3498db',
 *   format: 'hex',
 *   showAlpha: true,
 *   onChange: (color) => applyBrandColor(color),
 * })
 * ```
 *
 * @remarks
 * - **The instance is headless — it renders nothing.** Pair it with your
 *   framework's picker component (React: `@molecule/app-color-picker-react`) or
 *   render your own swatches/inputs (styled via `getClassMap()`/`cm.*`, labels via
 *   `t('key', values, { defaultValue })`) and call the instance methods; `onChange`
 *   fires when the value changes.
 * - **Wire with `setProvider()` from THIS package, not `bond('color-picker', …)`.**
 *   The singleton is module-local; a generic app-bond registration is not seen and
 *   `requireProvider()` will still throw.
 * - Treat the emitted color as an app data value — do not hardcode it into CSS or
 *   theme files; persist it and apply through your theme/branding layer.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
