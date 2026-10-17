/**
 * `createBrowserStorageAdapter` restores the session with NO request, so an app can render the
 * signed-in UI on the first paint. The deployed failure this pins (xr-molecule-flash-m122 +23:39):
 * the app persisted token and user through this adapter, then hand-wrote a boot `GET /api/user`
 * and blocked its form on it — a 1–5 s restore window after every full navigation, eight
 * `waitForURL` timeouts on the suite's 15 s budget, ≈17 minutes and a redeploy.
 *
 * The claim has to be on the surface an executor reads: `read_molecule_doc @molecule/app-auth`
 * serves this package's README.md, generated from the module JSDoc — so the check is on the
 * JSDoc AND on the generated doc.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/** The JSDoc block immediately above `marker` in a source file. */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`no \`${marker}\` in the source`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

describe('the restore-cost contract in @molecule/app-auth’s own docs (xr-molecule-flash-m122)', () => {
  it('says the restore costs no request, and that it must not be blocked on the first paint', () => {
    const doc = docFor(read('src/browser-storage.ts'), 'export const createBrowserStorageAdapter')
    expect(doc).toContain('costs NO request')
    expect(doc).toContain('synchronously')
    // The two ways a run gets this wrong: validating in front of the first render, and
    // re-fetching the profile on every navigation.
    expect(doc).toContain('background request')
    expect(doc).toContain('never in front of the first render')
    // The measured failure, so the trade is concrete rather than advice.
    expect(doc).toContain('xr-molecule-flash-m122')
  })

  it('carries the same sentences in the generated README the executor reads', () => {
    const readme = read('README.md')
    expect(readme).toContain('The restore it enables costs NO request')
    expect(readme).toContain('never in front of the first render')
    expect(readme).toContain('xr-molecule-flash-m122')
  })
})

/**
 * xr-molecule-flash-m130's hand-rolled store (`app/src/lib/conduit.ts`) survived a migration
 * onto `@molecule/app-http` and raced its own async restore: the first authenticated page
 * rendered signed-out and its 401 signed the user out. The wiring that replaces it has to be
 * on the surface a whole-doc read delivers — the module DESCRIPTION, not `@remarks`, which the
 * generated README renders after the entire API reference and a truncated read never reaches.
 */
describe('the scaffolded-app wiring in the module description (xr-molecule-flash-m130)', () => {
  it('says how to wire the package without `mlcl add`, and what races the restore', () => {
    const doc = docFor(read('src/index.ts'), '@module')
    expect(doc).toContain('mlcl add')
    expect(doc).toContain('createJWTAuthClient')
    expect(doc).toContain('initialize()')
    expect(doc).toContain('MoleculeProvider')
    expect(doc).toContain('useAuth()')
    expect(doc).toContain('BEFORE the first render')
    expect(doc).toContain('401 signs the user out')
    // The second trap the same run hit (+25:40): a hand-rolled gate holding its own restore.
    expect(doc).toContain('skipAuthGate')
  })

  it('puts those sentences before the README’s API reference, where no truncation drops them', () => {
    const readme = read('README.md')
    for (const sentence of ['mlcl add', 'MoleculeProvider', 'BEFORE the first render']) {
      const at = readme.indexOf(sentence)
      expect(at).toBeGreaterThan(-1)
      expect(at).toBeLessThan(readme.indexOf('## API'))
    }
  })

  it('does not leave the same guidance behind in @remarks, where a truncated read misses it', () => {
    const doc = docFor(read('src/index.ts'), '@module')
    const remarks = doc.slice(doc.indexOf('@remarks'))
    expect(remarks).not.toContain('Do not fetch viewer-dependent data')
    expect(remarks).not.toContain('Do NOT hand-roll a token')
    expect(remarks).not.toContain('skipAuthGate')
  })
})
