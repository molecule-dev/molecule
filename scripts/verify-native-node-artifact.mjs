/** Native Docker consumer proof. Runs only on an actual amd64 GitHub CI runner. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import console from 'node:console'
import { createHash } from 'node:crypto'
import {
  closeSync,
  cpSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from 'node:fs'
import { arch } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import {
  generateApiDeploymentArtifacts,
  NODE_DEPLOYMENT_IMAGE,
} from '../packages/api/staging/docker-compose/dist/index.js'

// Refuse BEFORE any Docker operation. An arm64 host or an emulated platform
// must never masquerade as this native target acceptance check.
assert.equal(
  process.env.GITHUB_ACTIONS,
  'true',
  'Native Docker proof is CI-only; no shared-host image builds',
)
assert.ok(process.env.GITHUB_RUN_ID, 'GitHub run identity is required')
assert.equal(arch(), 'x64', 'Native Docker proof requires an amd64 host')
assert.equal(execFileSync('uname', ['-m'], { encoding: 'utf8' }).trim(), 'x86_64')
assert.ok(process.env.RUNNER_TEMP, 'Use the disposable CI runner temp directory')
const disk = statfsSync(process.env.RUNNER_TEMP)
assert.ok(disk.bavail * disk.bsize >= 8 * 1024 ** 3, 'CI proof requires at least 8GiB free')

const fixture = fileURLToPath(
  new URL('../packages/api/staging/docker-compose/test/native', import.meta.url),
)
const output = join(process.env.RUNNER_TEMP, 'node-deployment-artifact-proof')
const context = join(output, 'consumer')
mkdirSync(output, { recursive: true })
cpSync(fixture, context, { recursive: true })
for (const name of [
  'package.json',
  'package-lock.json',
  'api/package.json',
  'app/package.json',
  'build.mjs',
  'prepare.mjs',
  'api/src/server.mjs',
  'api/src/smoke.mjs',
]) {
  renameSync(join(context, name + '.fixture'), join(context, name))
}
const files = generateApiDeploymentArtifacts({
  runtimeDirectory: 'api',
  runtimePaths: ['api', 'app/dist'],
  runtimeCommand: ['node', 'dist/server.mjs'],
})
for (const [name, content] of Object.entries(files)) {
  mkdirSync(resolve(context, name, '..'), { recursive: true })
  writeFileSync(join(context, name), content, { flag: 'wx' })
}
mkdirSync(join(context, 'api/node_modules'), { recursive: true })
writeFileSync(join(context, 'api/node_modules/host-poison'), 'host modules must not ship')
writeFileSync(join(context, 'api/.env.private'), 'harmless exclusion control')

const legacy = readFileSync(join(context, 'Dockerfile.legacy'), 'utf8')
assert.equal((legacy.match(/node:20-alpine/g) ?? []).length, 2)
// Hold the patched Node/libc input constant: only replace the two old FROM
// references. The old install/copy/runtime recipe remains exactly as recorded
// at b103bb76; its source-dependent prepare cannot run before source is copied.
writeFileSync(
  join(context, 'Dockerfile.legacy'),
  legacy.replaceAll('node:20-alpine', NODE_DEPLOYMENT_IMAGE),
)
writeFileSync(
  join(context, 'Dockerfile.no-tools'),
  `FROM ${NODE_DEPLOYMENT_IMAGE}
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts --no-audit --no-fund
RUN npm_config_build_from_source=true npm_config_jobs=1 MAKEFLAGS=-j1 npm rebuild bcrypt
`,
)
const suffix = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}-${process.pid}`
const image = `molecule-native-proof:${suffix}`
const container = `molecule-native-proof-${suffix}`
const results = []
const receipt = {
  commit: process.env.GITHUB_SHA,
  run: process.env.GITHUB_RUN_ID,
  attempt: process.env.GITHUB_RUN_ATTEMPT,
  startedAt: new Date().toISOString(),
  nodeImage: NODE_DEPLOYMENT_IMAGE,
  hostArch: arch(),
  freeBytes: disk.bavail * disk.bsize,
  legacySourceCommit: 'b103bb76a7269cd58d0388ae771831923d3b925f',
  legacyBaseOnlyReplacement: true,
  results,
}
/** Run a bounded Docker check and retain its complete log and outcome. */
function docker(label, args, { failure } = {}) {
  const log = join(output, label + '.log')
  const fd = openSync(log, 'w')
  let result
  const startedAt = Date.now()
  try {
    result = spawnSync('docker', args, {
      cwd: context,
      stdio: ['ignore', fd, fd],
      timeout: 600_000,
    })
  } finally {
    closeSync(fd)
  }
  results.push({
    label,
    at: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    log,
    sha256: createHash('sha256').update(readFileSync(log)).digest('hex'),
  })
  if (result.error) throw result.error
  if (failure) {
    assert.notEqual(result.status, 0, `${label}: known-bad recipe unexpectedly passed`)
    assert.match(
      readFileSync(log, 'utf8'),
      failure,
      `${label}: infrastructure errors are not the expected failure`,
    )
  } else {
    assert.equal(result.status, 0, `${label} failed; see ${log}`)
  }
  console.log(`${label}: ${failure ? 'expected refusal' : 'passed'}`)
}
try {
  receipt.daemonArch = execFileSync('docker', ['info', '--format', '{{.Architecture}}'], {
    encoding: 'utf8',
  }).trim()
  assert.match(receipt.daemonArch, /^(x86_64|amd64)$/)
  docker(
    'legacy-recipe',
    ['build', '--platform=linux/amd64', '--progress=plain', '-f', 'Dockerfile.legacy', '.'],
    {
      failure: /Cannot find module.*prepare|ENOENT.*prepare|Cannot find module.*api|No workspaces/i,
    },
  )
  docker(
    'missing-native-toolchain',
    ['build', '--platform=linux/amd64', '--progress=plain', '-f', 'Dockerfile.no-tools', '.'],
    {
      failure: /Could not find any Python installation|Can't find Python executable/i,
    },
  )
  docker('generated-build', [
    'build',
    '--platform=linux/amd64',
    '--progress=plain',
    '-t',
    image,
    '.',
  ])
  const inspected = JSON.parse(
    execFileSync(
      'docker',
      [
        'image',
        'inspect',
        image,
        '--format',
        '{"id":{{json .Id}},"architecture":{{json .Architecture}},"os":{{json .Os}},"user":{{json .Config.User}}}',
      ],
      {
        encoding: 'utf8',
      },
    ),
  )
  // Save selected identity only; never dump environment or arbitrary image metadata.
  receipt.image = inspected
  assert.equal(inspected.architecture, 'amd64')
  assert.equal(inspected.user, 'node')
  receipt.base = JSON.parse(
    execFileSync(
      'docker',
      [
        'image',
        'inspect',
        NODE_DEPLOYMENT_IMAGE,
        '--format',
        '{"id":{{json .Id}},"architecture":{{json .Architecture}},"repoDigests":{{json .RepoDigests}}}',
      ],
      { encoding: 'utf8' },
    ),
  )
  assert.equal(receipt.base.architecture, 'amd64')
  docker('fresh-runtime', [
    'run',
    '--rm',
    '--name',
    container,
    '--network=none',
    '--read-only',
    '--tmpfs',
    '/tmp:rw,nosuid,nodev,size=64m,mode=1777',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--cpus=1',
    '--memory=1g',
    '--pids-limit=128',
    image,
    'node',
    'dist/smoke.mjs',
  ])
  receipt.passed = true
} catch (error) {
  receipt.error = error.message
  throw error
} finally {
  receipt.finishedAt = new Date().toISOString()
  receipt.inputs = Object.fromEntries(
    [
      'package-lock.json',
      'Dockerfile',
      '.dockerignore',
      'Dockerfile.legacy',
      'Dockerfile.no-tools',
    ].map((name) => [
      name,
      createHash('sha256')
        .update(readFileSync(join(context, name)))
        .digest('hex'),
    ]),
  )
  // Only this run's unique objects; no prune, builder deletion or shared network changes.
  receipt.cleanup = [
    ['rm', '-f', container],
    ['image', 'rm', image],
  ].map((args) => {
    const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 15_000 })
    const absent = /No such (container|image)/i.test(result.stderr ?? '')
    const ok = result.status === 0 || absent
    if (!ok) {
      process.exitCode = 1
      receipt.passed = false
    }
    return {
      object: args.at(-1),
      status: result.status,
      absent,
      ok,
      error: result.error?.message ?? null,
    }
  })
  writeFileSync(join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
}
