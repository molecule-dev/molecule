/**
 * `@molecule/app-auth-brand-header-react` — auth-page brand header
 * (gradient material-symbol chip + wordmark + tagline). Replaces 41
 * byte-unique fleet copies.
 *
 * @example
 * ```tsx
 * import { AuthBrandHeader } from '@molecule/app-auth-brand-header-react'
 * import { APP_NAME, APP_TAGLINE } from '../branding.js'
 *
 * export function MyAuthHeader() {
 *   return (
 *     <AuthBrandHeader
 *       appName={APP_NAME}
 *       tagline={APP_TAGLINE}
 *       icon="gavel"
 *       chipGradient="linear-gradient(135deg, #e05a2b, #f06a3b)"
 *       wordmarkColor="#e05a2b"
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './AuthBrandHeader.js'
