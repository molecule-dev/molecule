import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('portable session guidance', () => {
  it.each(['../index.ts', '../browser-storage.ts', '../../README.md'])(
    '%s describes a reusable session contract without workload-specific examples',
    (relative) => {
      const guidance = readFileSync(new URL(relative, import.meta.url), 'utf8')
      expect(guidance).not.toMatch(
        /RealWorld|jwtToken|["“]Follow["”]|xr-molecule-flash|pagination\s+spec/i,
      )
    },
  )

  it('counterexample: documents the real configurable key and authorization scheme', () => {
    const guidance = readFileSync(new URL('../index.ts', import.meta.url), 'utf8')
    expect(guidance).toContain("tokenKey: 'app.jwt'")
    expect(guidance).toContain("authScheme: 'Token'")
    expect(guidance).toContain('mapAuthResponse')
  })
})
