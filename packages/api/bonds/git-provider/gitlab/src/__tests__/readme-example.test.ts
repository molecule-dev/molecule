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

import { provider as gitlab } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const listBody: unknown = [
  {
    path_with_namespace: 'gitlab-org/gitlab-runner',
    http_url_to_repo: 'https://gitlab.com/gitlab-org/gitlab-runner.git',
    visibility: 'public',
    default_branch: 'main',
    statistics: { repository_size: 2097152 },
    last_activity_at: '2026-09-01T12:00:00Z',
    description: 'GitLab Runner',
  },
]
const repoBody: unknown = {
  path_with_namespace: 'gitlab-org/gitlab-runner',
  http_url_to_repo: 'https://gitlab.com/gitlab-org/gitlab-runner.git',
  visibility: 'public',
  default_branch: 'main',
  statistics: { repository_size: 2097152 },
  last_activity_at: '2026-09-01T12:00:00Z',
  description: 'GitLab Runner',
}

const route = (url: string): Response => {
  if (url.includes('/projects?membership=true')) return json(listBody)
  if (url.includes('/projects/gitlab-org%2Fgitlab-runner')) return json(repoBody)
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

    registerGitProvider(gitlab)

    const connection = { providerId: 'gitlab', token: 'user-oauth-token' }

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
      path: 'gitlab-org/gitlab-runner',
    })
    console.log(repos.length, repo?.defaultBranch)

    const expected = {
      fullName: 'gitlab-org/gitlab-runner',
      url: 'https://gitlab.com/gitlab-org/gitlab-runner.git',
      private: false,
      defaultBranch: 'main',
      sizeKb: 2048,
      updatedAt: '2026-09-01T12:00:00Z',
      description: 'GitLab Runner',
    }
    expect(repos).toEqual([expected])
    expect(repo).toEqual(expected)
    expect(log).toHaveBeenCalledWith(1, 'main')

    const [listUrl, listInit] = fetchMock.mock.calls[0] ?? []
    expect(String(listUrl).startsWith('https://gitlab.com/api/v4')).toBe(true)
    expect((listInit?.headers as Record<string, string>).authorization).toBe(
      'Bearer user-oauth-token',
    )
  })

  it('returns null for a repository the API reports as 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Not Found' }, 404)),
    )
    registerGitProvider(gitlab)
    const git = requireGitProvider('gitlab')

    expect(
      await git.getRepository({ host: git.defaultHost, token: null, path: 'nobody/nothing' }),
    ).toBeNull()
  })
})
