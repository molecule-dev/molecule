#!/usr/bin/env node
/* global console, process */

/**
 * SEC3 regression guard — the core `@molecule/*` library publishes to npm, so its
 * CI must carry the same secure-by-default gates mlcl ships and scaffolds into
 * every generated project. This asserts the `security` job in
 * .github/workflows/ci.yml stays present and is not silently weakened:
 *
 *   - a `security:` job exists;
 *   - it runs the dependency audit at `moderate` — either bare
 *     `npm audit --audit-level=moderate` or scripts/audit-gate.mjs, which wraps it
 *     with narrow, documented, EXPIRING exceptions. The level is NOT relaxed to
 *     `high`/`critical`, and when the wrapper is used its own bar and the shape
 *     of every allowlist entry (named advisories + reason + expiry) are checked
 *     too, so the wrapper cannot become a permanent silent mute;
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

// The dependency audit gate, at moderate. Either the bare npm command (mlcl's
// shape) or scripts/audit-gate.mjs, which wraps it to allow narrow, documented,
// EXPIRING exceptions for advisories with no upstream fix. The wrapper exists
// because a gate pinned red by an unfixable finding gets ignored wholesale
// (2026-08-14: red for two days, three fleet releases published past it).
const usesBareAudit = code.includes('npm audit --audit-level=moderate')
const usesAuditGate = /node\s+scripts\/audit-gate\.mjs/.test(code)
if (!usesBareAudit && !usesAuditGate) {
  errors.push(
    'the dependency audit gate is missing (expected `npm audit --audit-level=moderate` or `node scripts/audit-gate.mjs`)',
  )
}

// Guard against the level being relaxed to dodge findings (Rule 9 — no shim).
const relaxed = code.match(/npm audit --audit-level=(high|critical)/)
if (relaxed) {
  errors.push(
    `the audit level was relaxed to \`${relaxed[1]}\` — keep it at \`moderate\` so moderate advisories still fail CI`,
  )
}

// When the wrapper is used, the same properties must hold INSIDE it: the bar is
// still moderate, and every exception is justified and dated. Without this the
// wrapper would be a place to quietly raise the bar or park a permanent mute —
// exactly what this guard exists to prevent.
if (usesAuditGate) {
  const gatePath = join(import.meta.dirname, 'audit-gate.mjs')
  const allowPath = join(import.meta.dirname, '..', '.audit-allowlist.json')
  let gate = ''
  try {
    gate = readFileSync(gatePath, 'utf-8')
  } catch {
    errors.push('ci.yml runs scripts/audit-gate.mjs but that script is missing')
  }
  if (gate && !/FAIL_AT\s*=\s*\[[^\]]*'moderate'/.test(gate)) {
    errors.push('scripts/audit-gate.mjs no longer fails at `moderate` — the audit bar was raised')
  }
  try {
    const allow = JSON.parse(readFileSync(allowPath, 'utf-8'))
    for (const entry of allow.accepted ?? []) {
      const label = entry.package ?? JSON.stringify(entry.advisories)
      if (!entry.expires || !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) {
        errors.push(
          `audit allowlist entry for ${label} has no valid \`expires\` date — exceptions must lapse`,
        )
      }
      if (!entry.reason || entry.reason.length < 40) {
        errors.push(
          `audit allowlist entry for ${label} needs a written \`reason\` (what the exposure is, and why there is no fix)`,
        )
      }
      if (!Array.isArray(entry.advisories) || entry.advisories.length === 0) {
        errors.push(
          `audit allowlist entry for ${label} must name the specific advisories it accepts`,
        )
      }
    }
  } catch (error) {
    if (!(error instanceof SyntaxError) && error.code !== 'ENOENT') throw error
    errors.push('.audit-allowlist.json is missing or is not valid JSON')
  }
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
