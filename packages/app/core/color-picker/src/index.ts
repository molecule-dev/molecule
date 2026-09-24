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
 * import { requireProvider, setProvider } from '@molecule/app-color-picker'
 * import { provider } from '@molecule/app-color-picker-default'
 *
 * setProvider(provider) // once, at app startup (bonds.ts)
 *
 * // Persist the chosen color as app data (e.g. PATCH the workspace's brand color).
 * let brandColor = '#3498db'
 * const picker = requireProvider().createPicker({
 *   value: brandColor,
 *   format: 'hex',
 *   presets: ['#3498db', '#e74c3c', '#2ecc71'],
 *   onChange: (color) => {
 *     brandColor = color
 *   },
 * })
 *
 * // Headless: your swatch's click handler feeds the pick into the instance.
 * const onSwatchClick = (color: string): void => picker.setValue(color)
 * onSwatchClick('#e74c3c')
 * console.log(picker.getValue(), brandColor) // '#e74c3c' '#e74c3c'
 *
 * picker.destroy() // on unmount
 * ```
 *
 * @remarks
 * - **The instance is headless — it renders nothing.** Pair it with your
 *   framework's picker component (React: `@molecule/app-color-picker-react`) or
 *   render your own swatches/inputs (styled via `getClassMap()`/`cm.*`, labels via
 *   `t('key', values, { defaultValue })`) and call the instance methods; `onChange`
 *   fires when the value changes.
 * - **Wire with THIS package's `setProvider()` or `bond('color-picker', …)`.**
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
 *   write the same slot; `requireProvider()` throws until one has run.
 * - **The default bond does NOT validate or convert colors.** `setValue()` stores
 *   the string as-is and `setFormat()` only changes what `getFormat()` reports — it
 *   does not rewrite the current value. Validate/normalize user-typed input yourself
 *   before calling `setValue()`. `onChange` fires only from `setValue()`.
 * - Treat the emitted color as an app data value — do not hardcode it into CSS or
 *   theme files; persist it and apply through your theme/branding layer.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Picking a color through the app's swatches/sliders/input updates the
 *   instance: getValue() returns the new color and the string the app shows
 *   matches what was picked, in the configured `format` (hex/rgb/hsl).
 * - [ ] onChange fires with the new value on every change, and the consumer
 *   the picker drives (the element whose color the onChange value applies to)
 *   reflects the new color LIVE in the preview — not just the swatch UI.
 * - [ ] The displayed value is in the active format: a picker with
 *   `format: 'rgb'` shows `rgb(...)`, `'hex'` shows `#...`; getValue() and the
 *   display agree, and after setFormat() getFormat() reports the new format.
 * - [ ] With `showAlpha: true`, changing opacity is reflected in the emitted
 *   value (getValue()/onChange include the alpha channel, e.g. rgba/8-digit
 *   hex); with showAlpha false there is no opacity control and the value stays
 *   fully opaque.
 * - [ ] Selecting one of the `presets` swatches sets exactly that color —
 *   getValue() equals the preset string and onChange fires with it.
 * - [ ] setValue() called programmatically updates BOTH the control (active
 *   swatch/sliders/input) and the displayed string, and onChange reflects it.
 * - [ ] The app's clear/reset control returns the value to the default the
 *   picker was created with (its initial `value`), reflected in both the
 *   control and the display.
 * - [ ] An invalid manual entry in the `showInput` text field is rejected or
 *   normalized — never emitted as a broken value; getValue()/onChange only
 *   ever produce a valid color in the configured format.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
