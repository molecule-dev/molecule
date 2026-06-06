/**
 * Vault-style secret / credential row.
 *
 * Exports `<SecretRow>` and `SecretRowData` type.
 *
 * @example
 * ```tsx
 * import { SecretRow } from '@molecule/app-secret-row-react'
 *
 * <SecretRow
 *   secret={{
 *     id: 'sk-1',
 *     key: 'STRIPE_SECRET_KEY',
 *     value: 'sk_live_abc123',
 *     description: 'Stripe API key',
 *     daysUntilRotation: 14,
 *   }}
 *   onRotate={(s) => rotateSecret(s.id)}
 *   onDelete={(s) => deleteSecret(s.id)}
 * />
 * ```
 *
 * @module
 */

export * from './SecretRow.js'
