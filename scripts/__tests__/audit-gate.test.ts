/** The real audit CLI must distinguish a clean scan from an unavailable scan. */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { describe, expect, it } from 'vitest'

/** Run the actual script with npm's response supplied through its executable boundary. */
function audit(report: unknown, exitCode = 0, accepted: object[] = [], args: string[] = []) {
  const root = mkdtempSync(join(tmpdir(), 'molecule-audit-control-'))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'bin'))
    copyFileSync(
      new URL('../audit-gate.mjs', import.meta.url),
      join(root, 'scripts/audit-gate.mjs'),
    )
    writeFileSync(join(root, '.audit-allowlist.json'), JSON.stringify({ accepted }))
    writeFileSync(
      join(root, 'bin/npm'),
      `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(JSON.stringify(report))});process.exitCode=${exitCode};\n`,
      { mode: 0o755 },
    )
    return spawnSync(process.execPath, [join(root, 'scripts/audit-gate.mjs'), ...args], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${join(root, 'bin')}${delimiter}${process.env.PATH}` },
      timeout: 10_000,
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const clean = { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } }
const vulnerable = {
  vulnerabilities: {
    example: {
      severity: 'high',
      via: [{ url: 'https://github.com/advisories/GHSA-example-control' }],
      fixAvailable: true,
    },
  },
  metadata: { vulnerabilities: { high: 1, total: 1 } },
}

describe('audit-gate CLI', () => {
  it('accepts a complete clean report without an installed dependency tree', () => {
    expect(audit(clean).status).toBe(0)
  })

  it.each([[], ['--list']])('refuses npm endpoint errors with args %j', (...args) => {
    const result = audit({ error: { code: 'ENOTFOUND' } }, 1, [], args as string[])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('complete vulnerability report')
    expect(result.stdout).not.toContain('no unaccepted')
  })

  it.each([{}, { vulnerabilities: {} }, { ...clean, vulnerabilities: [] }])(
    'refuses an incomplete report %j',
    (report) => {
      expect(audit(report).status).toBe(2)
    },
  )

  it('still fails a real unaccepted advisory', () => {
    expect(audit(vulnerable, 1).status).toBe(1)
  })

  it('preserves the narrow, dated exception and its expiry', () => {
    const exception = {
      advisories: ['GHSA-example-control'],
      reason: 'Consumer control',
      expires: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    }
    expect(audit(vulnerable, 1, [exception]).status).toBe(0)
    expect(audit(vulnerable, 1, [{ ...exception, expires: '2000-01-01' }]).status).toBe(1)
  })

  it('requires every advisory a package is vulnerable through to be accepted', () => {
    const expires = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const twoAdvisories = {
      vulnerabilities: {
        matcher: {
          severity: 'moderate',
          via: [{ url: 'https://github.com/advisories/GHSA-first-control' }],
          fixAvailable: false,
        },
        walker: {
          severity: 'moderate',
          via: ['matcher', { url: 'https://github.com/advisories/GHSA-second-control' }],
          fixAvailable: false,
        },
      },
      metadata: { vulnerabilities: { moderate: 2, total: 2 } },
    }
    const first = { advisories: ['GHSA-first-control'], reason: 'First control', expires }
    const second = { advisories: ['GHSA-second-control'], reason: 'Second control', expires }
    const onlyFirst = audit(twoAdvisories, 1, [first])
    expect(onlyFirst.status).toBe(1)
    expect(onlyFirst.stderr).toContain('advisory in walker')
    expect(onlyFirst.stderr).toContain('unaccepted: GHSA-second-control')
    expect(audit(twoAdvisories, 1, [first, second]).status).toBe(0)
    expect(audit(twoAdvisories, 1, [first, { ...second, expires: '2000-01-01' }]).status).toBe(1)
  })

  it('needs no entry for a low advisory riding along an accepted chain', () => {
    const expires = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const report = {
      vulnerabilities: {
        merger: {
          severity: 'low',
          via: [{ url: 'https://github.com/advisories/GHSA-low-control', severity: 'low' }],
          fixAvailable: false,
        },
        builder: {
          severity: 'moderate',
          via: [
            'merger',
            { url: 'https://github.com/advisories/GHSA-moderate-control', severity: 'moderate' },
          ],
          fixAvailable: false,
        },
      },
      metadata: { vulnerabilities: { low: 1, moderate: 1, total: 2 } },
    }
    const moderate = { advisories: ['GHSA-moderate-control'], reason: 'Moderate control', expires }
    expect(audit(report, 1).status).toBe(1)
    expect(audit(report, 1, [moderate]).status).toBe(0)
  })

  it('fails a finding whose advisory cannot be identified', () => {
    const unidentified = {
      vulnerabilities: {
        orphan: { severity: 'high', via: ['missing-dependency'], fixAvailable: false },
      },
      metadata: { vulnerabilities: { high: 1, total: 1 } },
    }
    expect(audit(unidentified, 1).status).toBe(1)
  })
})
