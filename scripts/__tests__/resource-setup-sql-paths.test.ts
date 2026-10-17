/**
 * Every `@molecule/api-resource-*` package ships its setup SQL in ONE place:
 * `src/__setup__/`. The fleet had two conventions — `setup/` at the package root
 * in five packages (`api-key`, `device`, `payment`, `status-page`, `user`) and
 * `src/__setup__/` in the rest — so an executor that read the path from one
 * package's doc found nothing in the next (X0 flash-m127: three probing `ls`
 * calls before a `find`). The packages also have to PUBLISH the directory
 * (`files`) and STATE it in the module JSDoc that generates the README
 * `read_molecule_doc` serves, or the path is correct on disk and absent from
 * every surface the caller reads.
 *
 * This is the drift guard: one SQL layout, published, and documented.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const RESOURCES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'packages',
  'api',
  'resources',
)

/** Every directory under `packages/api/resources`. */
function packageDirs(): string[] {
  return readdirSync(RESOURCES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

/** The `*.sql` files directly inside `dir`, or `[]` when it is absent. */
function sqlFiles(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.sql')) : []
}

/** The package's module JSDoc — the first block, which generates the README. */
function moduleDoc(pkgDir: string): string {
  const source = readFileSync(join(pkgDir, 'src', 'index.ts'), 'utf8')
  return source.slice(source.indexOf('/**'), source.indexOf('*/'))
}

describe('resource setup SQL has one path convention', () => {
  const withSql = packageDirs().filter(
    (name) =>
      sqlFiles(join(RESOURCES, name, 'src', '__setup__')).length > 0 ||
      sqlFiles(join(RESOURCES, name, 'setup')).length > 0,
  )

  it('finds the resource packages that ship SQL (the guard cannot silently pass on none)', () => {
    expect(withSql.length).toBeGreaterThan(40)
  })

  it('never ships SQL in a package-root `setup/` directory', () => {
    const strays = withSql.filter((name) => sqlFiles(join(RESOURCES, name, 'setup')).length > 0)
    expect(strays, `move setup/*.sql to src/__setup__/ in: ${strays.join(', ')}`).toEqual([])
  })

  it('publishes src/__setup__ in every package that ships SQL there', () => {
    const unpublished: string[] = []
    for (const name of withSql) {
      if (sqlFiles(join(RESOURCES, name, 'src', '__setup__')).length === 0) continue
      const manifest = JSON.parse(readFileSync(join(RESOURCES, name, 'package.json'), 'utf8')) as {
        files?: string[]
      }
      if (!(manifest.files ?? []).includes('src/__setup__')) unpublished.push(name)
    }
    expect(unpublished, `add "src/__setup__" to files in: ${unpublished.join(', ')}`).toEqual([])
  })

  it('states the path in the module JSDoc that generates the README', () => {
    const undocumented = withSql.filter(
      (name) => !moduleDoc(join(RESOURCES, name)).includes('src/__setup__'),
    )
    expect(
      undocumented,
      `state the setup SQL path in src/index.ts JSDoc for: ${undocumented.join(', ')}`,
    ).toEqual([])
  })
})
