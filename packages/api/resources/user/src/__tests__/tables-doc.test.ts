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

/**
 * X0 flash-m426 (+03:16): `read_molecule_doc({ name: '@molecule/api-resource-user',
 * section: 'Session' })` described the payload as `userId, email, role, permissions,
 * metadata` while `sessionSchema` requires `userId`/`deviceId` and optionally accepts
 * `id`/`oauthServer`/`oauthId` — none of the four claimed extras exist on the schema.
 * The doc the executor reads must name the fields the schema actually declares.
 */
describe('the Session payload description matches sessionSchema (flash-m426)', () => {
  const SESSION_DOC =
    'JWT session payload inferred from sessionSchema: required userId and deviceId; optional id, oauthServer and oauthId. See sessionSchema for the field schema.'

  /** The README block under a heading, up to the next heading of any depth. */
  function readmeSection(readme: string, heading: string): string {
    const at = readme.indexOf(heading)
    if (at < 0) throw new Error(`no \`${heading}\` in the README`)
    const next = readme.indexOf('\n#', at + heading.length)
    return next < 0 ? readme.slice(at) : readme.slice(at, next)
  }

  it('the Session JSDoc names the real required and optional fields', () => {
    const doc = docFor(read('src/schema.ts'), 'export type Session')
    expect(doc).toContain(SESSION_DOC)
    // The fields the stale text claimed the schema has, and does not.
    for (const field of ['email', 'role', 'permissions', 'metadata']) {
      expect(doc).not.toContain(field)
    }
  })

  it('the generated README Session entries carry the same description', () => {
    const readme = read('README.md')
    for (const heading of ['#### `Session`', '##### `types.Session`']) {
      const section = readmeSection(readme, heading)
      expect(section).toContain(SESSION_DOC)
      expect(section).toContain('type Session = z.infer<typeof sessionSchema>')
      for (const field of ['email', 'role', 'permissions', 'metadata']) {
        expect(section).not.toContain(field)
      }
    }
  })

  it('the runtime declaration is still inferred from sessionSchema', () => {
    expect(read('src/schema.ts')).toContain('export type Session = z.infer<typeof sessionSchema>')
  })
})
