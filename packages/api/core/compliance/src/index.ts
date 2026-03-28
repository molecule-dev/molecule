/**
 * Compliance core interface for molecule.dev.
 *
 * Provides the `ComplianceProvider` interface for GDPR and data compliance
 * operations including user data export, deletion, consent management,
 * and data processing logs. Bond a concrete provider
 * (e.g. `@molecule/api-compliance-gdpr`) at startup via `setProvider()`.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, exportUserData, deleteUserData, getConsent, setConsent } from '@molecule/api-compliance'
 * import { provider } from '@molecule/api-compliance-gdpr'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Export user data for a data portability request
 * const exportData = await exportUserData('user-123', 'json')
 *
 * // Handle a deletion request (right to erasure)
 * const result = await deleteUserData('user-123', { retainLegalObligations: true })
 *
 * // Manage user consent
 * await setConsent('user-123', { purpose: 'marketing', granted: false })
 * const consent = await getConsent('user-123')
 * ```
 */

export * from './provider.js'
export * from './types.js'
