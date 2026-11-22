import { readFile } from 'node:fs/promises'

import type { Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

const RULE = 'molecule-local/links-reach-the-view-they-select'
const project = await lintProject(null)
afterAll(() => project.remove())
const { engine } = project

async function findings(source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: 'src/pages/Orders.tsx' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) => file.messages.filter((row) => row.ruleId === RULE))
}

/** An orders page with two views; `read` decides which is shown and `link` goes to the second. */
const orders = (
  read: string,
  link: string,
  extra = '',
): string => `import { Link, useLocation, useSearchParams } from 'react-router-dom'
export function Orders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const archived = ${read}
  ${extra}
  return (
    <nav>
      <Link to="/orders">Open</Link>
      ${link}
      {archived ? <ArchivedOrders /> : <OpenOrders />}
    </nav>
  )
}`

describe('a view read from a query parameter that no link sets', () => {
  it('reports the retained profile page: the tab link goes to a path, the page reads ?tab=', async () => {
    const source = await readFile(
      new URL('./fixtures/p317-l2400-profile-tab-before.tsx.txt', import.meta.url),
      'utf8',
    )
    const rows = await findings(source)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 25, severity: 1 })
    expect(rows[0]?.message).toContain("`searchParams.get('tab') === 'favorites'`")
    expect(rows[0]?.message).toContain('line 105')
    expect(rows[0]?.message).toContain('/favorites')
    expect(rows[0]?.message).toContain('`?tab=favorites`')
  })

  it('reports an orders page whose Archived link goes to /orders/archived', async () => {
    const rows = await findings(
      orders(
        "searchParams.get('view') === 'archived'",
        '<Link aria-current={archived} to="/orders/archived">Archived</Link>',
      ),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.message).toContain('`?view=archived`')
  })

  it.each([
    [
      'a link that sets the parameter',
      "searchParams.get('view') === 'archived'",
      '<Link to="/orders?view=archived">Archived</Link>',
      '',
    ],
    [
      'a button that sets it through setSearchParams',
      "searchParams.get('view') === 'archived'",
      '<Link to="/orders/archived">Archived</Link>',
      "const show = () => setSearchParams({ view: 'archived' })",
    ],
    [
      'a URLSearchParams write',
      "searchParams.get('view') === 'archived'",
      '<Link to="/orders/archived">Archived</Link>',
      "const next = new URLSearchParams(searchParams); next.set('view', 'archived')",
    ],
    [
      'a view read from the path the link goes to',
      "location.pathname.endsWith('/archived')",
      '<Link to="/orders/archived">Archived</Link>',
      '',
    ],
    [
      'a parameter no link in the file names by path (another component sets it)',
      "searchParams.get('view') === 'archived'",
      '<Link to="/orders/export">Export</Link>',
      '',
    ],
    [
      'a read that is not a comparison with a literal',
      "Boolean(searchParams.get('view'))",
      '<Link to="/orders/archived">Archived</Link>',
      '',
    ],
  ])('stays quiet for %s', async (_what, read, link, extra) => {
    expect(await findings(orders(read, link, extra))).toEqual([])
  })
})
