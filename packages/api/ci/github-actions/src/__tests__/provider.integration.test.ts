/**
 * REAL-DEPENDENCY integration tests — the generated YAML is parsed back with a
 * REAL YAML parser instead of being string-matched.
 *
 * The unit suites (`generator.test.ts`, `index.test.ts`) only assert that the
 * output CONTAINS substrings — they can never prove the document is valid YAML,
 * nor that a value survives the round-trip with its type intact. Those are
 * exactly the two ways this package fails its consumer (GitHub's workflow
 * parser): a document that errors on parse, or — far worse, because it is
 * silent — a value that type-flips (`'20.10'` → float `20.1` installs the
 * wrong Node; an unquoted `on`/`yes` becomes a boolean under YAML 1.1, the
 * dialect family GitHub's go-yaml parser follows).
 *
 * `yaml` is resolved from the workspace-root node_modules (dev-time only; the
 * package itself has zero runtime deps). We parse with BOTH the 1.2 default
 * and the 1.1 schema so a string is only "safe" if it survives either dialect.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import { generateWorkflow, toYAML } from '../generator.js'
import type { WorkflowConfig } from '../workflows/index.js'
import { commonSteps, workflows } from '../workflows/index.js'

/** Parses with the YAML 1.2 core schema (modern parsers). */
const parse12 = (src: string): unknown => parse(src)
/** Parses with the YAML 1.1 schema (go-yaml family — what GitHub Actions uses). */
const parse11 = (src: string): unknown => parse(src, { version: '1.1' })

