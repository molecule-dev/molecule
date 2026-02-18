/**
 * Vue Router provider for `@molecule/app-routing`.
 *
 * This package provides a Vue Router implementation of the molecule Router interface,
 * allowing you to use molecule's routing abstractions with Vue Router.
 *
 * @module `@molecule/app-routing-vue-router`
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useMoleculeRouter, useLocation } from '@molecule/app-routing-vue-router'
 *
 * const router = useMoleculeRouter()
 * const location = useLocation()
 *
 * function navigateToProfile() {
 *   router.value.navigate('/profile')
 * }
 * </script>
 *
 * <template>
 *   <div>
 *     <p>Current path: {{ location.pathname }}</p>
 *     <button @click="navigateToProfile">Go to Profile</button>
 *   </div>
 * </template>
 * ```
 */

export * from './composables.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
