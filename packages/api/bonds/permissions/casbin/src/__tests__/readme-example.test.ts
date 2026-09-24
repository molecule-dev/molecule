/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, against the real Casbin enforcer
 * (in-memory, no outside world to mock).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { assign, can, createRole, getRoles, setProvider } from '@molecule/api-permissions'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds Casbin through the core and enforces role policies', async () => {
    setProvider(createProvider())

    await createRole({
      name: 'editor',
      permissions: [
        { id: 'post-read', action: 'read', resource: 'post' },
        { id: 'post-write', action: 'write', resource: 'post' },
      ],
    })
    await assign('user-42', 'editor')

    const allowed = await can('user-42', 'write', 'post')
    const denied = await can('user-42', 'delete', 'post')
    const roles = await getRoles('user-42')

    expect(allowed).toBe(true)
    expect(denied).toBe(false)
    expect(roles).toHaveLength(1)
    expect(roles[0]).toMatchObject({ id: 'role-1', name: 'editor' })
    expect(await can('user-7', 'read', 'post')).toBe(false)
  })

  it('rejects conditional (ABAC) permissions instead of granting them unconditionally', async () => {
    setProvider(createProvider())
    await expect(
      createRole({
        name: 'owner',
        permissions: [
          { id: 'own-delete', action: 'delete', resource: 'post', conditions: { ownerOnly: true } },
        ],
      }),
    ).rejects.toThrow(/RBAC-only/)
  })
})
