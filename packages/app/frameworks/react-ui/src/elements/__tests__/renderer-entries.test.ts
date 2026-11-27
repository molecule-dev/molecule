import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { expect, it } from 'vitest'

const cwd = join(import.meta.dirname, '..', '..', '..')
const resolveEntries = `
import { accessSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const entries = ['elements', 'platform'].map((entry) => {
  const path = fileURLToPath(import.meta.resolve('@molecule/app-ui-react/' + entry))
  accessSync(path)
  return basename(path)
})
console.log(JSON.stringify(entries))
`

it.each([
  { renderer: 'React DOM', conditions: [], entry: 'index.js' },
  { renderer: 'React Native', conditions: ['--conditions=react-native'], entry: 'native.js' },
])('resolves the built elements and overlay entries for $renderer', ({ conditions, entry }) => {
  const output = execFileSync(
    process.execPath,
    [...conditions, '--input-type=module', '--eval', resolveEntries],
    { cwd, encoding: 'utf8' },
  )
  expect(JSON.parse(output)).toEqual([entry, entry])
})
