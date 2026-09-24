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

import { provider as gitea } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const listBody: unknown = [
  {
    full_name: 'gitea/tea',
    clone_url: 'https://gitea.com/gitea/tea.git',
    private: false,
    default_branch: 'main',
    size: 4096,
    updated_at: '2026-09-01T12:00:00Z',
    description: 'A command line tool to interact with Gitea servers',
  },
]
const repoBody: unknown = {
  full_name: 'gitea/tea',
  clone_url: 'https://gitea.com/gitea/tea.git',
  private: false,
  default_branch: 'main',
  size: 4096,
  updated_at: '2026-09-01T12:00:00Z',
  description: 'A command line tool to interact with Gitea servers',
}

const route = (url: string): Response => {
  if (url.includes('/user/repos?limit=')) return json(listBody)
  if (url.includes('/repos/gitea/tea')) return json(repoBody)
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

    registerGitProvider(gitea)

    const connection = { providerId: 'gitea', token: 'user-oauth-token' }

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
      path: 'gitea/tea',
    })
    console.log(repos.length, repo?.defaultBranch)

    const expected = {
      fullName: 'gitea/tea',
      url: 'https://gitea.com/gitea/tea.git',
      private: false,
      defaultBranch: 'main',
      sizeKb: 4096,
      updatedAt: '2026-09-01T12:00:00Z',
      description: 'A command line tool to interact with Gitea servers',
    }
    expect(repos).toEqual([expected])
    expect(repo).toEqual(expected)
    expect(log).toHaveBeenCalledWith(1, 'main')

    const [listUrl, listInit] = fetchMock.mock.calls[0] ?? []
    expect(String(listUrl).startsWith('https://gitea.com/api/v1')).toBe(true)
    expect((listInit?.headers as Record<string, string>).authorization).toBe(
      'token user-oauth-token',
    )
  })

  it('returns null for a repository the API reports as 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Not Found' }, 404)),
    )
    registerGitProvider(gitea)
    const git = requireGitProvider('gitea')

    expect(
      await git.getRepository({ host: git.defaultHost, token: null, path: 'nobody/nothing' }),
    ).toBeNull()
  })
})
