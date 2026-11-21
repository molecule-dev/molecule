/**
 * Render a QR code as a crisp scalable SVG with optional center logo — the
 * Angular counterpart of `@molecule/app-qr-code-react`, with the same props
 * and the same DOM for the same input.
 *
 * Used across coupon-deals-platform (redemption codes), restaurant-ordering
 * (table tokens), event-ticketing (tickets), and voting-polling (ballot
 * links). Encoding is delegated to the lightweight `qrcode-generator`
 * library; rendering is a single SVG `<path>` of horizontal-run rectangles
 * (much smaller DOM than per-module rects) plus an optional `<image>`
 * overlay for a center logo.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { QrCode } from '@molecule/app-qr-code-angular'
 *
 * @Component({
 *   selector: 'app-redeem-ticket',
 *   standalone: true,
 *   imports: [QrCode],
 *   template: `
 *     <!-- Simple link -->
 *     <svg mol-qr-code [value]="'https://example.com/redeem/ABC123'"></svg>
 *
 *     <!-- Larger code with high error-correction and a center logo -->
 *     <svg
 *       mol-qr-code
 *       [value]="'https://example.com/ticket/42'"
 *       [size]="320"
 *       errorCorrection="H"
 *       [logo]="{ src: '/logo.png', alt: 'Brand' }"
 *     ></svg>
 *   `,
 * })
 * export class RedeemTicket {}
 * ```
 *
 * @remarks
 * Center-logo overlay reduces scannability — always pair it with
 * `errorCorrection='H'` and keep the logo at or below ~20% of the QR size.
 * Container styling routes through `@molecule/app-ui`'s `getClassMap()`;
 * the only inline values are SVG `fill` color attributes (real SVG attrs,
 * not Tailwind). Translations come from `@molecule/app-locales-qr-code`
 * through the Angular binding's `useTranslation()`.
 *
 * @module
 */

export * from './path.js'
export * from './qr-code.component.js'
export * from './types.js'
