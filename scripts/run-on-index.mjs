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
import { existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
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
 */
export function exportIndex(repo, dest) {
  execFileSync('git', ['checkout-index', '-a', `--prefix=${dest}/`], { cwd: repo })
  const modules = join(repo, 'node_modules')
  if (existsSync(modules)) symlinkSync(modules, join(dest, 'node_modules'), 'dir')
}

/**
 * Runs each command from an export of the index.
 *
 * @param repo - The repository root.
 * @param commands - Each a script path relative to the root, then its arguments.
 * @returns The first failing command's exit status, or 0.
 */
export function runOnIndex(repo, commands) {
  const tree = mkdtempSync(join(tmpdir(), 'molecule-index-'))
  let status = 0
  try {
    exportIndex(repo, tree)
    for (const command of commands) {
      const [script, ...args] = command.split(' ').filter(Boolean)
      if (!existsSync(join(tree, script))) {
        console.error(`run-on-index: the commit does not carry ${script}`)
        status ||= 1
        continue
      }
      const child = spawnSync(process.execPath, [join(tree, script), ...args], {
        cwd: tree,
        stdio: 'inherit',
      })
      if (child.error) console.error(`run-on-index: ${script} did not run: ${child.error.message}`)
      const code = child.error ? 1 : (child.status ?? 1)
      if (code !== 0) status ||= code
    }
  } finally {
    rmSync(tree, { recursive: true, force: true })
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
  process.exit(runOnIndex(repo, commands))
}
