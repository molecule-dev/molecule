/**
 * `sign()` is the low-level signer, and a token it mints is not a session: the
 * app's global `verifyMiddleware` (`@molecule/api-resource-user`) accepts a JWT
 * only when its payload also carries a `deviceId` naming an ACTIVE `devices`
 * row, so `sign({ userId })` verifies and answers 401 on every route (X1
 * flash-m73 minted its login token exactly that way and spent three `dist`
 * reads finding out why).
 *
 * That contract has to be on the surface a handler reads: `read_molecule_doc
 * @molecule/api-jwt` serves this package's README.md, which is generated from
 * the module JSDoc — so the check is on the JSDoc AND on the generated doc.
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

/** The JSDoc block immediately above `marker` in a source file. */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`no \`${marker}\` in the source`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

describe('the session contract in @molecule/api-jwt’s own docs (flash-m73)', () => {
  it('says in the module JSDoc that sign() mints no session and names set()', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('low-level signer')
    expect(doc).toContain('NOT a session')
    // The function that mints one the middleware accepts, and the package it lives in.
    expect(doc).toContain('authorization.set()')
    expect(doc).toContain('@molecule/api-resource-user')
    // Why a hand-signed token is refused, and what a caller needs to supply.
    expect(doc).toContain('deviceId')
    expect(doc).toContain('createOrUpdate')
  })

  it('says the same on sign() itself, where the function is documented', () => {
    const doc = docFor(read('src/provider.ts'), 'export const sign')
    expect(doc).toContain('LOW-LEVEL signer')
    expect(doc).toContain('not by itself a session')
    expect(doc).toContain('authorization.set()')
    expect(doc).toContain('deviceId')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain('low-level signer')
    expect(readme).toContain('NOT a session')
    expect(readme).toContain('authorization.set()')
    expect(readme).toContain('@molecule/api-resource-user')
    expect(readme).toContain('createOrUpdate')
  })
})
