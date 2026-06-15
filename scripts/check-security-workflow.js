#!/usr/bin/env node
/* global console, process */

/**
 * SEC3 regression guard — the core `@molecule/*` library publishes to npm, so its
 * CI must carry the same secure-by-default gates mlcl ships and scaffolds into
 * every generated project. This asserts the `security` job in
 * .github/workflows/ci.yml stays present and is not silently weakened:
 *
 *   - a `security:` job exists;
 *   - it runs `npm audit --audit-level=moderate` (and the level is NOT relaxed
 *     to `high`/`critical`, which would let moderate advisories ship silently);
 *   - it runs a gitleaks working-tree secret scan (`--no-git`, so a credential
 *     in an open PR is caught before merge).
 *
 * Runs in the `build` job (a different job from `security`) so removing the
 * security job is caught even when the runner can't reach Docker/the registry.
 * No YAML parser dependency — molecule's standalone CI doesn't install one, so
 * this is a deliberate text-level check (matching check-lockfile.js et al.).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CI_YML = join(import.meta.dirname, '..', '.github', 'workflows', 'ci.yml')

let yaml
try {
  yaml = readFileSync(CI_YML, 'utf-8')
} catch (error) {
  console.error(`ERROR: cannot read ${CI_YML} — the CI workflow is missing.`, error)
  process.exit(1)
}

const errors = []

// Strip comment-only lines so the command-level assertions below reflect what
// actually RUNS — not a `--no-git`/`moderate` mention that survives in a comment
// after the real flag is removed.
const code = yaml
  .split('\n')
  .filter((line) => !/^\s*#/.test(line))
  .join('\n')

// The `security:` job must exist (top-level job key under `jobs:`).
if (!/^\s{2}security:\s*$/m.test(yaml)) {
  errors.push('the `security:` job is missing from .github/workflows/ci.yml')
}

// The dependency audit gate, at moderate. Mirrors mlcl's gate exactly.
if (!code.includes('npm audit --audit-level=moderate')) {
  errors.push('the `npm audit --audit-level=moderate` gate is missing or its level was changed')
}

// Guard against the level being relaxed to dodge findings (Rule 9 — no shim).
const relaxed = code.match(/npm audit --audit-level=(high|critical)/)
if (relaxed) {
  errors.push(
    `the audit level was relaxed to \`${relaxed[1]}\` — keep it at \`moderate\` so moderate advisories still fail CI`,
  )
}

// The secret scan: gitleaks, scanning the working tree (--no-git), not just git history.
if (!/gitleaks/.test(code)) {
  errors.push('the gitleaks secret-scan step is missing')
}
if (!code.includes('--no-git')) {
  errors.push('the gitleaks scan must pass `--no-git` (scan the working tree, not just history)')
}

if (errors.length > 0) {
  console.error('Security workflow check failed:')
  for (const error of errors) console.error(`  - ${error}`)
  console.error('\nSee the `security:` job in .github/workflows/ci.yml (SEC3).')
  process.exit(1)
}

console.log('Security workflow OK — audit (moderate) + gitleaks (--no-git) gates present.')
