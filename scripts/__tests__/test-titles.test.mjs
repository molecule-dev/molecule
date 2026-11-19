/**
 * Tests for scripts/lib/test-titles.mjs: the test titles a source file declares, as the
 * title-parity rule of check-framework-conformance.mjs compares them.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { testFilesOf, testTitlesOf, titlesIn } from '../lib/test-titles.mjs'

const roots = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('titlesIn', () => {
  it('reads it and test titles in every quote style', () => {
    expect(
      titlesIn(`it('single', () => {})
test("double", () => {})
it(\`template\`, () => {})
it('it\\'s escaped', () => {})`),
    ).toEqual(['single', 'double', 'template', "it\\'s escaped"])
  })

  it('reads a table title as its template, past a table holding brackets, strings and comments', () => {
    expect(
      titlesIn(`it.each([
  ['a (one)', ')'], // a ) in a comment
  /* ] */ ['b', '['],
])('selects %s with %s', () => {})
test.each\`
  value
  \${1}
\`('reads $value', () => {})
it.for([1, 2])('counts %i', () => {})
it.each\`
  label
  \${\`a \${'\`'} b\`}
\`('labels $label', () => {})`),
    ).toEqual(['selects %s with %s', 'reads $value', 'counts %i', 'labels $label'])
  })

  it('reads conditional and modified tests', () => {
    expect(
      titlesIn(`it.runIf(process.env.CI)('runs in CI', () => {})
it.skipIf(isWindows)('runs off Windows', () => {})
it.concurrent('runs alongside', async () => {})
it.only('runs alone', () => {})
it.fails('fails as expected', () => {})`),
    ).toEqual([
      'runs in CI',
      'runs off Windows',
      'runs alongside',
      'runs alone',
      'fails as expected',
    ])
  })

  it('counterexample: reads no skipped, todo or describe title, nor a call that only ends in it', () => {
    expect(
      titlesIn(`describe('a group', () => {})
it.skip('not yet', () => {})
it.todo('later')
it.each.skip([1])('skipped table %s', () => {})
xit('disabled', () => {})
cache.it('a method', () => {})
submit('a call', () => {})`),
    ).toEqual([])
  })
})

describe('testTitlesOf', () => {
  it('maps each title to the first test file under src that declares it', () => {
    const root = mkdtempSync(join(tmpdir(), 'test-titles-'))
    roots.push(root)
    const write = (file, text) => {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    write('src/__tests__/a.test.ts', `it('shared', () => {})\nit('only a', () => {})\n`)
    write('src/__tests__/b.svelte.test.ts', `it('shared', () => {})\n`)
    write('src/nested/c.spec.tsx', `it('only c', () => {})\n`)
    write('src/__tests__/helpers.ts', `it('not a test file', () => {})\n`)
    write('src/node_modules/x/d.test.ts', `it('installed', () => {})\n`)
    write('dist/e.test.js', `it('built', () => {})\n`)

    expect(testFilesOf(root)).toEqual([
      'src/__tests__/a.test.ts',
      'src/__tests__/b.svelte.test.ts',
      'src/nested/c.spec.tsx',
    ])
    expect([...testTitlesOf(root)]).toEqual([
      ['shared', 'src/__tests__/a.test.ts'],
      ['only a', 'src/__tests__/a.test.ts'],
      ['only c', 'src/nested/c.spec.tsx'],
    ])
    expect([...testTitlesOf(root, (file) => file.startsWith('src/nested/'))]).toEqual([
      ['only c', 'src/nested/c.spec.tsx'],
    ])
  })
})
