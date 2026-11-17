/** The grouped test runner on a real fixture repository: real Vitest, real project configs. */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { stripVTControlCharacters } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'

import * as grouped from '../vitest-grouped.mjs'
import { vitestBin } from '../vitest-with-tmp-root.mjs'

const { balancedGroups, runPool, selectProjects, shardProjects, workersPerGroup } = grouped

const ROOT = path.resolve(import.meta.dirname, '../..')
const scratch = path.resolve(ROOT, '../.experiments/vitest-grouped-tests')
const fixtures = []

/**
 * A repository with six packages (any red or slow when asked), the real runner and the real
 * root config.
 */
function fixture({ red = [], slow = [] } = {}) {
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
    const wait = slow.includes(name) ? 'await new Promise((r)=>setTimeout(r,12000));' : ''
    write(
      `${pkg}/src/__tests__/sample.test.ts`,
      `import {it,expect} from 'vitest';it('package ${name} test',async()=>{${wait}expect(1).toBe(${red.includes(name) ? 2 : 1})},20000)\n`,
    )
  }
  fs.mkdirSync(path.join(dir, 'tmp'))
  fs.symlinkSync(path.dirname(path.dirname(vitestBin(ROOT))), path.join(dir, 'node_modules'), 'dir')
  // Vitest colours its output in CI and turns colour off under an AI agent (std-env
  // `isAgent`), so the same run prints different bytes on each: match on the text only.
  const run = (args, groupSize = 2, concurrency = 2, extra = {}) => {
    const result = spawnSync(process.execPath, ['scripts/vitest-grouped.mjs', ...args], {
      cwd: dir,
      env: {
        ...process.env,
        TMPDIR: path.join(dir, 'tmp'),
        MOL_VITEST_GROUP_PROJECTS: String(groupSize),
        MOL_VITEST_GROUP_CONCURRENCY: String(concurrency),
        ...extra,
      },
      encoding: 'utf8',
      timeout: 60000,
    })
    return {
      ...result,
      stdout: stripVTControlCharacters(result.stdout),
      stderr: stripVTControlCharacters(result.stderr),
    }
  }
  return { dir, run }
}

const ran = (result) =>
  [...(result.stdout + result.stderr).matchAll(/package (\w) test|meta guard/g)].map(
    (m) => m[1] ?? 'meta',
  )

/** Group start and exit events in the order the runner logged them. */
const events = (result) =>
  [...result.stderr.matchAll(/\[vitest-grouped\] group (\d+)\/\d+(:| exited)/g)].map((m) => ({
    group: Number(m[1]),
    exit: m[2] === ' exited',
  }))

