import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const roots = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/**
 * Run the real checker with controlled npm output and a valid minimal lock.
 * @param program - The fake npm executable's JavaScript.
 * @returns The native checker result.
 */
function checkWithNpm(program) {
  const root = mkdtempSync(join(tmpdir(), 'lockfile-probe-'))
  roots.push(root)
  mkdirSync(join(root, 'scripts/lib'), { recursive: true })
  mkdirSync(join(root, 'bin'), { recursive: true })
  symlinkSync(
    fileURLToPath(new URL('../../node_modules', import.meta.url)),
    join(root, 'node_modules'),
  )
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'stockroom-tools', version: '1.0.0', type: 'module', workspaces: [] }),
  )
  writeFileSync(
    join(root, 'package-lock.json'),
    JSON.stringify({
      lockfileVersion: 3,
      packages: { '': { name: 'stockroom-tools', version: '1.0.0' } },
    }),
  )
  copyFileSync(
    new URL('../check-lockfile.js', import.meta.url),
    join(root, 'scripts/check-lockfile.js'),
  )
  copyFileSync(
    new URL('../lib/lockfile-ranges.mjs', import.meta.url),
    join(root, 'scripts/lib/lockfile-ranges.mjs'),
  )
  writeFileSync(join(root, 'bin/npm'), `#!${process.execPath}\n${program}\n`, { mode: 0o755 })
  return spawnSync(
    process.execPath,
    [join(root, 'scripts/check-lockfile.js')],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
      timeout: 20_000,
    },
    30_000,
  )
}

describe('the lockfile check uses the actual npm probe result', () => {
  it('refuses an interrupted probe without diagnosing lock drift', () => {
    const result = checkWithNpm("process.kill(process.pid, 'SIGTERM')")
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('SIGTERM')
    expect(result.stderr).not.toContain('OUT OF SYNC')
    expect(result.stderr).not.toContain('npm install --package-lock-only')
  }, 30_000)

  it('retains infrastructure errors without prescribing a lock rewrite', () => {
    const result = checkWithNpm("console.error('npm error code EACCES'); process.exitCode = 1")
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('EACCES')
    expect(result.stderr).not.toContain('OUT OF SYNC')
  }, 30_000)

  it('still diagnoses an npm-confirmed missing lock entry', () => {
    const result = checkWithNpm(
      "console.error('npm error EUSAGE Missing: stock@1.0.0 from lock file'); process.exitCode = 1",
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('OUT OF SYNC')
    expect(result.stderr).toContain('Missing: stock@1.0.0')
  }, 30_000)

  it('accepts a successful npm probe', () => {
    const result = checkWithNpm('process.exitCode = 0')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Lock file OK')
  }, 30_000)
})
