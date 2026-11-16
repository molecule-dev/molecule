/**
 * Social share buttons row.
 *
 * Exports `<SocialShareButtons>` — Twitter(X)/LinkedIn/Facebook/Reddit/
 * email/copy button group, plus the `SocialPlatform` union. Each network
 * button opens that platform's share URL in a new tab; `'copy'` writes
 * the URL to the clipboard with "Copied!" feedback. `'x'` is an alias
 * of `'twitter'` (same intent URL). Default platforms:
 * twitter, linkedin, facebook, copy.
 *
 * @example
 * ```tsx
 * import { SocialShareButtons } from '@molecule/app-social-share-buttons-react'
 *
 * <SocialShareButtons
 *   url="https://example.com/blog/my-post"
 *   title="Check out this article"
 *   platforms={['twitter', 'linkedin', 'reddit', 'email', 'copy']}
 *   size="sm"
 * />
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - `'copy'` copies through `@molecule/app-clipboard`'s
 *   `copyTextWithFallback()` — the Clipboard API where available, then
 *   the legacy copy command — so it also works on plain HTTP and in
 *   iframes where `navigator.clipboard` is missing or refuses the
 *   write. When no copy happens the button stays unchanged.
 * - Sharing uses fixed platform intent URLs opened in a new tab; there
 *   is no Web Share API integration and no per-platform SDKs.
 * - Button icons are plain text glyphs (𝕏, "in", "f", ✉, ⧉), not brand
 *   SVG logos — restyle via `className` if brand marks are required.
 * - Every key ships in the companion locale bond: `share.copied` plus one
 *   literal `share.<platform>` key per platform, whose English text is the
 *   platform's name (Twitter, LinkedIn, Email, Copy, …).
 *
 * @module
 */

export * from './SocialShareButtons.js'
