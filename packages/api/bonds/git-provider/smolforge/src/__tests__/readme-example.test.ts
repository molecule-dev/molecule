/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`, used by
 * `@molecule/api-http`'s built-in client) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearGitProviders,
  registerGitProvider,
  requireGitProvider,
} from '@molecule/api-git-provider'

import { provider as smolforge } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const listBody: unknown = {
  repositories: [
    {
      name: 'notes',
      owner: { username: 'ada' },
      visibility: 'private',
      default_branch: 'main',
      updated_at: '2026-09-01T12:00:00Z',
      description: 'Research notes',
    },
  ],
}
const repoBody: unknown = {
  repository: {
    name: 'notes',
    owner: { username: 'ada' },
    visibility: 'private',
    default_branch: 'main',
    updated_at: '2026-09-01T12:00:00Z',
    description: 'Research notes',
  },
}

const route = (url: string): Response => {
  if (url.includes('/api/repos?per_page=')) return json(listBody)
  if (url.includes('/api/repos/ada/notes')) return json(repoBody)
  return json({ message: 'Not Found' }, 404)
}

describe('README @example', () => {
  afterEach(() => {
    clearGitProviders()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("lists the user's repositories and looks one up through the registry", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) =>
      route(String(input)),
    )
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    registerGitProvider(smolforge)

    const connection = { providerId: 'smolforge', token: 'user-access-token' }

    const git = requireGitProvider(connection.providerId)
    const repos = await git.listRepositories({
      host: git.defaultHost,
      token: connection.token,
      page: 1,
      perPage: 30,
    })

    const repo = await git.getRepository({
      host: git.defaultHost,
      token: connection.token,
      path: 'ada/notes',
    })
    console.log(repos.length, repo?.defaultBranch)

    const expected = {
      fullName: 'ada/notes',
      url: 'https://forge.smol.ai/ada/notes.git',
      private: true,
      defaultBranch: 'main',
      sizeKb: null,
      updatedAt: '2026-09-01T12:00:00Z',
      description: 'Research notes',
    }
    expect(repos).toEqual([expected])
    expect(repo).toEqual(expected)
    expect(log).toHaveBeenCalledWith(1, 'main')

    const [listUrl, listInit] = fetchMock.mock.calls[0] ?? []
    expect(String(listUrl).startsWith('https://forge.smol.ai/api')).toBe(true)
    expect((listInit?.headers as Record<string, string>).authorization).toBe(
      'Bearer user-access-token',
    )
  })

  it('returns null for a repository the API reports as 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Not Found' }, 404)),
    )
    registerGitProvider(smolforge)
    const git = requireGitProvider('smolforge')

    expect(
      await git.getRepository({ host: git.defaultHost, token: null, path: 'nobody/nothing' }),
    ).toBeNull()
  })
})
