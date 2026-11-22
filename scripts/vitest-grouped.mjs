#!/usr/bin/env node
/**
 * Run the monorepo's Vitest projects in groups of at most `MOL_VITEST_GROUP_PROJECTS`
 * (default {@link DEFAULT_GROUP_PROJECTS}), one Vitest process per group, one after another.
 *
 * Why: one Vitest process keeps every project it starts in memory until the run ends. Its
 * main process resolved the checkout's 1,387 project configs at about 2.3 GB RSS before
 * running a single test, and every Angular package it ran added about 30 MB more (measured
 * 2026-11-15: one package, 2.3 GB; 40 Angular packages, 3.5 GB). On 2026-11-15 the CI test
 * step ran out of its 4 GB heap after 2,347 test files (molecule run
 * 43693507546), and the cost grows with every package added. A group's memory depends on
 * the group size, not on the size of the fleet. The default leaves room for the heaviest
 * packages: with a 2 GB heap (half of CI's), 131 feature projects in one process ran out of
 * memory and 60 of them passed.
 *
 * The rule, the same for every invocation:
 *   - No arguments: every project, in groups.
 *   - Only path arguments, each naming a project directory, a directory that contains
 *     projects, or a path inside one project: the projects they name, in groups. Each group
 *     receives the arguments that selected one of its projects, so Vitest applies its own
 *     filter exactly as before.
 *   - Anything else (a flag, or a filter that names no project path): one Vitest process
 *     with the arguments unchanged, as `npm test` ran before this runner existed.
 *
 * `MOL_VITEST_SHARD=i/n` assigns sorted project directories round-robin to disjoint runners.
 * `MOL_VITEST_PRIORITY` is a JSON array of project directories to run first within that share.
 * `MOL_VITEST_FAIL_FAST=1` stops scheduling groups after a failure and uses Vitest's --bail=1.
 * `MOL_VITEST_TEST_TIMEOUT_MS=<ms>` passes `--testTimeout=<ms>` to every Vitest run this starts.
 * In projects mode Vitest copies that flag into each project, so it replaces each project's own
 * `testTimeout` (a timeout written on the test itself still wins). It is for a machine that runs
 * tests slower than CI, where CI stays the judge of test timing; CI does not set it.
 * Every run also prints the tests that used at least half of their time limit
 * (`scripts/vitest-budget-reporter.mjs`), beside the reporters Vitest picks on its own; in CI those
 * lines are the timing a release reads before it pushes. A caller that names a reporter gets only that.
 * By default every group runs even when an earlier one fails; the exit code is the lowest-numbered
 * failing group's. A signal stops the run: no further group starts. Groups are balanced (sizes
 * differ by at most one), so a run that fits in one group is exactly one Vitest run, as before.
 *
 * Up to `MOL_VITEST_GROUP_CONCURRENCY` groups (default {@link DEFAULT_GROUP_CONCURRENCY}) run
 * at once, each with an equal share of Vitest's default workers (CPUs − 1). Why: run one after
 * another, each group waits for its slowest file before the next starts, and every module
 * transform runs in one Vitest main process; on 2026-11-15 the grouped CI step took 1,434 s
 * where one process had taken 948 s for 14% less test work (runs 43698714841, 43672144670).
 * Memory stays bounded by the concurrency times the group size. When groups run at once, each
 * group's output is held in a file and printed whole when the group ends, so lines from two
 * groups never interleave; a single group or a concurrency of 1 prints live, as before.
 *
 * Usage: `node scripts/vitest-grouped.mjs [path filters…]` (this is `npm test`).
 *
 * @module scripts/vitest-grouped
 */

import { spawn } from 'node:child_process'
import console from 'node:console'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { availableParallelism, tmpdir } from 'node:os'
import { dirname, join, posix, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createRunRoot, runVitest } from './vitest-with-tmp-root.mjs'

/** The most projects one Vitest process starts, unless `MOL_VITEST_GROUP_PROJECTS` says otherwise. */
export const DEFAULT_GROUP_PROJECTS = 60

/** The most groups that run at once, unless `MOL_VITEST_GROUP_CONCURRENCY` says otherwise. */
export const DEFAULT_GROUP_CONCURRENCY = 2

