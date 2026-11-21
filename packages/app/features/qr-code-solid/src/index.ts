/**
 * Render a QR code as a crisp scalable SVG with optional center logo — the
 * Solid counterpart of `@molecule/app-qr-code-react`, with the same props and
 * the same DOM for the same input.
 *
 * Used across coupon-deals-platform (redemption codes), restaurant-ordering
 * (table tokens), event-ticketing (tickets), and voting-polling (ballot
 * links). Encoding is delegated to the lightweight `qrcode-generator`
 * library; rendering is a single SVG `<path>` of horizontal-run rectangles
 * (much smaller DOM than per-module rects) plus an optional `<image>`
 * overlay for a center logo.
 *
 * @example
 * ```tsx
 * import { QrCode } from '@molecule/app-qr-code-solid'
 *
 * // Simple link
 * <QrCode value="https://example.com/redeem/ABC123" />
 *
 * // Larger code with high error-correction and a center logo
 * <QrCode
 *   value="https://example.com/ticket/42"
 *   size={320}
 *   errorCorrection="H"
 *   logo={{ src: '/logo.png', alt: 'Brand' }}
 * />
 * ```
 *
 * @remarks
 * Center-logo overlay reduces scannability — always pair it with
 * `errorCorrection='H'` and keep the logo at or below ~20% of the QR size.
 * Container styling routes through `@molecule/app-ui`'s `getClassMap()`;
 * the only inline values are SVG `fill` color attributes (real SVG attrs,
 * not Tailwind). Translations come from `@molecule/app-locales-qr-code`
 * through the Solid binding's `useTranslation()`.
 *
 * @module
 */

export * from './path.js'
export * from './QrCode.jsx'
export * from './types.js'
