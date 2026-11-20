#!/usr/bin/env node
/**
 * Runs whole-tree checks against the tree a commit carries, not the worktree.
 *
 *   node scripts/run-on-index.mjs "scripts/check-lockfile.js" "scripts/check-i18n-parity.js --check"
 *
 * Exports the index (`git checkout-index -a`, which honours a private
 * `GIT_INDEX_FILE` and a pathspec commit's temporary index) into a temporary
 * directory, links the checkout's `node_modules` into it, runs each command's
 * script from the export with the export as the working directory, and removes
 * the export. Each command is a script path relative to the repository root,
 * then its arguments, separated by spaces. Exits with the first failing
 * command's status; the rest still run, so one commit attempt reports every gap.
 *
 * WHY: the pre-commit hook ran these checks over the shared worktree, which
 * holds more than the commit — another session's untracked package or unstaged
 * dependency. On 2026-11-13 two untracked bond packages (no lock file entry, no
 * LICENSE) refused every commit in the repository until their author finished.
 * The export is what a fresh clone and CI see. The scripts run as the commit
 * carries them too, so a staged change to a check is judged by that change.
 *
 * @module
 */

import { execFileSync, spawnSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/**
 * Exports the index of `repo` into `dest` and links the checkout's
 * `node_modules`, so the exported scripts resolve the same packages.
 *
 * @param repo - The repository root.
 * @param dest - An empty directory.
 * @param files - NUL-delimited paths to export, or undefined for the whole tree.
 */
export function exportIndex(repo, dest, files) {
  execFileSync(
    'git',
    ['checkout-index', `--prefix=${dest}/`, ...(files === undefined ? ['-a'] : ['-z', '--stdin'])],
    { cwd: repo, input: files },
  )
  const modules = [join(repo, 'node_modules'), join(repo, '..', 'node_modules')].find(existsSync)
  if (modules) symlinkSync(modules, join(dest, 'node_modules'), 'dir')
}

/**
 * Runs each command from an export of the index.
 *
 * @param repo - The repository root.
 * @param commands - Each a script path relative to the root, then its arguments.
 * @param scope - Hook mode: 'tree' gives checks the staged path list, 'changed' exports
 * only changed files and prettier configuration for documentation commits.
 * @returns The first failing command's exit status, or 0.
 */
export function runOnIndex(repo, commands, scope) {
  const scratch = mkdtempSync(join(tmpdir(), 'molecule-index-'))
  let status = 0
  try {
    const tree = join(scratch, 'tree')
    mkdirSync(tree)
    const git = (args) => execFileSync('git', args, { cwd: repo, maxBuffer: 1 << 24 })
    const pathsFile = join(scratch, 'staged-paths')
    const base = process.env.MOL_PRECOMMIT_BASE
    const diff = (filters) =>
      git([
        'diff',
        '--cached',
        '-z',
        '--name-only',
        '--no-renames',
        ...filters,
        ...(base ? [base] : []),
      ])
    let files
    if (scope) writeFileSync(pathsFile, diff([]))
    if (scope === 'changed') {
      const config = git([
        'ls-files',
        '-z',
        '--',
        'scripts/check-index-files.mjs',
        ':(glob)**/.prettier*',
        ':(glob)**/prettier.config.*',
        ':(glob)**/package.json',
      ])
      const present = diff(['--diff-filter=AMT'])
      files = [...new Set(`${config}${present}`.split('\0').filter(Boolean))].join('\0') + '\0'
    }
    exportIndex(repo, tree, files)
    for (const command of commands) {
      const [script, ...args] = command.split(' ').filter(Boolean)
      if (!existsSync(join(tree, script))) {
        console.error(`run-on-index: the commit does not carry ${script}`)
        status ||= 1
        continue
      }
      const child = spawnSync(process.execPath, [join(tree, script), ...args], {
        cwd: tree,
        env: scope ? { ...process.env, MOL_INDEX_PATHS_FILE: pathsFile } : process.env,
        stdio: 'inherit',
      })
      const code = child.error ? 1 : (child.status ?? 1)
      if (code !== 0) {
        console.error(
          `run-on-index: ${script} failed (${child.error?.message ?? child.signal ?? code})`,
        )
        status ||= code
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  return status
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const commands = process.argv.slice(2)
  if (!commands.length) {
    console.error('usage: node scripts/run-on-index.mjs "<script> [args]" …')
    process.exit(2)
  }
  const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  process.exit(runOnIndex(repo, commands, process.env.MOL_RUN_ON_INDEX))
}
