/**
 * Server-side QR code generation for molecule.dev. Produces SVG strings,
 * PNG `Buffer`s, or base64 `data:` URLs from arbitrary string input —
 * suitable for email templates (ticket QRs, redemption codes), PDF
 * inclusion, push-notification icons, and any other server-rendered
 * delivery channel.
 *
 * Companion to the client-side `@molecule/app-qr-code-react` package; the
 * two share the same `qrcode-generator@1.4.4` dependency so encoded output
 * is byte-identical between server and client for the same inputs.
 *
 * @example
 * ```ts
 * import { generateQrCode } from '@molecule/api-qr-code'
 *
 * // SVG string (default)
 * const svg = await generateQrCode('https://example.com')
 *
 * // PNG Buffer for attachments / PDF inclusion
 * const png = await generateQrCode('TICKET-1234', {
 *   format: 'png',
 *   size: 256,
 *   errorCorrection: 'H',
 * })
 *
 * // data: URL for inline <img> in HTML emails
 * const dataUrl = await generateQrCode('coupon-redeem-9z', { format: 'dataUrl' })
 * ```
 *
 * @example
 * ```ts
 * // HTTP handler — Express adapter
 * import { createQrCodeHandler } from '@molecule/api-qr-code'
 *
 * const handle = createQrCodeHandler()
 * router.get('/qr/:value', async (req, res, next) => {
 *   try {
 *     await handle(
 *       { params: { value: req.params.value }, query: req.query },
 *       {
 *         setHeader: (n, v) => res.setHeader(n, v),
 *         setStatus: (s) => { res.status(s) },
 *         sendBuffer: (b) => { res.end(b) },
 *         sendText: (t) => { res.send(t) },
 *         sendJson: (j) => { res.json(j) },
 *       },
 *     )
 *   } catch (err) { next(err) }
 * })
 * ```
 *
 * @remarks
 * The PNG encoder is hand-rolled (PNG signature → IHDR → deflated IDAT →
 * IEND) so the package has zero native dependencies. SVG output is preferred
 * whenever the rendering target supports it: it scales infinitely, is far
 * smaller on the wire, and is what the React companion uses too.
 *
 * Colors are CSS hex (`'#000'`, `'#ff00aa'`, etc.). Named colors / `rgba()`
 * /`hsl()` are not supported by the PNG encoder — pre-resolve to hex.
 *
 * The package never displays text on its own and has no companion locale
 * bond: the encoded value is always opaque caller-supplied data.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './buildMatrix.js'
export * from './generateQrCode.js'
export * from './handler.js'
export * from './renderPng.js'
export * from './renderSvg.js'
export * from './types.js'
