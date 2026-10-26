/**
 * Provisioning guidance on the surface an executor actually reads.
 *
 * `read_molecule_doc`'s overview is the FIRST 4,000 characters of the generated README, and the
 * handler-contract check already pins that `res.status(statusCode).send(body)` sits inside it.
 * The cap is therefore a real budget: a paragraph appended after the handler material is invisible
 * to that reader. This suite pins that the `provisionUser` helper, its trusted-server warning and
 * the `completeId` recovery pointer all fit in the same overview — and that the doc does not
 * repeat the earlier claim that a retry or the password-reset flow repairs a missing credential
 * row (a reset only UPDATES an existing `usersSecrets` row).
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

/** The character budget of the doc overview a reader is served. */
const OVERVIEW_CHARACTERS = 4_000

describe('provisionUser guidance in the doc overview', () => {
  it('states the helper, its statuses, the trusted-server warning and the recovery pointer in the module JSDoc', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('provisionUser({ name, tableName }')
    expect(doc).toContain("status: 'created' | 'completed' | 'existing'")
    expect(doc).toContain('TRUSTED SERVER CALLERS ONLY')
    expect(doc).toContain("status: 'partial'")
    expect(doc).toContain('completeId')
  })

  it('reaches the generated README inside the 4,000-character overview', () => {
    const overview = read('README.md').slice(0, OVERVIEW_CHARACTERS)
    expect(overview).toContain('provisionUser(')
    expect(overview).toContain('TRUSTED SERVER CALLERS ONLY')
    expect(overview).toContain('completeId')
    // The handler contract must stay in the same overview — the capacity was made by shortening
    // older prose, never by pushing the existing guidance past the cap.
    expect(overview).toContain('res.status(statusCode).send(body)')
  })

  it('does not claim a retry or the password-reset flow repairs a missing credential row', () => {
    const readme = read('README.md')
    expect(readme).toContain('a retry without `completeId`')
    expect(readme).not.toMatch(/password-reset flow/i)
  })
})
