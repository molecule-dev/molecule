/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the GitHub and GitLab bonds.
 * Only `fetch` (the GitHub REST API, reached via `@molecule/api-http`'s
 * built-in client) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provider as github } from '@molecule/api-git-provider-github'
import { provider as gitlab } from '@molecule/api-git-provider-gitlab'

import { listGitProviders, registerGitProvider, requireGitProvider } from '../index.js'

const jsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const repo = (name: string): Record<string, unknown> => ({
  full_name: `acme/${name}`,
  clone_url: `https://github.com/acme/${name}.git`,
  private: true,
  default_branch: 'main',
})

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers hosts, lists them for a picker and pages through repositories', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([repo('app'), repo('api')]))
      .mockResolvedValueOnce(jsonResponse([repo('docs')]))
      .mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    registerGitProvider(github)
    registerGitProvider(gitlab)

    const options = listGitProviders().map((p) => ({ id: p.id, label: p.label }))
    expect(options).toEqual([
      { id: 'github', label: 'GitHub' },
      { id: 'gitlab', label: 'GitLab' },
    ])

    async function importableRepos(
      providerId: string,
      token: string,
    ): Promise<{ fullName: string; cloneUrl: string; branch: string | null }[]> {
      const git = requireGitProvider(providerId)
      const repos = []
      for (let page = 1; ; page++) {
        const batch = await git.listRepositories({
          host: git.defaultHost,
          token,
          page,
          perPage: 100,
        })
        if (batch.length === 0) break
        repos.push(...batch)
      }
      return repos.map((r) => ({ fullName: r.fullName, cloneUrl: r.url, branch: r.defaultBranch }))
    }

    const repos = await importableRepos('github', 'user-oauth-token')
    expect(repos).toEqual([
      { fullName: 'acme/app', cloneUrl: 'https://github.com/acme/app.git', branch: 'main' },
      { fullName: 'acme/api', cloneUrl: 'https://github.com/acme/api.git', branch: 'main' },
      { fullName: 'acme/docs', cloneUrl: 'https://github.com/acme/docs.git', branch: 'main' },
    ])

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [firstUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(firstUrl).toContain('https://api.github.com/user/repos?')
    expect(firstUrl).toContain('per_page=100&page=1')
    expect(init.headers).toMatchObject({ authorization: 'Bearer user-oauth-token' })

    expect(() => requireGitProvider('bitbucket')).toThrow('No git provider is wired for')
  })
})
