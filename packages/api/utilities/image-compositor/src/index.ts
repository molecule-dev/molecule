/**
 * Multi-layer image composition for molecule.dev.
 *
 * Takes a {@link LayeredImage} document (the server-side analogue of the
 * shape consumed by `@molecule/app-feature-image-canvas`) and renders a
 * single flat PNG/JPEG/WebP buffer.
 *
 * Decoupled from any concrete image library: at runtime the compositor
 * looks up the bonded `@molecule/api-image` provider via `bond('image')`
 * and uses it for raw-buffer decode/encode/resize. There is no direct
 * `sharp` import in handler-callable code.
 *
 * @example
 * ```ts
 * import { compositeImage } from '@molecule/api-image-compositor'
 *
 * const png = await compositeImage(
 *   {
 *     width: 1200, height: 800,
 *     background: '#ffffff',
 *     layers: [
 *       { kind: 'image', src: backgroundJpg,
 *         position: { x: 0, y: 0, width: 1200, height: 800 } },
 *       { kind: 'gradient',
 *         gradient: { type: 'linear', x0: 0, y0: 0, x1: 0, y1: 1,
 *           stops: [{ offset: 0, color: 'rgba(0,0,0,0)' },
 *                   { offset: 1, color: 'rgba(0,0,0,0.6)' }] },
 *         position: { x: 0, y: 0, width: 1200, height: 800 },
 *         blendMode: 'multiply' },
 *     ],
 *   },
 *   { format: 'png' },
 * )
 * ```
 *
 * @example
 * ```ts
 * // HTTP handler — Express adapter
 * import { createImageCompositeHandler } from '@molecule/api-image-compositor'
 *
 * const handle = createImageCompositeHandler()
 * router.post('/image/composite', async (req, res, next) => {
 *   try {
 *     await handle(
 *       { body: req.body },
 *       {
 *         setHeader: (n, v) => res.setHeader(n, v),
 *         setStatus: (s) => { res.status(s) },
 *         sendBuffer: (b) => { res.end(b) },
 *         sendJson: (j) => { res.json(j) },
 *       },
 *     )
 *   } catch (err) { next(err) }
 * })
 * ```
 *
 * @remarks
 * Resource intensity: a high-resolution layered document with many
 * blended layers will allocate sizeable RGBA buffers (4 bytes per pixel,
 * per layer at peak). For flagship apps with unrestricted user input,
 * gate the handler behind a queue or rate limiter rather than calling it
 * inline on the hot request path.
 *
 * @module
 */

export * from './blend.js'
export * from './color.js'
export * from './compositeImage.js'
export * from './compositeRgba.js'
export * from './handler.js'
export * from './raster.js'
export * from './types.js'
