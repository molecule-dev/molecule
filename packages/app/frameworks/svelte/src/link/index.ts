/**
 * `Link`: an in-app anchor for Svelte, the counterpart of react-router's `<Link>`.
 *
 * Use it for every internal link instead of an anchor with a click handler that
 * calls `navigate()`. It reads the router from `setMoleculeContext`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { Link } from '@molecule/app-svelte'
 * </script>
 *
 * <nav>
 *   <Link to="/projects" class="nav-link">Projects</Link>
 *   <Link to="/login" replace state={{ from: '/projects' }}>Log in</Link>
 * </nav>
 * ```
 *
 * @module
 */

export { default as Link } from './Link.svelte'
export * from './types.js'
