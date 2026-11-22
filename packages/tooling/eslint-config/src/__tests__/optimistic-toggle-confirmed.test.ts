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

const setting = `import {useState} from 'react'
export function Alerts({record}) {
  const [override, setOverride] = useState(null)
  const value = override ?? record
  const toggle = async () => {
    const updated = await saveAlerts(record.id, !value.enabled)
    if (updated) setOverride(updated)
  }
  return <button onClick={toggle}>{value.enabled ? 'Disable alerts' : 'Enable alerts'}</button>
}`
describe('toggles that display only the server-confirmed value', () => {
  it('allows the actual P311 l2352 follow handler', async () => {
    const source = await readFile(
      new URL('./fixtures/p311-profile-before.tsx.txt', import.meta.url),
      'utf8',
    )
    const rows = await findings(source)
    expect(rows).toHaveLength(0)
  })
  it('allows a non-benchmark alert setting with a deferred response', async () => {
    expect(await findings(setting)).toHaveLength(0)
  })
  it.each([
    ['no displayed response', setting.replace('if (updated) setOverride(updated)', '')],
    ['literal command', setting.replace('!value.enabled', 'true')],
    [
      'form submission',
      setting.replace('onClick={toggle}', 'onSubmit={toggle}').replaceAll('button', 'form'),
    ],
    [
      'shared hook',
      `import {useOptimisticValue} from '@molecule/app-react'
export const Alerts = ({record}) => {const value = useOptimisticValue({value: record.enabled, commit: async next => saveAlerts(record.id, next)}); return <button onClick={() => value.update(current => !current)}>{String(value.value)}</button>}`,
    ],
  ])('keeps %s quiet', async (_name, source) => {
    expect(await findings(source)).toEqual([])
  })
})
