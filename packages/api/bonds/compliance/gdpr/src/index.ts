/**
 * GDPR compliance provider for molecule.dev.
 *
 * Implements the `ComplianceProvider` interface with in-memory storage
 * for consent records, processing logs, and data export/deletion.
 * Supports configurable data collectors, legal obligation retention,
 * and data category filtering for GDPR Article 15–20 compliance.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, exportUserData, deleteUserData, getConsent, setConsent } from '@molecule/api-compliance'
 * import { provider } from '@molecule/api-compliance-gdpr'
 *
 * // Wire the provider at startup (default config)
 * setProvider(provider)
 *
 * // Or create with custom config
 * import { createProvider } from '@molecule/api-compliance-gdpr'
 * const customProvider = createProvider({
 *   retentionDays: 730,
 *   legalObligationCategories: ['billing', 'authentication'],
 * })
 * setProvider(customProvider)
 * ```
 */

export * from './provider.js'
export * from './types.js'
