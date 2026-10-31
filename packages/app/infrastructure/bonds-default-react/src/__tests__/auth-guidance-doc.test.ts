import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const packageRoot = join(__dirname, '..', '..')

describe('generated default-auth guidance', () => {
  it('uses generic API names in the public guidance', () => {
    const source = readFileSync(join(packageRoot, 'src', 'auth.ts'), 'utf8')
    expect(source).not.toMatch(/RealWorld|realWorld|jwtToken|\/articles|favorited|`following`/)
  })

  it('keeps the capability list and nested-token example visible in the README', () => {
    const readme = readFileSync(join(packageRoot, 'README.md'), 'utf8')

    expect(readme).toContain('What this client already handles')
    for (const field of [
      'getAccessToken()',
      'tokenKey',
      'authScheme',
      'mapAuthResponse',
      'currentUserEndpoint',
      'profileUpdateMethod',
      'logout()',
      'refresh()',
    ]) {
      expect(readme).toContain(field)
    }
    expect(readme).toContain('AuthProvider` renders children immediately')
    expect(readme).toContain(
      'Adapt a nested token and `Token` header without another session store.',
    )
    expect(readme).toContain("tokenKey: 'app.jwt'")
    expect(readme).toContain("profileUpdateMethod: 'PUT'")
  })
})
