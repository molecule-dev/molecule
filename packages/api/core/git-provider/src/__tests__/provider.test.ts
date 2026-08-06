import { beforeEach, describe, expect, it } from 'vitest'

// The registry is a NAMED multi-provider category: several git hosts are wired
// at once because different users connect different ones. These pin the parts a
// consumer relies on — that the wired set drives the UI, and that a missing
// provider fails loudly rather than resolving to some default.
import {
  clearGitProviders,
  getGitProvider,
  hasGitProvider,
  listGitProviders,
  registerGitProvider,
  requireGitProvider,
} from '../provider.js'
import type { GitProvider } from '../types.js'

const stub = (id: string, label = id): GitProvider => ({
  id,
  label,
  defaultHost: `${id}.example`,
  auth: { kind: 'oauth', authorizeUrl: 'https://a', tokenUrl: 'https://t', scope: 's' },
  basicAuthUsername: 'x-access-token',
  apiBaseForHost: (host) => `https://${host}/api`,
  apiHeaders: () => ({}),
  listRepositories: async () => [],
  getRepository: async () => null,
})

beforeEach(() => {
  clearGitProviders()
})

describe('registry', () => {
  it('registers and looks up by id', () => {
    registerGitProvider(stub('github', 'GitHub'))

    expect(getGitProvider('github')?.label).toBe('GitHub')
    expect(hasGitProvider('github')).toBe(true)
  })

  it('holds several at once — this is not a singleton category', () => {
    registerGitProvider(stub('github'))
    registerGitProvider(stub('gitlab'))
    registerGitProvider(stub('smolforge'))

    // One deployment serves users connected to different hosts simultaneously;
    // a "current provider" model could not express that.
    expect(listGitProviders().map((p) => p.id)).toEqual(['github', 'gitlab', 'smolforge'])
  })

  it('returns undefined rather than throwing for an unwired id', () => {
    expect(getGitProvider('nope')).toBeUndefined()
    expect(hasGitProvider('nope')).toBe(false)
  })

  it('replaces on re-registration instead of duplicating', () => {
    registerGitProvider(stub('github', 'Old'))
    registerGitProvider(stub('github', 'New'))

    expect(listGitProviders()).toHaveLength(1)
    expect(getGitProvider('github')?.label).toBe('New')
  })
})

describe('requireGitProvider', () => {
  it('names what IS wired, because "unknown provider" is unactionable', () => {
    registerGitProvider(stub('github'))

    expect(() => requireGitProvider('gitlab')).toThrow(/github/)
  })

  it('says none are wired when the registry is empty', () => {
    expect(() => requireGitProvider('github')).toThrow(/None are wired/)
  })

  it('returns the provider when present', () => {
    registerGitProvider(stub('github'))

    expect(requireGitProvider('github').id).toBe('github')
  })
})

describe('the shape a consumer depends on', () => {
  it('lets a picker render the wired set without naming a vendor', () => {
    registerGitProvider(stub('gitea', 'Gitea'))
    registerGitProvider(stub('github', 'GitHub'))

    // Exactly what replaces `const GIT_PROVIDERS = ['github','gitlab'] as const`.
    const options = listGitProviders().map((p) => ({ id: p.id, label: p.label }))

    expect(options).toEqual([
      { id: 'gitea', label: 'Gitea' },
      { id: 'github', label: 'GitHub' },
    ])
  })

  it('allows a null basicAuthUsername, meaning "use the account username"', () => {
    const pat: GitProvider = {
      ...stub('smolforge'),
      auth: { kind: 'pat', tokensUrl: 'https://forge.example/settings/tokens' },
      basicAuthUsername: null,
    }
    registerGitProvider(pat)

    const p = requireGitProvider('smolforge')
    expect(p.auth.kind).toBe('pat')
    // A consumer MUST substitute the connected account's username here; the
    // provider cannot know it, which is why the field is nullable at all.
    expect(p.basicAuthUsername).toBeNull()
  })
})
