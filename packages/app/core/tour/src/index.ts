/**
 * Tour core interface for molecule.dev.
 *
 * Provides a standardized API for onboarding walkthrough and guided
 * tour UI components. Bond a provider (e.g. `@molecule/app-tour-shepherd`)
 * to supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-tour'
 *
 * const tour = requireProvider().createTour({
 *   steps: [
 *     { target: '#welcome', title: 'Welcome', content: 'Get started here' },
 *     { target: '#editor', title: 'Editor', content: 'Write your code' },
 *   ],
 *   onComplete: () => console.log('Tour finished'),
 * })
 * tour.start()
 * ```
 */

export * from './provider.js'
export * from './types.js'