describe('@molecule/api-ci-github-actions × REAL yaml parser', () => {
  it('every pre-built workflow parses as valid YAML in BOTH 1.2 and 1.1 dialects', () => {
    const all: Array<[string, WorkflowConfig]> = [
      ['ci', workflows.ci()],
      ['ciMatrix', workflows.ciMatrix()],
      ['release', workflows.release()],
      ['integrationTests', workflows.integrationTests()],
      ['stagingDeploy', workflows.stagingDeploy({ driver: 'docker-compose' })],
      ['stagingTeardown', workflows.stagingTeardown()],
    ]
    for (const [name, config] of all) {
      const yaml = generateWorkflow(config)
      // An invalid document is the LOUD failure mode — parse() throws.
      expect(() => parse12(yaml), `${name} must parse under YAML 1.2`).not.toThrow()
      expect(() => parse11(yaml), `${name} must parse under YAML 1.1`).not.toThrow()
      const doc = parse12(yaml) as Record<string, unknown>
      expect(doc.name, `${name} round-trips its name`).toBe(config.name)
      expect(Object.keys(doc.jobs as object), `${name} round-trips its jobs`).toEqual(
        Object.keys(config.jobs),
      )
    }
  })

  it('CONSUMER PROPERTY: version-like strings survive the round-trip as STRINGS', () => {
    // The SILENT failure mode: an unquoted '20.10' parses back as the float
    // 20.1 and setup-node installs Node 20.1 instead of 20.10. String-matching
    // tests cannot catch this — only a real parser can.
    const config = workflows.ciMatrix(['18', '20.10', '22'])
    const doc = parse12(toYAML(config)) as {
      jobs: { test: { strategy: { matrix: { 'node-version': unknown[] } } } }
    }
    expect(doc.jobs.test.strategy.matrix['node-version']).toEqual(['18', '20.10', '22'])
    for (const v of doc.jobs.test.strategy.matrix['node-version']) {
      expect(typeof v).toBe('string')
    }
  })

  it('CONSUMER PROPERTY: YAML-1.1 boolean words and numeric-ish env values stay strings', () => {
    // GitHub's parser follows YAML 1.1, where unquoted `on`/`yes`/`off` are
    // booleans and `0o17`/`012` are octal integers. Every one of these must
    // come back as the exact same string in BOTH dialects.
    const tricky = {
      FLAG_ON: 'on',
      FLAG_YES: 'yes',
      FLAG_OFF: 'off',
      OCTAL_MODERN: '0o17',
      BINARY: '0b101',
      HEX: '0x1A',
      FLOATY: '1.20',
      EXPR: '${{ secrets.TOKEN }}',
      GLOB: '**',
      SPACED: ' padded ',
    }
    const config: WorkflowConfig = {
      name: 'Types',
      on: { push: { branches: ['main'] } },
      env: tricky,
      jobs: { noop: { 'runs-on': 'ubuntu-latest', steps: [{ run: 'true' }] } },
    }
    const yaml = toYAML(config)
    for (const parser of [parse12, parse11]) {
      const doc = parser(yaml) as { env: Record<string, unknown> }
      expect(doc.env).toEqual(tricky)
    }
  })

  it('CONSUMER PROPERTY: a multi-line run script survives with newlines intact', () => {
    // A folded/misquoted multi-line script silently joins shell commands onto
    // one line — `cd app` and `npm test` become `cd app npm test`.
    const script = 'set -e\ncd app\nnpm run build\nnpm test'
    const config: WorkflowConfig = {
      name: 'Multiline',
      on: { push: { branches: ['main'] } },
      jobs: {
        build: { 'runs-on': 'ubuntu-latest', steps: [{ name: 'Build & test', run: script }] },
      },
    }
    const doc = parse12(toYAML(config)) as {
      jobs: { build: { steps: Array<{ run: string }> } }
    }
    expect(doc.jobs.build.steps[0].run).toBe(script)
  })

  it('CONSUMER PROPERTY: a nested step `with:` mapping stays a child of its step', () => {
    // The flattening regression class: an object inside an array whose nested
    // keys get re-indented as SIBLINGS of the step instead of children —
    // string assertions still find every line, only a parser sees the shape.
    const doc = parse12(toYAML(workflows.ciMatrix())) as {
      jobs: { test: { steps: Array<Record<string, unknown>> } }
    }
    const setupStep = doc.jobs.test.steps[1]
    expect(setupStep.uses).toBe('actions/setup-node@v4')
    expect(setupStep.with).toEqual({ 'node-version': '${{ matrix.node-version }}', cache: 'npm' })
  })

  it('FAILURE DISAMBIGUATION: release() is actually able to authenticate its publish', () => {
    // Publishing with NODE_AUTH_TOKEN but WITHOUT registry-url on setup-node
    // fails with ENEEDAUTH — indistinguishable, to a debugging user, from a
    // wrong/missing NPM_TOKEN secret. The workflow must carry registry-url so
    // the only remaining failure mode IS the secret.
    const doc = parse12(toYAML(workflows.release())) as {
      jobs: { release: { steps: Array<Record<string, unknown>> } }
    }
    const setup = doc.jobs.release.steps.find(
      (s) => typeof s.uses === 'string' && (s.uses as string).startsWith('actions/setup-node'),
    )
    expect(setup).toBeDefined()
    expect((setup?.with as Record<string, unknown>)['registry-url']).toBe(
      'https://registry.npmjs.org',
    )
    const publish = doc.jobs.release.steps.find((s) => s.run === 'npm publish --access public')
    expect((publish?.env as Record<string, unknown>).NODE_AUTH_TOKEN).toBe(
      '${{ secrets.NPM_TOKEN }}',
    )
  })

  it('stagingDeploy honors excludeBranches as negative push filters', () => {
    // excludeBranches used to be accepted and silently IGNORED — a caller
    // excluding `renovate/**` still staged every bot branch.
    const doc = parse12(
      toYAML(workflows.stagingDeploy({ excludeBranches: ['renovate/**', 'dependabot/**'] })),
    ) as { on: { push: { branches: string[] } } }
    expect(doc.on.push.branches).toEqual(['**', '!renovate/**', '!dependabot/**'])
  })

  it('a cron schedule and glob branch filters survive both dialects', () => {
    // `* * * * *` starts with a YAML alias indicator; `**` likewise — unquoted
    // they are parse ERRORS, not wrong values. Quoted, they must round-trip.
    const config: WorkflowConfig = {
      name: 'Nightly',
      on: {
        schedule: [{ cron: '30 2 * * 1-5' }, { cron: '* * * * *' }],
        push: { branches: ['**'] },
      },
      jobs: { noop: { 'runs-on': 'ubuntu-latest', steps: [commonSteps.npmTest()] } },
    }
    const yaml = toYAML(config)
    for (const parser of [parse12, parse11]) {
      const raw = parser(yaml) as Record<string, unknown>
      // Ecosystem quirk, faithfully modeled: under YAML 1.1 (GitHub's dialect
      // family) the unquoted `on:` KEY itself parses as boolean true — GitHub
      // accepts this (every workflow on GitHub spells it unquoted), reading
      // the trigger block from the `true` key. Mirror that lookup here.
      const on = (raw.on ?? raw.true) as {
        schedule: Array<{ cron: string }>
        push: { branches: string[] }
      }
      expect(on.schedule.map((s) => s.cron)).toEqual(['30 2 * * 1-5', '* * * * *'])
      expect(on.push.branches).toEqual(['**'])
    }
  })
})
