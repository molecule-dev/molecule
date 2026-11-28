/** Exercise the actual publisher with inert npm, filesystem, clock and registry boundaries. */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { HELD_CHANGESETS_FILE, withoutHeldPackages } from '../lib/held-changesets.mjs'
import {
  dependencyOrder,
  exactMoleculeDeps,
  hasPublishedRelease,
  missingDependency,
  publicationPlan,
  requiredMoleculePeers,
  requiredPeerCycles,
} from '../lib/publish-order.mjs'
import { envPublishDelaySeconds } from '../lib/publish-pacing.mjs'

const pkg = (name: string, dependencies = {}, peerDependencies = {}) => ({
  name: `@molecule/${name}`,
  version: '2.0.0',
  dependencies,
  peerDependencies,
})
const queued = (manifest: ReturnType<typeof pkg>) => ({
  ...manifest,
  deps: exactMoleculeDeps(manifest),
  peers: requiredMoleculePeers(manifest),
})
const raw = readFileSync(new URL('../publish-paced.mjs', import.meta.url), 'utf8')
const ast = ts.createSourceFile('publish-paced.mjs', raw, ts.ScriptTarget.Latest, true)
let body = raw
for (const node of [...ast.statements].reverse())
  if (ts.isImportDeclaration(node)) body = body.slice(0, node.getStart(ast)) + body.slice(node.end)
