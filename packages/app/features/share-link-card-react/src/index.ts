/**
 * Share-link card with URL, copy button, optional QR slot, password toggle.
 *
 * Exports `<ShareLinkCard>`.
 *
 * @example
 * ```tsx
 * import { ShareLinkCard } from '@molecule/app-share-link-card-react'
 *
 * export function SharePanel() {
 *   const [passwordEnabled, setPasswordEnabled] = React.useState(false)
 *   return (
 *     <ShareLinkCard
 *       title="Share this project"
 *       description="Anyone with the link can view."
 *       url="https://app.example.com/p/abc123"
 *       passwordProtect={{ enabled: passwordEnabled, onChange: setPasswordEnabled }}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './ShareLinkCard.js'
