/**
 * Vue framework bindings for molecule.dev.
 *
 * Provides Vue-specific composables and plugins for all molecule
 * core interfaces. This package enables the use of molecule's framework-agnostic
 * interfaces with Vue's idioms (Composition API, provide/inject, etc.).
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { moleculePlugin, useAuth, useTheme, useStore } from '@molecule/app-vue'
 * import { provider as stateProvider } from '@molecule/app-state-pinia'
 *
 * // Setup plugin
 * const app = createApp(App)
 * app.use(moleculePlugin, {
 *   state: stateProvider,
 *   auth: authClient,
 *   theme: themeProvider,
 * })
 * app.mount('#app')
 *
 * // Use composables in components
 * // <script setup>
 * import { useAuth, useTheme, useStore } from '@molecule/app-vue'
 *
 * const { user, logout } = useAuth()
 * const { theme, toggleTheme } = useTheme()
 * const count = useStore(counterStore)
 * // </script>
 * ```
 *
 * @module
 */

export * from './composables/index.js'
export * from './injection-keys.js'
export * from './plugin.js'
export * from './types.js'
