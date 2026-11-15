/** The grouped test runner on a real fixture repository: real Vitest, real project configs. */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

import { balancedGroups, selectProjects } from '../vitest-grouped.mjs'
import { vitestBin } from '../vitest-with-tmp-root.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const scratch = path.resolve(ROOT, '../.experiments/vitest-grouped-tests')
const fixtures = []

/** A repository with six packages (any red when asked), the real runner and the real root config. */
function fixture({ red = [] } = {}) {
  fs.mkdirSync(scratch, { recursive: true })
  const dir = fs.mkdtempSync(path.join(scratch, 'repo-'))
  fixtures.push(dir)
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), text)
  }
  for (const file of [
    'scripts/vitest-grouped.mjs',
    'scripts/vitest-with-tmp-root.mjs',
    'scripts/vitest.config.ts',
    'vitest.config.ts',
  ])
    write(file, fs.readFileSync(path.join(ROOT, file), 'utf8'))
  write('package.json', JSON.stringify({ name: 'grouped-fixture', private: true, type: 'module' }))
  write(
    'scripts/__tests__/meta.test.ts',
    "import {it,expect} from 'vitest';it('meta guard',()=>expect(1).toBe(1))\n",
  )
  for (const name of ['a', 'b', 'c', 'd', 'e', 'testing']) {
    const pkg = name === 'testing' ? 'packages/api/testing' : `packages/api/core/${name}`
    write(
      `${pkg}/vitest.config.ts`,
      `import {defineConfig} from 'vitest/config';export default defineConfig({test:{name:${JSON.stringify(name)},root:import.meta.dirname,include:['src/__tests__/*.test.ts'],environment:'node',maxWorkers:1}})\n`,
    )
    write(
      `${pkg}/src/__tests__/sample.test.ts`,
      `import {it,expect} from 'vitest';it('package ${name} test',()=>expect(1).toBe(${red.includes(name) ? 2 : 1}))\n`,
    )
  }
  fs.mkdirSync(path.join(dir, 'tmp'))
  fs.symlinkSync(path.dirname(path.dirname(vitestBin(ROOT))), path.join(dir, 'node_modules'), 'dir')
  const run = (args, groupSize = 2) =>
    spawnSync(process.execPath, ['scripts/vitest-grouped.mjs', ...args], {
      cwd: dir,
      env: {
        ...process.env,
        TMPDIR: path.join(dir, 'tmp'),
        MOL_VITEST_GROUP_PROJECTS: String(groupSize),
      },
      encoding: 'utf8',
      timeout: 60000,
    })
  return { dir, run }
}

const ran = (result) =>
  [...(result.stdout + result.stderr).matchAll(/package (\w) test|meta guard/g)].map(
    (m) => m[1] ?? 'meta',
  )

afterEach(() => {
  for (const dir of fixtures.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe('grouped Vitest runs', () => {
  it('runs every project once, in balanced groups of at most the group size', () => {
    const result = fixture().run([])
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(result.stderr).toContain('group 3/4: 2 projects')
    expect(result.stderr).toContain('group 4/4: 1 projects (scripts … scripts)')
    expect(result.stderr).not.toContain('group 5/')
    expect(result.stdout.match(/Test Files {2}\d+ passed/g)).toHaveLength(4)
  }, 60000)

  it('runs the later groups after a failure and exits with the failure', () => {
    const result = fixture({ red: ['a'] }).run([])
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/group 1\/4 exited 1/)
    expect(result.stderr).toMatch(/group 4\/4 exited 0/)
    expect(result.stdout + result.stderr).toContain('package a test')
  }, 60000)

  it('runs only the projects that path filters name, with their filters', () => {
    const result = fixture({ red: ['c'] }).run([
      'packages/api/core/a',
      'packages/api/core/b/',
      'scripts/__tests__',
    ])
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(result.stderr).toContain('group 2/2: 1 projects (scripts … scripts)')
    expect(result.stdout).toMatch(/Test Files {2}2 passed/)
    expect(result.stdout).toMatch(/Test Files {2}1 passed/)
  }, 60000)

  it('runs Vitest unchanged when an argument is a flag', () => {
    const result = fixture().run(['--reporter=verbose', 'packages/api/core/a'])
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(result.stderr).not.toContain('[vitest-grouped] group')
    expect(ran(result)).toEqual(['a'])
  }, 60000)

  it('runs Vitest unchanged when a filter names no project path', () => {
    const result = fixture({ red: ['b'] }).run(['sample.test'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('names no project path')
    expect(result.stdout + result.stderr).toContain('package b test')
  }, 60000)
})

describe('selection and grouping rules', () => {
  const dirs = ['packages/api/core/a', 'packages/api/core/ab', 'packages/app/x', 'scripts']

  it('selects a project, the projects under a directory, or the project holding a path', () => {
    expect([...selectProjects(dirs, ['packages/api/core/a']).keys()]).toEqual([
      'packages/api/core/a',
    ])
    expect([...selectProjects(dirs, ['packages/api']).keys()]).toEqual([
      'packages/api/core/a',
      'packages/api/core/ab',
    ])
    expect([...selectProjects(dirs, ['scripts/__tests__/x.test.mjs']).entries()]).toEqual([
      ['scripts', ['scripts/__tests__/x.test.mjs']],
    ])
    expect(selectProjects(dirs, ['packages/api/core/abc'])).toBeNull()
  })

  it('balances groups so sizes differ by at most one', () => {
    expect(balancedGroups([1, 2, 3, 4, 5], 2).map((g) => g.length)).toEqual([2, 2, 1])
    expect(balancedGroups([1, 2, 3, 4, 5, 6, 7], 3).map((g) => g.length)).toEqual([3, 2, 2])
    expect(balancedGroups([1, 2], 150)).toEqual([[1, 2]])
    expect(() => balancedGroups([1], 0)).toThrow(/positive integer/)
  })
})
