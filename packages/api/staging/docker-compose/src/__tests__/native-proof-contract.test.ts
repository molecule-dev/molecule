import { spawnSync } from 'node:child_process'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'
import { parse } from 'yaml'

import { generateComposeFile } from '../compose-generator.js'

it('the tool-less API health probe succeeds for HTTP200 and fails for HTTP503', async () => {
  let status = 200
  const server = createServer((_request, response) => {
    response.statusCode = status
    response.end('health')
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing ephemeral health port')
    const compose = parse(
      generateComposeFile(
        {
          slug: 'health',
          branch: 'health',
          type: 'staging',
          name: 'health',
          driver: 'docker-compose',
          createdAt: '',
        },
        { apiPort: 4001, appPort: 5174, dbPort: 5433 },
      ),
    )
    const probe = compose.services.api.healthcheck.test as string[]
    expect(probe.slice(0, 3)).toEqual(['CMD', 'node', '-e'])
    const code = probe[3].replace('127.0.0.1:4000', '127.0.0.1:' + address.port)
    await expect(
      promisify(execFile)(process.execPath, ['-e', code], { timeout: 5_000 }),
    ).resolves.toBeDefined()
    status = 503
    await expect(
      promisify(execFile)(process.execPath, ['-e', code], { timeout: 5_000 }),
    ).rejects.toMatchObject({ code: 1 })
  } finally {
    await new Promise<void>((done) => server.close(() => done()))
  }
})

it('CI identity refusal happens before any Docker command or output write', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'native-proof-refusal-'))
  try {
    const bin = join(scratch, 'bin')
    mkdirSync(bin)
    const marker = join(scratch, 'docker-called')
    writeFileSync(join(bin, 'docker'), '#!/bin/sh\ntouch "$NATIVE_PROOF_TRIPWIRE"\nexit 99\n', {
      mode: 0o755,
    })
    const result = spawnSync(
      process.execPath,
      [resolve(import.meta.dirname, '../../../../../../scripts/verify-native-node-artifact.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_ACTIONS: 'true',
          GITHUB_RUN_ID: '',
          RUNNER_TEMP: scratch,
          NATIVE_PROOF_TRIPWIRE: marker,
          PATH: bin + ':' + process.env.PATH,
        },
      },
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('GitHub run identity is required')
    expect(existsSync(marker)).toBe(false)
    expect(existsSync(join(scratch, 'node-deployment-artifact-proof'))).toBe(false)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

it.each([
  ['', true],
  ['scripts/__tests__', false],
  ['packages/api/staging/docker-compose', true],
  ['packages/api/core/logger', false],
])('the actual CI native job respects affected scope %j', (scope, expected) => {
  const workflow = parse(
    readFileSync(
      resolve(import.meta.dirname, '../../../../../../.github/workflows/ci.yml'),
      'utf8',
    ),
  ) as { jobs: { build: { steps: Array<{ name?: string; run?: string }> } } }
  const step = workflow.jobs.build.steps.find(
    (step) => step.name === 'Prove native Node deployment on amd64',
  )
  expect(step?.run).toBeDefined()
  const scratch = mkdtempSync(join(tmpdir(), 'native-proof-scope-'))
  try {
    const marker = join(scratch, 'proof-called')
    writeFileSync(
      join(scratch, 'node'),
      '#!/bin/sh\ncase "$1" in\nscripts/affected-projects.mjs) printf "%s" "$PROOF_SCOPE";;\nscripts/verify-native-node-artifact.mjs) touch "$NATIVE_PROOF_TRIPWIRE";;\n*) exit 99;;\nesac\n',
      { mode: 0o755 },
    )
    const result = spawnSync('sh', ['-c', step!.run!], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PROOF_SCOPE: scope,
        NATIVE_PROOF_TRIPWIRE: marker,
        PATH: scratch + ':' + process.env.PATH,
      },
    })
    expect(result.status).toBe(0)
    expect(existsSync(marker)).toBe(expected)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})