/** The most groups that were running at once. */
const peakInFlight = (result) => {
  let running = 0
  let peak = 0
  for (const { exit } of events(result)) {
    running += exit ? -1 : 1
    peak = Math.max(peak, running)
  }
  return peak
}

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

  it('runs two groups at once, so a slow group does not hold the later ones', () => {
    const result = fixture({ slow: ['a'] }).run([])
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(peakInFlight(result)).toBe(2)
    // The other lane moves on while group 1 waits on its slow test: group 3 starts before
    // group 1 ends. One group at a time, group 3 would start only after it.
    const order = events(result).map((e) => `${e.group}${e.exit ? ' exit' : ' start'}`)
    expect(order.indexOf('3 start')).toBeGreaterThan(-1)
    expect(order.indexOf('3 start')).toBeLessThan(order.indexOf('1 exit'))
    expect(result.stdout).toMatch(/Test Files {2}2 passed/)
  }, 60000)

  it('prints each held group whole: one header and one summary per block', () => {
    const result = fixture().run([])
    expect(result.status, result.stdout + result.stderr).toBe(0)
    const blocks = result.stdout.split(/^ RUN /m).slice(1)
    expect(blocks).toHaveLength(4)
    for (const block of blocks) expect(block.match(/Test Files /g)).toHaveLength(1)
  }, 60000)

  it('runs the groups one after another when the concurrency is 1', () => {
    const result = fixture({ slow: ['a'] }).run([], 2, 1)
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(peakInFlight(result)).toBe(1)
    expect(
      events(result)
        .filter((e) => e.exit)
        .map((e) => e.group),
    ).toEqual([1, 2, 3, 4])
  }, 60000)

  it('runs disjoint native shards and preserves the failing shard exit', () => {
    const f = fixture({ red: ['a'] })
    const first = f.run([], 60, 1, { MOL_VITEST_SHARD: '1/2' })
    const second = f.run([], 60, 1, { MOL_VITEST_SHARD: '2/2' })
    expect(first.status, first.stdout + first.stderr).toBe(1)
    expect(second.status, second.stdout + second.stderr).toBe(0)
    expect(first.stderr).toContain('shard 1/2: 4/7 projects')
    expect(second.stderr).toContain('shard 2/2: 3/7 projects')
    expect(first.stdout).toMatch(/1 failed \| 3 passed/)
    expect(second.stdout).toMatch(/Test Files {2}3 passed/)
    const empty = f.run([], 60, 1, { MOL_VITEST_SHARD: '8/8' })
    expect(empty.status).toBe(0)
    expect(empty.stderr).toContain('shard 8/8: 0/7 projects')
  }, 60000)

  it('stops scheduling native groups after failure when fail-fast is selected', () => {
    const result = fixture({ red: ['a'] }).run([], 1, 1, { MOL_VITEST_FAIL_FAST: '1' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('group 1/7 exited 1')
    expect(result.stderr).not.toContain('group 2/7:')
  }, 60000)

  it('runs explicitly prioritized projects first without widening the selected scope', () => {
    const result = fixture({ red: ['e'] }).run([], 1, 1, {
      MOL_VITEST_FAIL_FAST: '1',
      MOL_VITEST_PRIORITY: JSON.stringify(['packages/api/core/e']),
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'group 1/7: 1 projects (packages/api/core/e … packages/api/core/e)',
    )
    expect(result.stderr).not.toContain('group 2/7:')
  }, 60000)

  it('refuses shard fallbacks that would duplicate the whole suite', () => {
    const result = fixture().run(['--reporter=verbose'], 2, 1, { MOL_VITEST_SHARD: '1/8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('sharding requires project path filters')
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

  it('partitions the selected projects exactly once, including empty valid shards', () => {
    const parts = Array.from({ length: 8 }, (_, i) => shardProjects(dirs, `${i + 1}/8`))
    expect(parts.flat().sort()).toEqual([...dirs].sort())
    expect(new Set(parts.flat()).size).toBe(dirs.length)
    expect(parts[7]).toEqual([])
    for (const bad of ['0/8', '9/8', '1/0', '1', '1/2x'])
      expect(() => shardProjects(dirs, bad)).toThrow(/shard/)
  })

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

  it('gives each concurrent group an equal share of the default workers', () => {
    expect(workersPerGroup(4, 2)).toBe(2)
    expect(workersPerGroup(14, 2)).toBe(7)
    expect(workersPerGroup(2, 2)).toBe(1)
    expect(workersPerGroup(1, 4)).toBe(1)
  })

  it('keeps at most the limit in flight and starts nothing after a stop', async () => {
    let running = 0
    let peak = 0
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const started = []
    const results = await runPool(
      6,
      2,
      async (index) => {
        started.push(index)
        running += 1
        peak = Math.max(peak, running)
        await (index === 0 ? gate : null)
        running -= 1
        return index === 2 ? 'stop' : index
      },
      (result) => {
        if (result !== 'stop') return false
        process.nextTick(release)
        return true
      },
    )
    // Task 0 is held until task 2 has stopped the pool, so tasks 1 and 2 run in the other
    // lane meanwhile, and the lane that ran task 0 starts nothing more.
    expect(peak).toBe(2)
    expect(started).toEqual([0, 1, 2])
    expect(results).toEqual([0, 1, 'stop'])
  })

  it('balances groups so sizes differ by at most one', () => {
    expect(balancedGroups([1, 2, 3, 4, 5], 2).map((g) => g.length)).toEqual([2, 2, 1])
    expect(balancedGroups([1, 2, 3, 4, 5, 6, 7], 3).map((g) => g.length)).toEqual([3, 2, 2])
    expect(balancedGroups([1, 2], 150)).toEqual([[1, 2]])
    expect(() => balancedGroups([1], 0)).toThrow(/positive integer/)
  })
})
