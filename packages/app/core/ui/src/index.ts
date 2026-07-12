/**
 * UI component interfaces for molecule.dev.
 *
 * Provides standardized prop interfaces for common UI components
 * that can be implemented by different UI libraries (styled-components,
 * Tailwind, Ionic, etc.).
 *
 * @remarks
 * **Style through {@link getClassMap} — NEVER write raw CSS/Tailwind class names in a
 * component.** `const cm = getClassMap()` returns the resolver; use its helpers (`cm.flex`,
 * `cm.surface`, `cm.textSize(size)`, the component helpers like `cm.button`/`cm.card`, and
 * `cm.cn(...)` to compose) and pass the result to `className`. Class-name STRINGS live only in
 * the ClassMap bond (`@molecule/app-ui-tailwind`), so swapping the styling library touches
 * only the bond — a literal `"flex p-4"` in a component defeats that and is the #1 styling
 * mistake.
 *
 * - **Inline styles must not fight ClassMap.** An inline `style` has higher specificity and
 *   SILENTLY overrides the class controlling the same property (e.g. `style={{ background }}`
 *   kills `cm.surface`). Use inline only for what ClassMap can't express (a specific pixel
 *   width, an SVG attribute, a one-off accent color).
 * - **Check what a class resolves to before using it** — read the bond definition, don't guess
 *   a helper name or option value; an invalid `cm.*` value is a type error or a silent no-op.
 * - **Every interactive element needs a stable `data-mol-id`** — spread {@link molIdProps} (or
 *   set {@link MOL_ID_ATTR} via {@link molId}) so AI agents and tests can target it.
 *
 * @example
 * ```tsx
 * import { getClassMap, molIdProps } from '@molecule/app-ui'
 * const cm = getClassMap()
 *
 * <button
 *   className={cm.cn(cm.surface, cm.textSize('sm'))} // resolved classes — never a raw "px-3 text-sm"
 *   {...molIdProps('save-button')} // data-mol-id for agents/tests
 * >…</button>
 * ```
 *
 * @module
 */

export * from './automation.js'
export * from './components.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
