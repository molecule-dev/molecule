/**
 * React auth-kit components for molecule.dev.
 *
 * Reusable pieces of the auth flow (OAuth button row, etc.) designed
 * for apps to compose into their own branded Login/Signup pages.
 * Structural pieces only — branded layouts, copy, and wrapping chrome
 * stay at the app level.
 *
 * @example
 * ```tsx
 * import { OAuthButtons } from '@molecule/app-auth-ui-react'
 * import { oauthConfig } from './config.js'
 *
 * <OAuthButtons
 *   oauthConfig={oauthConfig}
 *   iconSize={28}
 *   showLabels={true}
 * />
 * ```
 *
 * @module
 */

export * from './OAuthButtons.js'
