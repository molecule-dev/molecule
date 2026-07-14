/**
 * Pure-function PPTX export for molecule.dev. Takes a JSON-serializable
 * `Deck` (slides + elements) and produces a `.pptx` `Buffer` — a ZIP of
 * OOXML parts that opens cleanly in PowerPoint, Keynote, and Google
 * Slides.
 *
 * @example
 * ```ts
 * import { exportPptx } from '@molecule/api-export-pptx'
 *
 * const result = await exportPptx({
 *   title: 'Q1 Update',
 *   author: 'Acme Inc.',
 *   slides: [
 *     {
 *       background: '#ffffff',
 *       elements: [
 *         { kind: 'text', x: 0.5, y: 0.5, w: 9, h: 1,
 *           body: 'Welcome', fontSize: 36, bold: true },
 *         { kind: 'shape', shape: 'rect', x: 0.5, y: 2, w: 4, h: 0.05,
 *           fill: '#3b82f6' },
 *       ],
 *     },
 *   ],
 * })
 *
 * // Node: write to disk
 * import { writeFile } from 'node:fs/promises'
 * await writeFile(result.filename, result.buffer)
 * ```
 *
 * @example
 * ```ts
 * // HTTP handler — Express adapter
 * import { createPptxExportHandler } from '@molecule/api-export-pptx'
 *
 * const handle = createPptxExportHandler()
 * router.post('/export/pptx', async (req, res, next) => {
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
 * The serializer is a pure function — no fetch, no state, no global
 * config. Locale text is the caller's responsibility (run user-visible
 * strings through `t()` before populating the `Deck`); this package
 * never displays text on its own.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './exportPptx.js'
export * from './handler.js'
export * from './types.js'