/** Exit codes `runVitest` returns for a forwarded signal; the run stops there. */
const SIGNAL_CODES = new Set([129, 130, 143])

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Normalize a path argument to a repo-relative POSIX path.
 *
 * @param arg - A command-line argument.
 * @param root - Repository root.
 * @returns The relative path, or null when it points outside the repository.
 */
export function repoPath(arg, root = ROOT) {
  const rel = relative(root, resolve(root, arg)).split('\\').join('/')
  if (rel.startsWith('..') || posix.isAbsolute(rel)) return null
  return rel
}

/**
 * Every project config the root config's `projects` globs match, by project directory.
 *
 * @param patterns - The root config's `test.projects` entries.
 * @param root - Repository root.
 * @param globSync - Glob implementation, for tests.
 * @returns Repo-relative project directory → repo-relative config file, sorted by directory.
 */
export function projectConfigs(patterns, root = ROOT, globSync = fs.globSync) {
  const configs = new Map()
  for (const pattern of patterns) {
    if (typeof pattern !== 'string')
      throw new Error(`unsupported project entry: ${JSON.stringify(pattern)}`)
    for (const file of globSync(pattern, { cwd: root })) {
      const rel = file.split('\\').join('/')
      if (rel.split('/').includes('node_modules')) continue
      const dir = posix.dirname(rel)
      if (!configs.has(dir)) configs.set(dir, rel)
    }
  }
  return new Map([...configs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

/**
 * A path argument as Vitest matches it in every project: absolute, a directory with a trailing
 * slash. Vitest reads a relative filter against each project's `dir`, so a repo-relative path
 * selected no file of a project whose tests live in a `dir` of their own (the SvelteKit
 * routing bond's `src/__tests__`), while an absolute one matches by prefix wherever it is; the
 * slash keeps `features/foo` from matching `features/foo-bar`.
 *
 * @param root - Repository root.
 * @param path - A repo-relative path argument.
 * @returns The filter.
 */
export function absoluteFilter(root, path) {
  const full = join(root, path)
  return fs.existsSync(full) && fs.statSync(full).isDirectory() ? `${full}/` : full
}

/**
 * Which projects each path argument names: the project itself, the projects under a
 * directory, or the one project that contains a path.
 *
 * @param dirs - Project directories.
 * @param args - Path arguments, repo-relative.
 * @returns Selected directories with the arguments that selected each, or null when an
 *   argument names no project (the caller then runs Vitest unchanged).
 */
export function selectProjects(dirs, args) {
  if (!args.length) return new Map(dirs.map((dir) => [dir, []]))
  const selected = new Map()
  for (const arg of args) {
    const path = arg.replace(/\/+$/, '')
    const hits = dirs.filter(
      (dir) =>
        path === '' || dir === path || dir.startsWith(`${path}/`) || path.startsWith(`${dir}/`),
    )
    if (!hits.length) return null
    for (const dir of hits) selected.set(dir, [...(selected.get(dir) ?? []), arg])
  }
  return new Map([...selected].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

/**
 * Split items into the fewest groups of at most `max`, with sizes that differ by at most one.
 *
 * @param items - Items in run order.
 * @param max - Largest group.
 * @returns The groups.
 */
export function balancedGroups(items, max) {
  if (!Number.isInteger(max) || max < 1)
    throw new Error(`group size must be a positive integer, got ${max}`)
  const count = Math.max(1, Math.ceil(items.length / max))
  const groups = []
  let start = 0
  for (let index = 0; index < count; index += 1) {
    const size = Math.floor(items.length / count) + (index < items.length % count ? 1 : 0)
    groups.push(items.slice(start, start + size))
    start += size
  }
  return groups
}

/** Select one deterministic, disjoint share of projects; i/n is one-based. */
export function shardProjects(items, shard) {
  if (!shard) return items
  const match = String(shard).match(/^([1-9]\d*)\/([1-9]\d*)$/)
  const index = Number(match?.[1])
  const count = Number(match?.[2])
  if (!match || !Number.isSafeInteger(count) || index > count)
    throw new Error(`test shard must be i/n with 1 <= i <= n, got ${shard}`)
  return items.filter((_item, position) => position % count === index - 1)
}

/**
 * Each concurrent group's share of Vitest's default worker count (CPUs − 1), rounded up so
 * the groups together use at least that many.
 *
 * @param cpus - Available parallelism.
 * @param concurrency - Groups running at once.
 * @returns Workers for one group, at least 1.
 */
export function workersPerGroup(cpus, concurrency) {
  return Math.max(1, Math.ceil((cpus - 1) / concurrency))
}

/**
 * The Vitest arguments for `MOL_VITEST_TEST_TIMEOUT_MS`: none when it is unset or empty.
 *
 * @param value - The variable's value.
 * @returns `['--testTimeout=<ms>']`, or `[]`.
 */
export function testTimeoutArgs(value) {
  if (value === undefined || value === '') return []
  const ms = Number(value)
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(ms) || ms < 1)
    throw new Error(
      `MOL_VITEST_TEST_TIMEOUT_MS must be a positive integer of milliseconds, got ${value}`,
    )
  return [`--testTimeout=${ms}`]
}

/** The reporter that names tests near their time limit (scripts/vitest-budget-reporter.mjs). */
export const BUDGET_REPORTER = join(
  dirname(fileURLToPath(import.meta.url)),
  'vitest-budget-reporter.mjs',
)

/**
 * Whether Vitest treats this environment as an AI agent, read from the std-env module Vitest itself
 * reads, so the choice below is the one Vitest would make.
 *
 * @param root - Repository root, where Vitest is installed.
 * @returns True under an agent.
 */
async function vitestSeesAgent(root) {
  const vitest = createRequire(join(root, 'package.json')).resolve('vitest/package.json')
  const stdEnv = createRequire(vitest).resolve('std-env')
  return Boolean((await import(pathToFileURL(stdEnv).href)).isAgent)
}

/**
 * The reporter arguments for every Vitest run this starts: the reporters Vitest picks on its own
 * (`agent` under an AI agent, else `default`, plus `github-actions` in GitHub Actions), and then
 * {@link BUDGET_REPORTER}. Vitest picks its own only when no reporter is named, so naming the budget
 * reporter alone would drop them. A caller that names a reporter keeps exactly its choice.
 *
 * @param args - The caller's Vitest arguments.
 * @param options - All optional; the defaults are the real environment.
 * @param options.agent - Whether Vitest sees an AI agent.
 * @param options.env - The environment.
 * @returns The `--reporter` arguments, or `[]`.
 */
export function reporterArgs(args, { agent, env = process.env } = {}) {
  if (args.some((arg) => arg === '--reporter' || arg.startsWith('--reporter='))) return []
  return [
    `--reporter=${agent ? 'agent' : 'default'}`,
    ...(env.GITHUB_ACTIONS === 'true' ? ['--reporter=github-actions'] : []),
    `--reporter=${BUDGET_REPORTER}`,
  ]
}

/**
 * Run tasks with at most `limit` in flight, in order, until all have run or `stop()` says no
 * more may start.
 *
 * @param count - Number of tasks.
 * @param limit - Most tasks in flight.
 * @param task - Runs task `index` and resolves its result.
 * @param stop - Called after each task ends; true starts no further task.
 * @returns The results by index; tasks never started are absent.
 */
export async function runPool(count, limit, task, stop = () => false) {
  const results = []
  let next = 0
  let stopped = false
  const lane = async () => {
    while (!stopped && next < count) {
      const index = next
      next += 1
      results[index] = await task(index)
      if (stop(results[index])) stopped = true
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, count) }, lane))
  return results
}

/**
 * Which project configs declare projects of their own (`test.projects`): a package whose
 * tests need one Vite setup per configuration, as the SvelteKit routing bond runs its suite in
 * three kit apps (a root, a base path, hash routing), each with kit's plugin set up its way.
 *
 * Vitest reads `test.projects` only from the config it was started with. Listed as one project
 * of a group, such a config ran as a single plain project: none of its projects' plugins or
 * options applied, and its own include globs matched `dist/` copies too (2026-11-19: the kit
 * tests failed in the release's CI scope, "Failed to load tsconfig '$app/tsconfig'", while each
 * passed in the package). Imported into a group config as inline projects, the same kit projects
 * still failed (the hash-routing app's pages did not render), and they pass whenever Vitest loads
 * the file itself. So each such config is a group of its own, run with `--config` set to it.
 *
 * A config is imported only when its text names `projects`, which every such config must;
 * one exported as a function is read as declaring none.
 *
 * @param files - Absolute project config paths.
 * @returns The ones whose exported config sets `test.projects`.
 */
export async function configsWithProjects(files) {
  const out = new Set()
  for (const file of files) {
    if (!fs.readFileSync(file, 'utf8').includes('projects')) continue
    const { default: config } = await import(pathToFileURL(file).href)
    if (Array.isArray(config?.test?.projects)) out.add(file)
  }
  return out
}

/**
 * The Vitest config of one group: the repository root and that group's project configs.
 *
 * @param root - Repository root.
 * @param configs - Absolute project config paths.
 * @returns Module source.
 */
export function groupConfigSource(root, configs) {
  return `export default ${JSON.stringify({ root, test: { projects: configs } }, null, 2)}\n`
}

/**
 * Run the selected projects group by group.
 *
 * @param args - Command-line arguments after the script name.
 * @param [options] - All optional; the defaults are the real system.
 * @param [options.root] - Repository root.
 * @param [options.patterns] - Root `projects` globs; read from `vitest.config.ts` by default.
 * @param [options.max] - Largest group.
 * @param [options.concurrency] - Most groups running at once.
 * @param [options.cpus] - Available parallelism, for the per-group worker share.
 * @param [options.run] - Runs one Vitest invocation and resolves its exit code; `output`, when
 *   given, names the files its stdout and stderr go to instead of this process's.
 * @param [options.globSync] - Glob implementation, for tests.
 * @param [options.log] - Progress output.
 * @param [options.print] - Writes a held group's output: `(stream, bytes)`.
 * @returns The exit code.
 */
export async function runGrouped(args, options = {}) {
  // createRunRoot points TMPDIR at the run root it creates, and that root is removed when its
  // run ends: every later run root must come from the temp directory this process started with.
  const base = tmpdir()
  const {
    root = ROOT,
    max = Number(process.env.MOL_VITEST_GROUP_PROJECTS || DEFAULT_GROUP_PROJECTS),
    concurrency = Number(process.env.MOL_VITEST_GROUP_CONCURRENCY || DEFAULT_GROUP_CONCURRENCY),
    cpus = availableParallelism(),
    shard = process.env.MOL_VITEST_SHARD || '',
    failFast = process.env.MOL_VITEST_FAIL_FAST === '1',
    testTimeout = process.env.MOL_VITEST_TEST_TIMEOUT_MS,
    priority = JSON.parse(process.env.MOL_VITEST_PRIORITY || '[]'),
    run = (vitestArgs, { output } = {}) =>
      runVitest(vitestArgs, {
        cwd: root,
        createRoot: () => createRunRoot({ base }),
        spawnImpl: output ? spawnTo(output) : spawn,
      }),
    globSync = fs.globSync,
    log = (line) => console.error(line),
    print = (stream, bytes) => (stream === 'stderr' ? process.stderr : process.stdout).write(bytes),
  } = options
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new Error(`group concurrency must be a positive integer, got ${concurrency}`)
  const timeoutArgs = testTimeoutArgs(testTimeout)
  const reporters = reporterArgs(args, { agent: options.agent ?? (await vitestSeesAgent(root)) })
  const unchanged = () => {
    if (shard)
      throw new Error('test sharding requires project path filters, not flags or unknown paths')
    return run(['run', ...timeoutArgs, ...reporters, ...args])
  }
  if (args.some((arg) => arg.startsWith('-'))) return unchanged()
  const paths = args.map((arg) => repoPath(arg, root))
  if (paths.includes(null)) return unchanged()
  const patterns = options.patterns ?? (await rootProjectPatterns(root))
  const configs = projectConfigs(patterns, root, globSync)
  const selected = selectProjects([...configs.keys()], paths)
  if (!selected) {
    log('[vitest-grouped] a filter names no project path; running Vitest unchanged')
    return unchanged()
  }
  if (!Array.isArray(priority) || priority.some((dir) => typeof dir !== 'string'))
    throw new Error('test priority must be a JSON array of project directories')
  const preferred = new Set(priority)
  const projects = shardProjects([...selected.keys()], shard).sort(
    (a, b) => Number(preferred.has(b)) - Number(preferred.has(a)),
  )
  if (shard) log(`[vitest-grouped] shard ${shard}: ${projects.length}/${selected.size} projects`)
  if (!projects.length) {
    if (!selected.size) throw new Error('no Vitest projects selected')
    return 0 // A valid shard can be empty when there are fewer projects than runners.
  }
  // A config that declares projects of its own runs alone, as Vitest loads it (configsWithProjects).
  const declaring = await configsWithProjects(projects.map((dir) => join(root, configs.get(dir))))
  const ownsRun = (dir) => declaring.has(join(root, configs.get(dir)))
  const shared = projects.filter((dir) => !ownsRun(dir))
  const groups = [
    ...(shared.length ? balancedGroups(shared, max) : []),
    ...projects.filter(ownsRun).map((dir) => [dir]),
  ]
  const parallel = Math.min(concurrency, groups.length)
  const workers = parallel > 1 ? [`--maxWorkers=${workersPerGroup(cpus, parallel)}`] : []
  const scratch = fs.mkdtempSync(join(base, 'mol-vitest-groups-'))
  try {
    const codes = await runPool(
      groups.length,
      parallel,
      async (index) => {
        const group = groups[index]
        const name = `group ${index + 1}/${groups.length}`
        let config = join(root, configs.get(group[0]))
        if (!ownsRun(group[0])) {
          config = join(scratch, `group-${index + 1}.config.mjs`)
          fs.writeFileSync(
            config,
            groupConfigSource(
              root,
              group.map((dir) => join(root, configs.get(dir))),
            ),
          )
        }
        const filters = [...new Set(group.flatMap((dir) => selected.get(dir)))].map((path) =>
          absoluteFilter(root, path),
        )
        const output =
          parallel > 1
            ? {
                stdout: join(scratch, `group-${index + 1}.stdout`),
                stderr: join(scratch, `group-${index + 1}.stderr`),
              }
            : undefined
        const started = Date.now()
        log(`[vitest-grouped] ${name}: ${group.length} projects (${group[0]} … ${group.at(-1)})`)
        const code = await run(
          [
            'run',
            '--config',
            config,
            ...workers,
            ...(failFast ? ['--bail=1'] : []),
            ...timeoutArgs,
            ...reporters,
            ...filters,
          ],
          { output },
        )
        if (output)
          for (const stream of ['stdout', 'stderr'])
            if (fs.existsSync(output[stream])) print(stream, fs.readFileSync(output[stream]))
        log(
          `[vitest-grouped] ${name} exited ${code} after ${Math.round((Date.now() - started) / 1000)} s`,
        )
        return code
      },
      (code) => SIGNAL_CODES.has(code) || (failFast && code !== 0),
    )
    return codes.find((code) => code !== undefined && code !== 0) ?? 0
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}

/**
 * A spawner that sends the child's stdout and stderr to two files.
 *
 * @param output - File paths for each stream.
 * @param output.stdout - Where stdout goes.
 * @param output.stderr - Where stderr goes.
 * @returns A `spawn` replacement for `runVitest`.
 */
function spawnTo(output) {
  return (command, args, options) => {
    const out = fs.openSync(output.stdout, 'w')
    const err = fs.openSync(output.stderr, 'w')
    try {
      return spawn(command, args, { ...options, stdio: ['ignore', out, err] })
    } finally {
      // The child holds its own copies of the descriptors.
      fs.closeSync(out)
      fs.closeSync(err)
    }
  }
}

/**
 * The `test.projects` entries of the repository's root Vitest config.
 *
 * @param root - Repository root.
 * @returns The glob patterns.
 */
export async function rootProjectPatterns(root = ROOT) {
  const { default: config } = await import(pathToFileURL(join(root, 'vitest.config.ts')).href)
  const projects = config?.test?.projects
  if (!Array.isArray(projects) || !projects.length)
    throw new Error('vitest.config.ts declares no test.projects')
  return projects
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runGrouped(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[vitest-grouped] ${error.stack ?? error}`)
      process.exit(1)
    },
  )
}
