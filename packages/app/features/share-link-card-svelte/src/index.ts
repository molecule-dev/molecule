/**
 * Svelte share-link card.
 *
 * Exports `<ShareLinkCard>` — a read-only URL field with a copy button, an
 * optional title/description header, a QR slot, and an optional
 * password-protect toggle. It is the Svelte counterpart of
 * `@molecule/app-share-link-card-react`: the same props (React names), the
 * same DOM for the same input, the same ClassMap tokens and i18n keys.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { ShareLinkCard } from '@molecule/app-share-link-card-svelte'
 *
 *   setMoleculeContext({ i18n: i18nProvider })
 *
 *   let passwordEnabled = $state(false)
 * </script>
 *
 * <ShareLinkCard
 *   url="https://app.example.com/p/abc123"
 *   passwordProtect={{
 *     enabled: passwordEnabled,
 *     onChange: (enabled) => (passwordEnabled = enabled),
 *   }}
 * >
 *   {#snippet title()}Share this project{/snippet}
 *   {#snippet description()}Anyone with the link can view.{/snippet}
 * </ShareLinkCard>
 * ```
 *
 * @remarks
 * - QR rendering is slot-based: pass BOTH `qr` (a snippet) and `showQR` —
 *   `qr` alone renders nothing.
 * - The title, description and password label are snippet slots (the password
 *   label also accepts a plain string).
 * - Copy goes through `copyTextWithFallback()` from `@molecule/app-clipboard`:
 *   the bonded clipboard provider first, then the legacy copy command. The
 *   "Copied!" feedback appears only when a copy actually happened — copy never
 *   throws, so a blocked clipboard leaves the label unchanged.
 * - The password toggle is UI-only: persisting and enforcing the password is
 *   the app/server's job.
 * - Requires a bonded ClassMap (e.g. `@molecule/app-ui-tailwind`) and the
 *   bonded i18n provider. Translations: `@molecule/app-locales-share-link-card`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
