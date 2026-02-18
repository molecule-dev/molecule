/**
 * Runtime provider wiring system for molecule.dev app-side packages.
 *
 * Enables swappable providers for state management, theming, routing, styling,
 * and any custom category — all through dynamic string-based keys.
 *
 * @example
 * ```typescript
 * import { bond, get, require as bondRequire, isBonded } from '@molecule/app-bond'
 *
 * // Singleton providers
 * bond('state', zustandProvider)
 * bond('theme', cssVariablesProvider)
 *
 * // Named providers
 * bond('routing', 'react', reactRouterProvider)
 * bond('oauth', 'github', githubOAuthProvider)
 *
 * // Retrieve providers
 * const state = get<StateProvider>('state')
 * const router = get<RoutingProvider>('routing', 'react')
 * const theme = bondRequire<ThemeProvider>('theme')  // throws if not bonded
 *
 * // Check before using
 * if (isBonded('analytics')) {
 *   const analytics = get<AnalyticsProvider>('analytics')
 * }
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Registry exports
export * from './registry.js'

// Bond API exports
export * from './bond.js'
