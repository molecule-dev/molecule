/**
 * `@molecule/app-bonds-default-react` — default app-side bond wirings.
 *
 * 5 setup functions consolidating the byte-identical per-app bond
 * wiring files (fonts-arimo, icons-molecule, routing-react-router,
 * storage-localstorage, styling-tailwind). Each app's
 * `app/src/bonds/<name>.ts` becomes a 1-line re-export:
 *
 * ```ts
 * // app/src/bonds/app-fonts-arimo.ts is a 1-line re-export:
 * //   export { setupAppFontsArimo } from '@molecule/app-bonds-default-react'
 * // so the existing bonds/index.ts call site keeps working unchanged:
 * import { setupAppFontsArimo } from '@molecule/app-bonds-default-react'
 *
 * setupAppFontsArimo()
 * ```
 *
 * @example
 * ```tsx
 * import { bootstrapApp, setupAllDefaultBonds } from '@molecule/app-bonds-default-react'
 * import { createDefaultAuthClient } from '@molecule/app-bonds-default-react'
 * import { App } from './App.js'
 * import { authConfig } from './config.js'
 *
 * const { authClient, setupAuthDefault } = createDefaultAuthClient(authConfig)
 *
 * bootstrapApp({
 *   App,
 *   authClient,
 *   setupProviders: () => { setupAllDefaultBonds(); setupAuthDefault() },
 * })
 * ```
 *
 * @module
 */

export * from './auth.js'
export * from './bootstrap.js'
export * from './setup.js'
