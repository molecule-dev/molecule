#!/usr/bin/env node
/**
 * No unconsumed changeset may exist on the branch that publishes, except a
 * review hold recorded exactly in `.changeset/held.json`.
 *
 * Versioning is local. A held record names the packages still awaiting review
 * and every changeset allowed to remain; a mixed, unlisted, or stale entry is
 * refused. Committed files only (HEAD, not the index) keep another session's
 * staged work out of this release's verdict.
 *
 * Usage:
 *   node scripts/check-changesets-consumed.mjs
 *   node scripts/check-changesets-consumed.mjs --release-workflow
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  auditHeldChangesets,
  HELD_CHANGESETS_FILE,
  parseHeldRecord,
} from './lib/held-changesets.mjs'

const ROOT = process.env.MOL_CHANGESET_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..')
const WORKFLOW = process.argv.includes('--release-workflow')
const require = createRequire(import.meta.url)
// Use the parser shipped with the declared Changesets CLI rather than a second
// YAML implementation with different frontmatter rules.
const changesetsRequire = createRequire(require.resolve('@changesets/cli/package.json'))
const parseChangeset = changesetsRequire('@changesets/parse').default

const git = (args) =>
  execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
  })
const committed = (file) => git(['show', `HEAD:${file}`])
const entries = git(['ls-tree', '-rz', '--name-only', 'HEAD', '--', '.changeset'])
  .split('\0')
  .filter(Boolean)
const pending = entries
  .filter((file) => file.endsWith('.md') && file.toLowerCase() !== '.changeset/readme.md')
  .sort()

let record = null
let audit
try {
  if (entries.includes(HELD_CHANGESETS_FILE))
    record = parseHeldRecord(committed(HELD_CHANGESETS_FILE))
  audit = auditHeldChangesets({
    pending,
    record,
    readPackages: (file) => parseChangeset(committed(file)).releases.map((release) => release.name),
  })
} catch (error) {
  audit = { unheld: pending, problems: [error.message] }
}

if (audit.unheld.length || audit.problems.length) {
  if (WORKFLOW) {
    if (record) {
      console.error('::error::Changesets outside the committed review hold are present.')
      for (const file of audit.unheld) console.error(`  ${file}`)
      for (const problem of audit.problems) console.error(`  ${problem}`)
      console.error('  Only changesets whose packages are all held may remain unpublished.')
    } else {
      console.error('::error::Unconsumed changeset(s) present. Versioning is a LOCAL step now:')
      console.error('  1. npm run version   # bump + CHANGELOG + consume changesets + lockfile')
      console.error('  2. commit and push the result')
      console.error('  3. re-trigger Release (it publishes; it does not version)')
    }
  } else {
    console.error(
      record
        ? `✗ ${audit.unheld.length} unconsumed changeset(s) outside ${HELD_CHANGESETS_FILE}:`
        : `✗ ${pending.length} unconsumed changeset(s) — version locally before pushing:`,
    )
    for (const file of audit.unheld) console.error(`    ${file}`)
    for (const problem of audit.problems) console.error(`    ${problem}`)
    console.error(
      `\n  npm run version   # bump package.json + CHANGELOG, consume the changeset, refresh the lockfile\n  then commit the result with the change.`,
    )
  }
  process.exit(1)
}

if (!pending.length) {
  console.log(
    WORKFLOW
      ? 'No pending changesets — versions are committed; proceeding to publish.'
      : '✓ no unconsumed changesets',
  )
} else {
  console.log(
    WORKFLOW
      ? `${pending.length} held changeset(s) are recorded in ${HELD_CHANGESETS_FILE}; proceeding to publish.`
      : `✓ no unconsumed changesets outside ${HELD_CHANGESETS_FILE} (${pending.length} held)`,
  )
}
