#!/usr/bin/env node
/**
 * No unconsumed changeset may exist on the branch that publishes.
 *
 * Versioning is a LOCAL step here: a change lands together with its version
 * bump and CHANGELOG line (`npm run version` consumes the changeset), and the
 * Release workflow only publishes what git already records. A changeset file
 * still under `.changeset/` therefore means a package was changed and never
 * versioned — and the Release workflow refuses to run at all while one exists
 * (its own guard), so every package in that wave waits behind it.
 *
 * On 2026-09-28 nine committed changesets sat unconsumed on main; a Release was
 * dispatched against them and failed, and the versioning had to be done by
 * whichever session noticed. This check turns that into a red CI run on the
 * push that carried the changeset, and a refusal in the release script before
 * anything is pushed or dispatched.
 *
 * Tracked files only: an untracked changeset in a working tree belongs to a
 * change that is not committed yet, and neither a push nor CI ever sees it.
 *
 * Usage:
 *   node scripts/check-changesets-consumed.mjs        # exit 1 and list them
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const pending = execFileSync('git', ['ls-files', '.changeset'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .map((p) => p.replace(/^\.changeset\//, ''))
  .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')

if (pending.length) {
  console.error(`✗ ${pending.length} unconsumed changeset(s) — version locally before pushing:`)
  for (const f of pending) console.error(`    .changeset/${f}`)
  console.error(
    `\n  npm run version   # bump package.json + CHANGELOG, consume the changeset, refresh the lockfile\n  then commit the result with the change.`,
  )
  process.exit(1)
}
console.log('✓ no unconsumed changesets')
