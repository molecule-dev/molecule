/**
 * React-compatible inline style serialization and DOM updates for web UI kits.
 *
 * Serialize React-shaped style objects for HTML attributes with `reactStyleText`.
 * Use `toStyleProps` when a renderer takes CSS property names and string values.
 * Use `bindInlineStyle` to update an element's styles without replacing its entire
 * style attribute.
 *
 * @example
 * ```ts
 * import { bindInlineStyle, reactStyleText } from '@molecule/app-inline-style-dom'
 *
 * const style = { marginTop: 8, opacity: 0.5, '--accentHue': 280 }
 * const attribute = reactStyleText(style)
 * const element = document.querySelector<HTMLElement>('[data-mol-id="preview"]')
 * if (element) {
 *   const binding = bindInlineStyle(element, style)
 *   binding.update({ marginTop: 0, opacity: 1 })
 * }
 * ```
 *
 * @module
 */

export * from './style.js'
