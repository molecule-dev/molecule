/**
 * `@molecule/app-i18n-default-react` — renamed to `@molecule/app-i18n-default`.
 *
 * The default i18n setup never used React. `@molecule/app-i18n-default` is the
 * same code under a framework-neutral name, and React, Vue, Svelte, Solid and
 * Angular apps all use it. This package re-exports it unchanged, so an app that
 * installs this name keeps working.
 *
 * @example
 * ```typescript
 * // Before
 * import { setupI18nDefault } from '@molecule/app-i18n-default-react'
 * // After
 * import { setupI18nDefault } from '@molecule/app-i18n-default'
 * ```
 *
 * @deprecated Import from `@molecule/app-i18n-default` instead.
 * @module
 */

export * from '@molecule/app-i18n-default'
