/**
 * Server-side canvas rendering for molecule.dev. Takes a
 * `CanvasDocument` (width / height / background / layered shapes & text)
 * and returns a `Buffer` for PNG, SVG, or PDF.
 *
 * Wraps `@napi-rs/canvas` for the PNG raster path; SVG and PDF are emitted
 * as pure strings (no native dependency required for those formats).
 *
 * @example
 * ```ts
 * import { renderCanvasDocument } from '@molecule/api-canvas-render'
 *
 * const result = await renderCanvasDocument(
 *   {
 *     width: 800,
 *     height: 600,
 *     background: '#ffffff',
 *     layers: [
 *       { kind: 'rect', x: 20, y: 20, width: 200, height: 80,
 *         fill: '#3b82f6', radius: 8 },
 *       { kind: 'text', x: 40, y: 70, text: 'Hello',
 *         fontSize: 32, fill: '#ffffff' },
 *     ],
 *   },
 *   { format: 'png', dpi: 2 },
 * )
 *
 * // result.buffer is a PNG/JPEG/WebP Buffer — write it to disk
 * // (fs.writeFile) or stream it in an HTTP response.
 * console.log(result.extension, result.buffer.byteLength)
 * ```
 *
 * @example
 * ```ts
 * // HTTP handler — Express adapter
 * import { createCanvasRenderHandler } from '@molecule/api-canvas-render'
 *
 * const handle = createCanvasRenderHandler()
 * router.post('/canvas/render', async (req, res, next) => {
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
 * The renderer is a pure function of its inputs — no fetch, no global state,
 * no implicit locale handling. Locale text is the caller's responsibility:
 * run user-visible strings through `t()` before populating the
 * `CanvasDocument`. This package never displays text on its own.
 *
 * Resource intensity: a high-DPI PNG of a complex document will allocate a
 * sizeable raster. For flagship apps with unknown user input, gate the
 * handler behind a queue / rate limiter rather than calling it inline on
 * the hot request path.
 *
 * PNG output loads the `@napi-rs/canvas` native addon (prebuilt binaries for
 * common Linux/macOS/Windows targets — nothing to apt-install for the addon
 * itself). Text layers, however, rasterize with the fonts installed on the
 * HOST: a minimal container image with no fonts renders text as empty
 * rectangles. Install a font package in the runtime image (e.g. fontconfig
 * plus a sans-serif family) when PNG output includes text, or prefer
 * SVG/PDF output, which embeds font-family names for the viewer to resolve.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './handler.js'
export * from './renderCanvasDocument.js'
export * from './renderPdf.js'
export * from './renderPng.js'
export * from './renderSvg.js'
export * from './types.js'
