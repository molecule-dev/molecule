/**
 * The user record lives in TWO tables, and the doc the executor is served never said so:
 * X0 flash-m84 (2026-10-16) wrote `create('users', { username, email, password })` — `SqliteError:
 * table users has no column named password` — and then, once signup worked, wrote
 * `create('usersSecrets', { id: randomUUID(), passwordHash })`, which inserts happily and is never
 * found again, so login answered "invalid credentials" while its own `GET /api/user` still
 * worked. ~1 min 50 s across the two detours. Both are one missing sentence: `usersSecrets` did
 * not appear anywhere in `@molecule/api-resource-user`'s README.md, and nothing said which id
 * the secrets row is keyed by.
 *
 * The contract has to live on the surface the executor actually reads — the README, which is
 * generated from the module JSDoc — so the check is on the JSDoc AND on the generated doc.
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

describe('the two-table contract in @molecule/api-resource-user’s own docs (flash-m84)', () => {
  it('names both tables, what each holds, and the key that joins them', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('`users`')
    expect(doc).toContain('`usersSecrets`')
    // The users table holds props and NO password — the first detour's mistake.
    expect(doc).toContain('no password column')
    // The second detour's mistake: the secrets row is keyed by the USER's id, not a fresh uuid.
    expect(doc).toContain('usersSecrets.id')
    expect(doc).toContain("IS the user's id")
    expect(doc).toContain('never a fresh uuid')
  })

  it('names the handlers and the datastore call instead of hand-written SQL', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('handlers.create')
    expect(doc).toContain('handlers.logIn')
    expect(doc).toContain('handlers.updatePassword')
    expect(doc).toContain("findById('usersSecrets', userId)")
  })

  it('says the same on the schema exports, where the types are documented', () => {
    const schema = read('src/schema.ts')
    expect(docFor(schema, 'export const secretPropsSchema')).toContain('usersSecrets')
    expect(docFor(schema, 'export const secretPropsSchema')).toContain('never a fresh uuid')
    expect(docFor(schema, 'export type Props')).toContain('users')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain('usersSecrets')
    expect(readme).toContain('no password column')
    expect(readme).toContain("IS the user's id")
    expect(readme).toContain("findById('usersSecrets', userId)")
  })
})
