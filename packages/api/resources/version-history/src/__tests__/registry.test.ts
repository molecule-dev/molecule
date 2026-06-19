import { afterEach, describe, expect, it } from 'vitest'

import {
  clearOwnershipResolvers,
  getOwnershipResolver,
  registerOwnershipResolver,
  unregisterOwnershipResolver,
  type VersionOwnershipResolver,
} from '../registry.js'

describe('@molecule/api-resource-version-history ownership registry', () => {
  afterEach(() => {
    clearOwnershipResolvers()
  })

  it('returns undefined for an unregistered resource type (fail-closed source)', () => {
    expect(getOwnershipResolver('doc')).toBeUndefined()
  })

  it('registers and retrieves a resolver by resource type', () => {
    const resolver: VersionOwnershipResolver = ({ userId }) => userId === 'owner'
    registerOwnershipResolver('doc', resolver)

    expect(getOwnershipResolver('doc')).toBe(resolver)
  })

  it('overwrites a resolver registered for the same resource type', () => {
    const first: VersionOwnershipResolver = () => true
    const second: VersionOwnershipResolver = () => false
    registerOwnershipResolver('doc', first)
    registerOwnershipResolver('doc', second)

    expect(getOwnershipResolver('doc')).toBe(second)
  })

  it('keeps resolvers isolated per resource type', () => {
    const docResolver: VersionOwnershipResolver = () => true
    registerOwnershipResolver('doc', docResolver)

    expect(getOwnershipResolver('doc')).toBe(docResolver)
    expect(getOwnershipResolver('project')).toBeUndefined()
  })

  it('unregisters a resolver and reports whether one was removed', () => {
    registerOwnershipResolver('doc', () => true)

    expect(unregisterOwnershipResolver('doc')).toBe(true)
    expect(getOwnershipResolver('doc')).toBeUndefined()
    expect(unregisterOwnershipResolver('doc')).toBe(false)
  })

  it('clears all resolvers', () => {
    registerOwnershipResolver('doc', () => true)
    registerOwnershipResolver('project', () => true)

    clearOwnershipResolvers()

    expect(getOwnershipResolver('doc')).toBeUndefined()
    expect(getOwnershipResolver('project')).toBeUndefined()
  })
})
