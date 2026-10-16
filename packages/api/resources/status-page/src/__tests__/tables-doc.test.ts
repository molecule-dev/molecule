/**
 * `@molecule/api-resource-status-page` owns FOUR tables, and the doc the executor is served
 * listed them without saying how three of them attach to the fourth — the one column a query for
 * "this service's checks/incidents/uptime" has to filter on. `services` is the parent and
 * `checks`, `incidents` and `uptimeWindows` each join to it on their own `serviceId`; a package's
 * own reference is where that belongs (X0 flash-m84's class: the package's own reference never
 * named the second table of a two-table resource, or the column that joins them; see the user
 * resource's equivalent test).
 *
 * The contract lives on the surface the executor reads — the README, generated from the module
 * JSDoc — so the check is on the JSDoc AND on the generated doc.
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

describe('the table contract in @molecule/api-resource-status-page’s own docs', () => {
  it('names all four owned tables and the key that joins them', () => {
    const doc = moduleDoc(read('src/index.ts'))
    for (const table of ['services', 'checks', 'incidents', 'uptimeWindows']) {
      expect(doc).toContain(`\`${table}\``)
    }
    expect(doc).toContain('serviceId')
    expect(doc).toContain('services.id')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain('services.id')
    expect(readme).toContain('`serviceId` = `services.id`')
  })
})
