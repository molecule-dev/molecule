import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { stripVTControlCharacters } from 'node:util'

import { expect, it } from 'vitest'

import { vitestBin } from '../vitest-with-tmp-root.mjs'

const repo = join(import.meta.dirname, '../..')
const ui = join(repo, 'packages/app/core/ui')

it.each([
  { expected: 'number', exit: 0 },
  { expected: 'string', exit: 1 },
])(
  'checks an exact-type assertion against $expected in the package run',
  ({ expected, exit }) => {
    const root = mkdtempSync(join(tmpdir(), 'molecule-vitest-typecheck-'))
    try {
      for (const file of ['vitest.config.ts', 'tsconfig.json', 'tsconfig.tests.json']) {
        copyFileSync(join(ui, file), join(root, file))
      }
      symlinkSync(join(repo, 'node_modules'), join(root, 'node_modules'), 'dir')
      writeFileSync(join(root, 'package.json'), '{"type":"module"}\n')
      const tests = join(root, 'src/__tests__')
      mkdirSync(tests, { recursive: true })
      writeFileSync(
        join(tests, 'select-field-types.test.ts'),
        `import { expectTypeOf, it } from 'vitest'
it('compares the exact types', () => {
  expectTypeOf<number>().toEqualTypeOf<${expected}>()
})
`,
      )
      writeFileSync(
        join(tests, 'runtime.test.ts'),
        `import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
it('runs its body once', () => writeFileSync('runtime-ran', '', { flag: 'wx' }))
`,
      )
      const child = spawnSync(
        process.execPath,
        [vitestBin(root), 'run', '--maxWorkers=1', '--reporter=default'],
        { cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } },
      )
      if (child.error) throw child.error
      const output = stripVTControlCharacters(child.stdout + child.stderr)
      expect(child.status, output).toBe(exit)
      expect(output).toMatch(/✓ src\/__tests__\/runtime\.test\.ts \(1 test\)/)
      expect(output).not.toMatch(/\bTS\s+src\/__tests__\/runtime\.test\.ts/)
      if (exit === 0) {
        expect(output).toMatch(/Type Errors\s+no errors/)
      } else {
        expect(output).toMatch(/TypeCheckError:.*Expected.*string.*Actual.*number/)
        expect(output).toMatch(/src\/__tests__\/select-field-types\.test\.ts:3:\d+/)
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  },
  15_000,
)
