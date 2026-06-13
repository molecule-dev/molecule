/**
 * Tests for the `/share` command parsing, payload builder, role validation, and
 * public-URL resolver.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { COMMAND_CATEGORIES, COMMANDS } from '../components/chat-commands.js'
import {
  buildSharePayload,
  buildShareUrl,
  DEFAULT_SHARE_ROLE,
  isShareRole,
  parseShareCommand,
  SHARE_ROLES,
  type ShareLinkResult,
} from '../components/chat-share-utilities.js'

describe('SHARE_ROLES contract', () => {
  it('mirrors the api-resource-share role order (least → most privileged)', () => {
    expect(SHARE_ROLES).toEqual(['viewer', 'commenter', 'editor', 'owner'])
  })

  it('defaults to the safest role', () => {
    expect(DEFAULT_SHARE_ROLE).toBe('viewer')
  })
})

describe('isShareRole', () => {
  it('accepts every known role', () => {
    for (const role of SHARE_ROLES) expect(isShareRole(role)).toBe(true)
  })

  it('rejects unknown / mis-cased values', () => {
    expect(isShareRole('admin')).toBe(false)
    expect(isShareRole('Viewer')).toBe(false) // callers lower-case first
    expect(isShareRole('')).toBe(false)
  })
})

describe('parseShareCommand', () => {
  it('creates a viewer link for bare /share', () => {
    expect(parseShareCommand('/share')).toEqual({ kind: 'create', role: 'viewer' })
    expect(parseShareCommand('  /share  ')).toEqual({ kind: 'create', role: 'viewer' })
  })

  it('uses a named, valid role (any case)', () => {
    expect(parseShareCommand('/share editor')).toEqual({ kind: 'create', role: 'editor' })
    expect(parseShareCommand('/SHARE Owner')).toEqual({ kind: 'create', role: 'owner' })
    expect(parseShareCommand('/share  commenter ')).toEqual({ kind: 'create', role: 'commenter' })
  })

  it('reports an unrecognized role as invalid (preserving the raw arg)', () => {
    expect(parseShareCommand('/share admin')).toEqual({ kind: 'invalid', arg: 'admin' })
    expect(parseShareCommand('/share god mode')).toEqual({ kind: 'invalid', arg: 'god mode' })
  })

  it('returns null for non-/share input', () => {
    expect(parseShareCommand('/shared')).toBeNull()
    expect(parseShareCommand('/sharer viewer')).toBeNull()
    expect(parseShareCommand('share this')).toBeNull()
  })
})

describe('buildSharePayload', () => {
  it('carries the chosen role', () => {
    expect(buildSharePayload('editor')).toEqual({ role: 'editor' })
    expect(buildSharePayload('owner')).toEqual({ role: 'owner' })
  })

  it('defaults to the viewer role', () => {
    expect(buildSharePayload()).toEqual({ role: 'viewer' })
  })

  it('produces exactly the POST contract — { role } and nothing else', () => {
    expect(Object.keys(buildSharePayload('commenter'))).toEqual(['role'])
  })
})

describe('buildShareUrl', () => {
  const base: ShareLinkResult = { id: 's1', slug: 'abc123', role: 'viewer' }

  it('builds <origin>/share/<slug> from the page origin', () => {
    expect(buildShareUrl(base, 'https://molecule.dev')).toBe('https://molecule.dev/share/abc123')
  })

  it('tolerates a trailing slash on the origin', () => {
    expect(buildShareUrl(base, 'https://molecule.dev/')).toBe('https://molecule.dev/share/abc123')
  })

  it('prefers a backend-supplied canonical url over construction', () => {
    expect(
      buildShareUrl({ ...base, url: 'https://app.example.com/s/abc123' }, 'https://molecule.dev'),
    ).toBe('https://app.example.com/s/abc123')
  })
})

describe('command registry wiring', () => {
  it('registers /share under the collaborate category with role usage', () => {
    const share = COMMANDS.find((c) => c.id === 'share')
    expect(share).toMatchObject({ label: '/share', category: 'collaborate' })
    expect(share?.usage).toContain('viewer')
    expect(share?.usage).toContain('owner')
  })

  it('exposes a collaborate category for grouping', () => {
    expect(COMMAND_CATEGORIES.some((c) => c.key === 'collaborate')).toBe(true)
  })
})
