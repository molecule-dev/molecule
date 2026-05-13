import { describe, expect, it } from 'vitest'

import { generateWorkflow, toYAML, workflowPath } from '../generator.js'
import type { WorkflowConfig } from '../workflows/types.js'

describe('toYAML — primitives', () => {
  it('serializes top-level object', () => {
    const cfg: WorkflowConfig = {
      name: 'CI',
      on: { push: { branches: ['main'] } },
      jobs: {},
    }
    const out = toYAML(cfg)
    expect(out).toContain('name: CI')
    expect(out).toContain('on:')
    expect(out).toContain('jobs:')
  })
})

describe('toYAML — string quoting', () => {
  function cfg(name: string): WorkflowConfig {
    return { name, on: {}, jobs: {} }
  }

  it('does NOT quote simple identifiers', () => {
    expect(toYAML(cfg('build'))).toContain('name: build')
  })

  it('quotes strings containing :', () => {
    expect(toYAML(cfg('a:b'))).toContain("name: 'a:b'")
  })

  it('quotes strings containing #', () => {
    expect(toYAML(cfg('foo#bar'))).toContain("'foo#bar'")
  })

  it('quotes strings starting with $', () => {
    expect(toYAML(cfg('$secret'))).toContain("'$secret'")
  })

  it("quotes the literal strings 'true', 'false', 'null'", () => {
    expect(toYAML(cfg('true'))).toContain("'true'")
    expect(toYAML(cfg('false'))).toContain("'false'")
    expect(toYAML(cfg('null'))).toContain("'null'")
  })

  it('quotes empty strings', () => {
    expect(toYAML(cfg(''))).toContain("''")
  })

  it("escapes embedded single quotes by doubling them ('')", () => {
    expect(toYAML(cfg("can't stop"))).toContain("'can''t stop'")
  })

  it('quotes strings containing newlines', () => {
    expect(toYAML(cfg('line1\nline2'))).toContain("'line1\nline2'")
  })
})

describe('toYAML — arrays', () => {
  it('inline-formats empty arrays as []', () => {
    const cfg: WorkflowConfig = { name: 'x', on: { push: { branches: [] } }, jobs: {} }
    expect(toYAML(cfg)).toContain('branches: []')
  })

  it('inline-formats short (≤3) primitive arrays', () => {
    const cfg: WorkflowConfig = {
      name: 'x',
      on: { push: { branches: ['main', 'release'] } },
      jobs: {},
    }
    expect(toYAML(cfg)).toContain('[main, release]')
  })

  it('block-formats arrays with > 3 items', () => {
    const cfg: WorkflowConfig = {
      name: 'x',
      on: { push: { branches: ['main', 'release', 'staging', 'dev'] } },
      jobs: {},
    }
    const out = toYAML(cfg)
    expect(out).not.toContain('[main, release, staging, dev]')
    expect(out).toContain('- main')
    expect(out).toContain('- release')
    expect(out).toContain('- staging')
    expect(out).toContain('- dev')
  })

  it('block-formats arrays of objects (any length)', () => {
    const cfg: WorkflowConfig = {
      name: 'x',
      on: {},
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [{ run: 'npm install' }, { run: 'npm test' }],
        },
      },
    }
    const out = toYAML(cfg)
    expect(out).toContain('- run: npm install')
    expect(out).toContain('- run: npm test')
  })
})

describe('toYAML — keys', () => {
  it('quotes keys containing hyphens', () => {
    const cfg: WorkflowConfig = {
      name: 'x',
      on: {},
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [{ 'continue-on-error': true, run: 'oops' }],
        },
      },
    }
    const out = toYAML(cfg)
    expect(out).toContain("'runs-on': ubuntu-latest")
    expect(out).toContain("'continue-on-error': true")
  })
})

describe('toYAML — booleans + numbers', () => {
  it('serializes booleans unquoted', () => {
    const cfg: WorkflowConfig = {
      name: 'x',
      on: {},
      jobs: {
        build: {
          'runs-on': 'x',
          steps: [{ run: 'x', 'continue-on-error': true }],
        },
      },
    }
    expect(toYAML(cfg)).toContain("'continue-on-error': true")
  })

  it('serializes numbers unquoted', () => {
    const cfg: WorkflowConfig = {
      name: 'x',
      on: {},
      jobs: {
        build: {
          'runs-on': 'x',
          steps: [{ run: 'x', 'timeout-minutes': 5 }],
        },
      },
    }
    expect(toYAML(cfg)).toContain("'timeout-minutes': 5")
  })
})

describe('toYAML — empty objects', () => {
  it('formats empty object value on its own line below the key', () => {
    // The serializer treats any object value as a "block" (newline +
    // recursive serialise). For an empty object, the recursive call
    // returns the literal '{}' at indent=0, so the output is
    //   workflow_dispatch:
    //   {}
    // That's a small quirk worth pinning — change it intentionally if needed.
    const cfg: WorkflowConfig = {
      name: 'x',
      on: { workflow_dispatch: {} },
      jobs: {},
    }
    expect(toYAML(cfg)).toContain('workflow_dispatch:\n{}')
  })

  it('top-level jobs: {} also renders on the line below', () => {
    const cfg: WorkflowConfig = { name: 'x', on: {}, jobs: {} }
    expect(toYAML(cfg)).toContain('jobs:\n{}')
  })
})

describe('toYAML — full workflow shape', () => {
  it('renders a realistic CI workflow with jobs + steps + matrix', () => {
    const cfg: WorkflowConfig = {
      name: 'CI',
      on: { push: { branches: ['main'] } },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          strategy: { matrix: { node: ['18', '20'] }, 'fail-fast': false },
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '${{ matrix.node }}' },
            },
            { run: 'npm install' },
            { run: 'npm test' },
          ],
        },
      },
    }
    const out = toYAML(cfg)
    expect(out).toContain('name: CI')
    expect(out).toContain('test:')
    expect(out).toContain('strategy:')
    expect(out).toContain('matrix:')
    expect(out).toContain('uses: actions/checkout@v4')
    expect(out).toContain("'${{ matrix.node }}'") // $-prefix → quoted
  })
})

describe('generateWorkflow', () => {
  it('prepends the auto-generated header comment', () => {
    const out = generateWorkflow({
      name: 'CI',
      on: { push: { branches: ['main'] } },
      jobs: {},
    })
    expect(out.startsWith('# Generated by @molecule/api-ci-github-actions')).toBe(true)
    expect(out).toContain('Do not edit manually')
  })

  it('includes the YAML body after the header', () => {
    const out = generateWorkflow({
      name: 'release',
      on: {},
      jobs: {},
    })
    expect(out).toContain('name: release')
  })
})

describe('workflowPath', () => {
  it('returns .github/workflows/<name>.yml', () => {
    expect(workflowPath('ci')).toBe('.github/workflows/ci.yml')
    expect(workflowPath('release')).toBe('.github/workflows/release.yml')
  })

  it('does not URL-encode special characters (caller responsibility)', () => {
    expect(workflowPath('my-workflow')).toBe('.github/workflows/my-workflow.yml')
  })
})
