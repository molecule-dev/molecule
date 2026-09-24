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

import { provider as github } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const listBody: unknown = [
  {
    full_name: 'octocat/Hello-World',
    clone_url: 'https://github.com/octocat/Hello-World.git',
    private: false,
    default_branch: 'master',
    size: 108,
    pushed_at: '2026-09-01T12:00:00Z',
    description: 'My first repository on GitHub!',
  },
]
const repoBody: unknown = {
  full_name: 'octocat/Hello-World',
  clone_url: 'https://github.com/octocat/Hello-World.git',
  private: false,
  default_branch: 'master',
  size: 108,
  pushed_at: '2026-09-01T12:00:00Z',
  description: 'My first repository on GitHub!',
}

const route = (url: string): Response => {
  if (url.includes('/user/repos?sort=pushed')) return json(listBody)
  if (url.includes('/repos/octocat/Hello-World')) return json(repoBody)
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

    registerGitProvider(github)

    const connection = { providerId: 'github', token: 'user-oauth-token' }

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
      path: 'octocat/Hello-World',
    })
    console.log(repos.length, repo?.defaultBranch)

    const expected = {
      fullName: 'octocat/Hello-World',
      url: 'https://github.com/octocat/Hello-World.git',
      private: false,
      defaultBranch: 'master',
      sizeKb: 108,
      updatedAt: '2026-09-01T12:00:00Z',
      description: 'My first repository on GitHub!',
    }
    expect(repos).toEqual([expected])
    expect(repo).toEqual(expected)
    expect(log).toHaveBeenCalledWith(1, 'master')

    const [listUrl, listInit] = fetchMock.mock.calls[0] ?? []
    expect(String(listUrl).startsWith('https://api.github.com')).toBe(true)
    expect((listInit?.headers as Record<string, string>).authorization).toBe(
      'Bearer user-oauth-token',
    )
  })

  it('returns null for a repository the API reports as 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Not Found' }, 404)),
    )
    registerGitProvider(github)
    const git = requireGitProvider('github')

    expect(
      await git.getRepository({ host: git.defaultHost, token: null, path: 'nobody/nothing' }),
    ).toBeNull()
  })
})
