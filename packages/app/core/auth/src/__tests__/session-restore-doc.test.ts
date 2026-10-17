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