body = body
  .replace(/^#!.*\n/, '')
  .replaceAll('import.meta.url', JSON.stringify('file:///fixture/scripts/publish-paced.mjs'))

type Manifest = ReturnType<typeof pkg>
async function publish(
  manifests: Manifest[],
  prior: Record<string, string[]>,
  {
    phase = 'all',
    fail = '',
    failSignal = '',
    authThenRateLimit = '',
    limit = '',
    delayServe = 0,
    reviewHold = '',
    dry = false,
    unknown = '',
    runNpm = (_args: string[]): void => undefined,
  } = {},
) {
  let clock = 0
  const versions = new Map(Object.entries(prior).map(([n, v]) => [n, [...v]]))
  const uploads = new Map<string, number>()
  const attempts: string[] = []
  const delays: number[] = []
  const files: Record<string, string> = {}
  const logs: string[] = []
  const process = {
    argv: ['node', '/fixture/scripts/publish-paced.mjs', ...(dry ? ['--dry-run'] : [])],
    env: { MOL_PUBLISH_PHASE: phase, MOL_PUBLISH_LIMIT: limit, MOL_REVIEW_HOLD: reviewHold },
    stderr: { write: (s: string) => logs.push(s) },
    exitCode: 0,
    exit: (code: number) => {
      process.exitCode = code
      throw Object.assign(Error(`exit ${code}`), { testExit: true })
    },
  }
  const context = {
    dependencyOrder,
    publicationPlan,
    exactMoleculeDeps,
    missingDependency,
    requiredMoleculePeers,
    requiredPeerCycles,
    envPublishDelaySeconds,
    withoutHeldPackages,
    HELD_CHANGESETS_FILE,
    parseHeldRecord: () => {
      throw Error('unexpected held record')
    },
    dirname: () => '/fixture/scripts',
    join: (...parts: string[]) => parts.join('/').replace('/scripts/..', ''),
    fileURLToPath: () => '/fixture/scripts/publish-paced.mjs',
    existsSync: (path: string) => /^\/fixture\/packages\/\d+\/package.json$/.test(path),
    readdirSync: (path: string) =>
      path === '/fixture/packages' ? manifests.map((_, i) => String(i)) : [],
    statSync: () => ({ isDirectory: () => true }),
    readFileSync: (path: string) => JSON.stringify(manifests[Number(path.split('/')[3])]),
    writeFileSync: (path: string, text: string) => {
      files[path] = text
    },
    performance: { now: () => clock },
    setTimeout: (fn: () => void, ms: number) => {
      delays.push(ms)
      clock += ms
      queueMicrotask(fn)
    },
    AbortSignal,
    process,
    console: { log: (s: string) => logs.push(s) },
    assertPackComplete: () => {},
    execFileSync: (_cmd: string, args: string[], opts: { cwd: string }) => {
      expect(args).toContain('--fetch-retries=0')
      const manifest = manifests[Number(opts.cwd.split('/').pop())]
      attempts.push(manifest.name)
      runNpm(args)
      if (manifest.name === authThenRateLimit) {
        const diagnostic = attempts.filter((name) => name === manifest.name).length > 1
        throw Object.assign(Error('refused'), {
          stderr: diagnostic ? 'npm error E429 429 Too Many Requests' : 'npm error ENEEDAUTH',
        })
      }
      if (manifest.name === fail)
        throw Object.assign(Error('rate limited'), {
          stderr: 'npm error E429 429 Too Many Requests',
          signal: failSignal,
        })
      uploads.set(manifest.name, clock)
      return ''
    },
    fetch: async (url: string) => {
      const name = decodeURIComponent(url.replace('https://registry.npmjs.org/', ''))
      if (name === unknown) return { status: 503, ok: false }
      const uploaded = uploads.get(name)
      const manifest = manifests.find((m) => m.name === name)
      const served = [...(versions.get(name) ?? [])]
      if (uploaded !== undefined && clock >= uploaded + delayServe) served.push(manifest!.version)
      return {
        status: served.length ? 200 : 404,
        ok: served.length > 0,
        json: async () => ({ versions: Object.fromEntries(served.map((v) => [v, {}])) }),
      }
    },
  }
  try {
    await runInNewContext(`(async () => {${body}\n})()`, context)
  } catch (error) {
    if (!(error as { testExit?: boolean }).testExit) throw error
  }
  return { attempts, delays, files, logs: logs.join(''), exitCode: process.exitCode, clock }
}

describe('consumer publication lane', () => {
  const update = queued(pkg('z-fix', { '@molecule/new-required': '2.0.0' }))
  const required = queued(pkg('new-required', { '@molecule/new-base': '2.0.0' }))
  const base = queued(pkg('new-base'))
  const unrelated = queued(pkg('a-new'))
  const held = queued(pkg('held'))
  const registry = new Map([
    [update.name, ['1.0.0']],
    [required.name, []],
    [base.name, []],
    [unrelated.name, ['0.0.1-stage']],
    [held.name, ['1.0.0']],
  ])

  it('promotes a required new peer across tiers, while a compatible served peer creates no wait', () => {
    const fix = queued(pkg('z-fix', {}, { '@molecule/m-peer': '^2.0.0' }))
    const peer = queued(pkg('m-peer'))
    const fresh = queued(pkg('a-tail'))
    const early = { first: new Set([fix.name]) }
    expect(dependencyOrder([fresh, fix, peer], early).map((p) => p.name)).toEqual([
      peer.name,
      fix.name,
      fresh.name,
    ])
    expect(
      dependencyOrder([fresh, fix, peer], {
        ...early,
        registry: new Map([[peer.name, ['2.0.0']]]),
      }).map((p) => p.name),
    ).toEqual([fix.name, fresh.name, peer.name])
  })

  it('promotes an update and its transitive new requirements ahead of unrelated names, with holds last', () => {
    const plan = publicationPlan([unrelated, update, required, base, held], {
      registry,
      last: new Set([held.name]),
    })
    expect(plan.ordered.map((p) => p.name)).toEqual([
      base.name,
      required.name,
      update.name,
      unrelated.name,
      held.name,
    ])
    // A held update cannot be claimed served before the global try-last tier.
    expect(plan.split).toBe(false)
  })

  it('splits only the required closure and keeps compatible served peers out of it', () => {
    const compatible = queued(pkg('z-fix', {}, { '@molecule/a-new': '^1.0.0' }))
    const plan = publicationPlan([compatible, unrelated, required, base], {
      registry: new Map([...registry, [unrelated.name, ['1.0.0']]]),
    })
    // a-new is now an existing name, so it is itself an update, but the unrelated new pair stays tail.
    expect(plan.consumer.map((p) => p.name)).toEqual([unrelated.name, compatible.name])
    expect(plan.tail.map((p) => p.name)).toEqual([base.name, required.name])
    expect(plan.split).toBe(true)
  })

  it('does not classify unread registry state as a first publish', () => {
    expect(() => publicationPlan([update], { registry: new Map() })).toThrow(/registry unreadable/)
    expect(
      hasPublishedRelease(['0.0.0-stage', '0.0.1-stage', '0.0.1-stage.0', '0.1.0-stage']),
    ).toBe(false)
    expect(hasPublishedRelease(['1.0.0-beta.1'])).toBe(true)
  })

  it('the actual updates dispatch waits for its new requirement without publishing the unrelated tail', async () => {
    const result = await publish(
      [pkg('a-tail'), pkg('z-fix', { '@molecule/new-required': '2.0.0' }), pkg('new-required')],
      { '@molecule/z-fix': ['1.0.0'] },
      { phase: 'updates', delayServe: 50_000 },
    )
    expect(result.attempts).toEqual(['@molecule/new-required', '@molecule/z-fix'])
    expect(result.delays.filter((ms) => ms === 20_000)).toHaveLength(2)
    expect(result.exitCode).toBe(0)
    expect(result.logs).toContain('moved to the end of the queue')
  })

  it('the actual full queue publishes updates first even with a limit and bootstrap placeholders', async () => {
    const result = await publish(
      [pkg('a-first'), pkg('z-fix')],
      { '@molecule/z-fix': ['1.0.0'], '@molecule/a-first': ['0.0.1-stage'] },
      { limit: '1' },
    )
    expect(result.attempts).toEqual(['@molecule/z-fix'])
  })

  it.each(['', 'SIGKILL'])(
    'stops at a 429 mid-tail without retrying or attempting the next name, signal=%s',
    async (failSignal) => {
      const result = await publish(
        [pkg('a-first'), pkg('b-throttled'), pkg('c-last'), pkg('z-fix')],
        { '@molecule/z-fix': ['1.0.0'] },
        { fail: '@molecule/b-throttled', failSignal },
      )
      expect(result.attempts).toEqual([
        '@molecule/z-fix',
        '@molecule/a-first',
        '@molecule/b-throttled',
      ])
      expect(result.exitCode).toBe(1)
      expect(result.logs).toContain('RATE LIMITED')
      expect(result.delays).toEqual([20_000, 20_000])
    },
  )

  it('keeps review-held packages excluded in both phases', async () => {
    for (const phase of ['all', 'updates']) {
      const result = await publish(
        [pkg('a-first'), pkg('z-fix')],
        { '@molecule/z-fix': ['1.0.0'] },
        { phase, reviewHold: '@molecule/z-fix' },
      )
      expect(result.attempts).toEqual(phase === 'all' ? ['@molecule/a-first'] : [])
    }
  })

  it('keeps an all-new queue out of the updates-only dispatch', async () => {
    expect((await publish([pkg('a-first')], {}, { phase: 'updates' })).attempts).toEqual([])
    expect((await publish([pkg('a-first')], {})).attempts).toEqual(['@molecule/a-first'])
  })

  it('reports deferred and unread names accurately in the injected dry-run listing', async () => {
    const result = await publish(
      [pkg('a-tail'), pkg('z-fix')],
      { '@molecule/z-fix': ['1.0.0'] },
      { phase: 'updates', dry: true },
    )
    expect(result.logs).toContain('already published: 0 | to publish: 1 | deferred: 1 | unknown: 0')
    expect(result.attempts).toEqual([])
    const unread = await publish([pkg('a-tail')], {}, { dry: true, unknown: '@molecule/a-tail' })
    expect(unread.logs).toContain('already published: 0 | to publish: 0 | deferred: 0 | unknown: 1')
    expect(unread.exitCode).toBe(1)
  })
  it('orders a new prerelease requirement and follows npm optional dependency precedence', async () => {
    const requirement = { ...pkg('new-required'), version: '2.0.0-beta.1' }
    const fix = {
      ...pkg('z-fix', { '@molecule/new-required': '1.0.0' }),
      optionalDependencies: { '@molecule/new-required': requirement.version },
    }
    expect(exactMoleculeDeps(fix)).toEqual([
      { name: requirement.name, version: requirement.version },
    ])
    const result = await publish(
      [pkg('a-tail'), fix, requirement],
      { '@molecule/z-fix': ['1.0.0'] },
      { phase: 'updates' },
    )
    expect(result.attempts).toEqual([requirement.name, fix.name])
  })

  it('does not publish an update whose exact dependency is outside the queue and absent', async () => {
    const result = await publish([pkg('z-fix', { '@molecule/outside': '1.0.0' })], {
      '@molecule/z-fix': ['1.0.0'],
    })
    expect(result.attempts).toEqual([])
    expect(result.exitCode).toBe(1)
    expect(result.files['/fixture/.publish-failures.json']).toContain('requirement-hold')
    const unread = await publish(
      [pkg('z-fix', { '@molecule/outside': '1.0.0' })],
      { '@molecule/z-fix': ['1.0.0'] },
      { unknown: '@molecule/outside' },
    )
    expect(unread.attempts).toEqual([])
    expect(unread.files['/fixture/.publish-failures.json']).toContain('registry-unknown')
    const served = await publish([pkg('z-fix', { '@molecule/outside': '1.0.0' })], {
      '@molecule/z-fix': ['1.0.0'],
      '@molecule/outside': ['1.0.0'],
    })
    expect(served.attempts).toEqual(['@molecule/z-fix'])
  })
  it('stops on the same npm rate limit under a silent parent', async () => {
    const bin = mkdtempSync(join(tmpdir(), 'publish-paced-fake-npm-'))
    try {
      writeFileSync(
        join(bin, 'npm'),
        `#!/bin/sh
level=\${npm_config_loglevel:-notice}
for arg do case "$arg" in --loglevel=*) level=\${arg#*=};; esac; done
if [ "$level" != silent ]; then printf '%s\\n' 'npm error E429 429 Too Many Requests' >&2; fi
exit 1
`,
        { mode: 0o755 },
      )
      const run = (loglevel: string) =>
        publish(
          [pkg('rate-limited')],
          {},
          {
            runNpm: (args) => {
              execFileSync('npm', args, {
                env: { PATH: bin, npm_config_loglevel: loglevel },
                stdio: ['ignore', 'pipe', 'pipe'],
                encoding: 'utf8',
              })
            },
          },
        )
      const normal = await run('notice')
      expect(normal.exitCode).toBe(1)
      expect(normal.logs).toContain('RATE LIMITED on @molecule/rate-limited')
      expect(normal.files['/fixture/.publish-failures.json']).toContain('stopped: rate limited')
      expect(await run('silent')).toEqual(normal)
    } finally {
      rmSync(bin, { recursive: true, force: true })
    }
  })

  it('stops on a 429 in the existing auth diagnostic and reports a rate failure, not a holdable auth refusal', async () => {
    const result = await publish(
      [pkg('a-auth'), pkg('b-next'), pkg('z-fix')],
      { '@molecule/z-fix': ['1.0.0'] },
      { authThenRateLimit: '@molecule/a-auth' },
    )
    expect(result.attempts).toEqual(['@molecule/z-fix', '@molecule/a-auth', '@molecule/a-auth'])
    expect(result.exitCode).toBe(1)
    expect(result.files['/fixture/.publish-failures.json']).toContain('stopped: rate limited')
    expect(result.files['/fixture/.publish-failures.json']).not.toContain('auth rejected')
  })
})
