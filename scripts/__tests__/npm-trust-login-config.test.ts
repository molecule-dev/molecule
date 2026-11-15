/**
 * npmUserconfigWithToken: the temporary npm config that lets `npm publish` use a
 * login this run got from the owner's phone, without rewriting ~/.npmrc.
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { npmUserconfigWithToken } from '../lib/npm-trust.mjs'

const dirs: string[] = []
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true })
})

/** A scratch home holding `npmrc` as its ~/.npmrc, and a scratch runtime dir. */
function scratch(npmrc?: string) {
  const base = mkdtempSync(join(tmpdir(), 'npm-login-config-'))
  dirs.push(base)
  const home = join(base, 'home')
  const run = join(base, 'run')
  mkdirSync(home)
  mkdirSync(run)
  if (npmrc !== undefined) writeFileSync(join(home, '.npmrc'), npmrc)
  return { home, run }
}

/** What npm itself loads, run with an empty HOME so the real ~/.npmrc stays out of it. */
const npmConfigList = (home: string, args: string[]) =>
  execFileSync('npm', ['config', 'list', ...args], {
    cwd: home,
    env: { ...process.env, HOME: home, npm_config_userconfig: undefined },
    encoding: 'utf8',
  })

describe('npmUserconfigWithToken', () => {
  it('swaps the saved token for the new one, keeps the other lines, and is private', () => {
    const { home, run } = scratch(
      'save-exact=true\n//registry.npmjs.org/:_authToken=old-dead-token\nfund=false\n',
    )
    const config = npmUserconfigWithToken('fresh-token', { home, dir: run })
    expect(dirname(config.path).startsWith(run)).toBe(true)
    expect(readFileSync(config.path, 'utf8')).toBe(
      'save-exact=true\nfund=false\n//registry.npmjs.org/:_authToken=fresh-token\n',
    )
    expect(statSync(config.path).mode & 0o777).toBe(0o600)
    expect(statSync(dirname(config.path)).mode & 0o777).toBe(0o700)
    // ~/.npmrc is never rewritten.
    expect(readFileSync(join(home, '.npmrc'), 'utf8')).toMatch(/old-dead-token/)
    config.dispose()
    expect(existsSync(dirname(config.path))).toBe(false)
  })

  it('works with no ~/.npmrc at all', () => {
    const { home, run } = scratch()
    const config = npmUserconfigWithToken('fresh-token', { home, dir: run })
    expect(readFileSync(config.path, 'utf8')).toBe('//registry.npmjs.org/:_authToken=fresh-token\n')
    config.dispose()
  })

  it('is what npm reads when given --userconfig, and npm sees no token without it', () => {
    const { home, run } = scratch()
    const config = npmUserconfigWithToken('fresh-token', { home, dir: run })
    // npm never prints a token; it lists the key as "(protected)" once it has loaded one.
    expect(npmConfigList(home, ['--userconfig', config.path])).toMatch(
      /^\/\/registry\.npmjs\.org\/:_authToken = \(protected\)$/m,
    )
    expect(npmConfigList(home, [])).not.toMatch(/_authToken/)
    config.dispose()
  })
})
