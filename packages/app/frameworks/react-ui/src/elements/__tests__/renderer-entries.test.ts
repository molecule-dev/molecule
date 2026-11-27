import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { expect, it } from 'vitest'

const cwd = join(import.meta.dirname, '..', '..', '..')
const resolveEntries = `
import { accessSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const entries = ['', '/components/Tooltip.js', '/elements', '/platform'].map((entry) => {
  const path = fileURLToPath(import.meta.resolve('@molecule/app-ui-react' + entry))
  accessSync(path)
  return basename(path)
})
console.log(JSON.stringify(entries))
`

const browserEntries = ['index.web.js', 'Tooltip.web.js', 'index.js', 'index.js']

it.each([
  { renderer: 'React DOM', conditions: [], entries: browserEntries },
  {
    renderer: 'React Native',
    conditions: ['--conditions=react-native'],
    entries: ['index.js', 'Tooltip.native.js', 'native.js', 'native.js'],
  },
  {
    renderer: 'React Native Web',
    conditions: ['--conditions=react-native', '--conditions=browser'],
    entries: browserEntries,
  },
])('resolves the built UI entries for $renderer', ({ conditions, entries }) => {
  const output = execFileSync(
    process.execPath,
    [...conditions, '--input-type=module', '--eval', resolveEntries],
    { cwd, encoding: 'utf8' },
  )
  expect(JSON.parse(output)).toEqual(entries)
})
