/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The provider is pure in-memory, so
 * nothing is mocked.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { assign, can, createRole, setProvider } from '@molecule/api-permissions'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the in-memory provider and evaluates wildcards and ABAC conditions', async () => {
    setProvider(createProvider({ wildcards: true }))

    await createRole({ name: 'admin', permissions: [{ id: 'all', action: '*', resource: '*' }] })
    await createRole({
      name: 'author',
      permissions: [
        { id: 'post-read', action: 'read', resource: 'post' },
        { id: 'post-edit-own', action: 'update', resource: 'post', conditions: { isOwner: true } },
      ],
    })
    await assign('user-1', 'admin')
    await assign('user-2', 'author')

    expect(await can('user-1', 'delete', 'invoice')).toBe(true)
    expect(await can('user-2', 'update', 'post', { isOwner: true })).toBe(true)
    expect(await can('user-2', 'update', 'post', { isOwner: false })).toBe(false)
    expect(await can('user-2', 'update', 'post')).toBe(false)
    expect(await can('user-2', 'read', 'post')).toBe(true)
  })
})
