/**
 * A handler returns `{ statusCode, headers?, body }` and never writes to `res` — and the doc the
 * executor is served has to say so on the surface it actually reads.
 *
 * X0 flash-m93 (+12:00 → +17:22, 2026-10-16) wrapped `@molecule/api-resource-user`'s handlers in a
 * monkey-patched `res.json` to re-shape their answer, which is a method those handlers never call:
 * the wrapper intercepted only the framework's own error JSON, and the request hung — twice, for
 * 294 s and 284 s of a 60-minute cap. The contract was written down the whole time, but only in
 * this package's `createRequestHandler` docs and in an `@example` line; the run never read this
 * README at all (its doc targets were the resource packages, and their built `dist` instead).
 *
 * So the sentence lives in the module description, which renders at the top of the generated
 * README, and this check is on the JSDoc AND on the generated doc.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/** The module JSDoc — everything between the file's first opening block and its close. */
function moduleDoc(source: string): string {
  return source.slice(source.indexOf('/**'), source.indexOf('*/'))
}

describe('the handler contract in @molecule/api-resource’s own docs (xr-flash-m93)', () => {
  it('states what a handler returns, that it never writes to `res`, and the 3-line pattern', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('{ statusCode, headers?, body }')
    expect(doc).toContain('NEVER writes to `res`')
    expect(doc).toContain('const { statusCode, headers, body } = await handler(req, res)')
    expect(doc).toContain('if (headers) res.set(headers)')
    expect(doc).toContain('res.status(statusCode).send(body)')
    // The trap the note exists for: a wrapper around a method the handler never calls.
    expect(doc).toContain('res.json')
    expect(doc).toContain('hangs')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain('{ statusCode, headers?, body }')
    expect(readme).toContain('res.status(statusCode).send(body)')
  })

  it('keeps it near the top, where a whole-doc read reaches it', () => {
    expect(read('README.md').slice(0, 4_000)).toContain('res.status(statusCode).send(body)')
  })
})
