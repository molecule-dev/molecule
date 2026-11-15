/**
 * Solid social share buttons row.
 *
 * Exports `SocialShareButtons` — the Solid counterpart of
 * `@molecule/app-social-share-buttons-react` with the same props (React names)
 * and the same DOM, plus the `SocialPlatform` union. Each network button opens
 * that platform's share URL in a new tab; `'copy'` writes the URL to the
 * clipboard with "Copied!" feedback. `'x'` is an alias of `'twitter'` (same
 * intent URL). Default platforms: twitter, linkedin, facebook, copy.
 *
 * @example
 * ```tsx
 * import { render } from 'solid-js/web'
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { SocialShareButtons } from '@molecule/app-social-share-buttons-solid'
 *
 * render(
 *   () => (
 *     <MoleculeProvider config={{ i18n: i18nProvider }}>
 *       <SocialShareButtons
 *         url="https://example.com/blog/my-post"
 *         title="Check out this article"
 *         platforms={['twitter', 'linkedin', 'reddit', 'email', 'copy']}
 *         size="sm"
 *       />
 *     </MoleculeProvider>,
 *   ),
 *   document.getElementById('root')!,
 * )
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond wired
 *   (`useTranslation()` / `getClassMap()` throw otherwise).
 * - `'copy'` uses `navigator.clipboard`, which exists only in secure contexts
 *   (HTTPS or localhost). On plain HTTP the button silently does nothing —
 *   hide it or serve over HTTPS.
 * - Sharing uses fixed platform intent URLs opened in a new tab; there is no
 *   Web Share API integration and no per-platform SDKs.
 * - Button icons are plain text glyphs (𝕏, "in", "f", ✉, ⧉), not brand SVG
 *   logos — restyle via `className` if brand marks are required.
 * - Only `share.copied` ships in the companion locale bond today; the
 *   per-platform `share.<platform>` aria-label keys fall back to the raw
 *   platform id in every language.
 *
 * @module
 */

export * from './SocialShareButtons.jsx'
export * from './types.js'
