/**
 * Where the `Authorization` scheme is set: the CONSTRUCTOR, not the built client.
 *
 * X1 flash-m100 (+08:48 → +10:41, 2026-10-16) read this package's guidance — "An API that wants
 * another scheme than `Bearer` sets `authScheme: 'Token'` in the client config" — and set it on
 * the one call the sentence named: `const client = getClient(); client.authScheme = 'Token'`. That
 * is a TS2339, which it cast away, then read four `dist` files before finding `createFetchClient`.
 * The doc is the surface a run reads (`read_molecule_doc @molecule/app-http`), so the check is on
 * the JSDoc AND on the generated README.
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

describe('the Authorization scheme guidance names the call that takes it (xr-flash-m100)', () => {
  it('names the constructor call in the module JSDoc', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain("createFetchClient({ baseURL,\n * authScheme: 'Token' })")
    // The trap the run fell into: the option is not a property of what getClient() returns.
    expect(doc).toContain("`getClient()`'s result")
    expect(doc).toContain('TS2339')
  })

  it('says the same on HttpClientConfig.authScheme, the field doc a reader lands on', () => {
    const doc = read('src/client.ts')
    const at = doc.indexOf('authScheme?: string')
    const field = doc.slice(doc.lastIndexOf('/**', at), at)
    expect(field).toContain("createFetchClient({ baseURL, authScheme: 'Token' })")
    expect(field).toContain('CONSTRUCTOR')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain("authScheme: 'Token'")
    expect(readme).toContain('CONSTRUCTOR')
    expect(readme).toContain("`getClient()`'s result")
  })
})
