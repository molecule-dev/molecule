/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the real in-memory custom
 * bond (no mocks).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { createProvider } from '@molecule/api-permissions-custom'

import { assign, can, createRole, setProvider } from '../index.js'

describe('README @example', () => {
  it('creates a role, assigns it, and checks RBAC + ABAC permissions', async () => {
    setProvider(createProvider({ wildcards: true }))
    await createRole({
      name: 'editor',
      permissions: [
        { id: 'post-read', action: 'read', resource: 'post' },
        {
          id: 'post-update-own',
          action: 'update',
          resource: 'post',
          conditions: { ownerOnly: true },
        },
      ],
    })
    await assign('user:123', 'editor')

    const post = { id: 'post-1', authorId: 'user:123' }
    const subject = 'user:123'
    expect(await can(subject, 'read', 'post')).toBe(true)
    expect(await can(subject, 'update', 'post', { ownerOnly: post.authorId === subject })).toBe(
      true,
    )
    expect(await can(subject, 'delete', 'post')).toBe(false)

    // Someone else's post: the ABAC condition fails.
    const other = { id: 'post-2', authorId: 'user:999' }
    expect(await can(subject, 'update', 'post', { ownerOnly: other.authorId === subject })).toBe(
      false,
    )
    // An unassigned subject gets nothing.
    expect(await can('user:456', 'read', 'post')).toBe(false)
  })
})
