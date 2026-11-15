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
 * Every group runs even when an earlier one fails; the exit code is the first failure's.
 * A signal stops the run at the current group. Groups are balanced (sizes differ by at most
 * one), so a run that fits in one group is exactly one Vitest run, as before.
 *
 * Usage: `node scripts/vitest-grouped.mjs [path filters…]` (this is `npm test`).
 *
 * @module scripts/vitest-grouped
 */

import console from 'node:console'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, posix, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createRunRoot, runVitest } from './vitest-with-tmp-root.mjs'

/** The most projects one Vitest process starts, unless `MOL_VITEST_GROUP_PROJECTS` says otherwise. */
export const DEFAULT_GROUP_PROJECTS = 60

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
 * @param [options.run] - Runs one Vitest invocation and resolves its exit code.
 * @param [options.globSync] - Glob implementation, for tests.
 * @param [options.log] - Progress output.
 * @returns The exit code.
 */
export async function runGrouped(args, options = {}) {
  // createRunRoot points TMPDIR at the run root it creates, and that root is removed when its
  // run ends: every later run root must come from the temp directory this process started with.
  const base = tmpdir()
  const {
    root = ROOT,
    max = Number(process.env.MOL_VITEST_GROUP_PROJECTS || DEFAULT_GROUP_PROJECTS),
    run = (vitestArgs) =>
      runVitest(vitestArgs, { cwd: root, createRoot: () => createRunRoot({ base }) }),
    globSync = fs.globSync,
    log = (line) => console.error(line),
  } = options
  const unchanged = () => run(['run', ...args])
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
  const groups = balancedGroups([...selected.keys()], max)
  const scratch = fs.mkdtempSync(join(base, 'mol-vitest-groups-'))
  let exitCode = 0
  try {
    for (const [index, group] of groups.entries()) {
      const config = join(scratch, `group-${index + 1}.config.mjs`)
      fs.writeFileSync(
        config,
        groupConfigSource(
          root,
          group.map((dir) => join(root, configs.get(dir))),
        ),
      )
      const filters = [...new Set(group.flatMap((dir) => selected.get(dir)))]
      const started = Date.now()
      log(
        `[vitest-grouped] group ${index + 1}/${groups.length}: ${group.length} projects (${group[0]} … ${group.at(-1)})`,
      )
      const code = await run(['run', '--config', config, ...filters])
      log(
        `[vitest-grouped] group ${index + 1}/${groups.length} exited ${code} after ${Math.round((Date.now() - started) / 1000)} s`,
      )
      if (code !== 0 && exitCode === 0) exitCode = code
      if (SIGNAL_CODES.has(code)) break
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
  return exitCode
}

/**
 * The `test.projects` entries of the repository's root Vitest config.
 *
 * @param root - Repository root.
 * @returns The glob patterns.
 */
async function rootProjectPatterns(root) {
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
