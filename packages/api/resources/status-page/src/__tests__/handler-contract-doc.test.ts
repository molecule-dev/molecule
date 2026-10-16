/**
 * `@molecule/api-resource-status-page`'s handlers return `{ statusCode, headers?, body }` and never
 * write to `res` — and the doc the executor is served has to say so on the surface it actually
 * reads.
 *
 * X0 flash-m93 (+12:00 → +17:22, 2026-10-16) hung two suite runs by calling resource handlers
 * behind a monkey-patched `res.json`, a method those handlers never call — so the wrapper re-shaped
 * nothing and the request was never answered. The contract was only in this package's `@example`
 * line; the run read the resource packages' READMEs and their built `dist`, and neither said it.
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

describe('the handler contract in @molecule/api-resource-status-page’s own docs (xr-flash-m93)', () => {
  it('states what a handler returns, that it never writes to `res`, and the 3-line pattern', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('{ statusCode, headers?, body }')
    expect(doc).toContain('never write to `res`')
    expect(doc).toContain(
      'const { statusCode, headers, body } = await handlers.getStatus(resource)(req, res)',
    )
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
