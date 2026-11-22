import { readFile } from 'node:fs/promises'

import type { Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

const project = await lintProject({ dependencies: { '@molecule/app-react': '1.0.0' } })
afterAll(() => project.remove())
const { engine } = project

async function findings(source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: 'src/Control.tsx' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) =>
    file.messages.filter(
      (row) => row.ruleId === 'molecule-local/server-toggles-use-optimistic-value',
    ),
  )
}

const recordToggle = `import { useState } from 'react'
export function Alerts({ id }) {
  const [revision, setRevision] = useState(0)
  const query = useQuery({ key: ['alerts', id, revision], fetch: () => readAlerts(id) })
  const toggle = async () => {
    await saveAlerts(id, !query.data.enabled)
    setRevision(value => value + 1)
  }
  return <button onClick={toggle}>{query.data?.enabled ? 'Disable alerts' : 'Enable alerts'}</button>
}`

describe('server-backed toggles that wait for a write and a query refetch', () => {
  it('allows the retained l2195 save on its exact line before any optimistic rewrite', async () => {
    const source = await readFile(
      new URL('./fixtures/p292-profile-before.tsx.txt', import.meta.url),
      'utf8',
    )
    const rows = await findings(source)
    expect(rows).toHaveLength(0)
  })

  it('allows a non-X1 notification setting with the same save/refetch dependency', async () => {
    expect(await findings(recordToggle)).toHaveLength(0)
  })

  it('stays silent on the retained profile after it adopted useOptimisticValue', async () => {
    const source = await readFile(
      new URL('./fixtures/p292-profile-optimistic.tsx.txt', import.meta.url),
      'utf8',
    )
    expect(await findings(source)).toEqual([])
  })

  it('allows a state-selected DELETE/POST before a query refresh', async () => {
    const source = recordToggle.replace(
      'await saveAlerts(id, !query.data.enabled)',
      "if (query.data.enabled) await http.delete('/alerts'); else await http.post('/alerts')",
    )
    expect(await findings(source)).toHaveLength(0)
  })

  it.each([
    [
      'form submission',
      recordToggle.replace('onClick={toggle}', 'onSubmit={toggle}').replaceAll('button', 'form'),
    ],
    [
      'local state only',
      recordToggle.replace(
        'await saveAlerts(id, !query.data.enabled)',
        'await animate(!query.data.enabled)',
      ),
    ],
    ['an unrelated refresh', recordToggle.replace('!query.data.enabled', 'true')],
    [
      'a local hook consuming a revision unrelated to the saved record',
      recordToggle.replace(
        "const query = useQuery({ key: ['alerts', id, revision], fetch: () => readAlerts(id) })",
        'const deferred = useDeferredValue(revision); const query = record',
      ),
    ],
    [
      'server-confirmed value without a refetch',
      recordToggle.replace('setRevision(value => value + 1)', ''),
    ],
    [
      'serialized custom queue',
      recordToggle.replace(
        'await saveAlerts(id, !query.data.enabled)',
        'queue.current = queue.current.then(async () => { await saveAlerts(id, !query.data.enabled) })',
      ),
    ],
    [
      'the shared optimistic hook',
      `import { useOptimisticValue as useValue } from '@molecule/app-react'
export function Alerts({ record }) {
  const toggle = useValue({ value: record.enabled, commit: async next => saveAlerts(record.id, next) })
  return <button onClick={() => toggle.update(value => !value)}>{String(toggle.value)}</button>
}`,
    ],
  ])('stays silent for %s', async (_name, source) => {
    expect(await findings(source)).toEqual([])
  })
})
