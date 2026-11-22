// @vitest-environment jsdom
/**
 * `ShareLinkManager` — the shared public-link UI used by both `ShareModal` and
 * a host's team/access panel.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/share-link-manager.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Svelte 5's own `mount` under the theme and http contexts (the only providers
 * the component needs). Two extra cases cover the paths the conformance kit
 * cannot exercise in jsdom: the failure messages (the React component logs
 * them) and the copy confirmation's timer.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

// Deliberately the package BARREL, not the component paths — a host has no
// other way in, so this import IS half the contract under test.
import { ShareLinkManager } from '../index.js'
import Host from './ShareLinkManagerHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

const LINK = { id: 'l1', slug: 'abc123', role: 'viewer' as const }

const get = vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<never>>>()
const post =
  vi.fn<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>>()
const del = vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<never>>>()

/**
 * A full {@link HttpResponse} for a stub to resolve with.
 *
 * @param data - The response body.
 * @returns The response.
 */
function responseOf(data: unknown): HttpResponse<never> {
  // The payload stands in for the server's reply; the client contract is
  // caller-generic, which no concrete payload can prove, so the stub types it
  // never and the interface widens it to the caller's T.
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/**
 * An {@link HttpClient} whose reads and writes are observable.
 *
 * @returns A stub HTTP client.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
    post,
    put: reject,
    patch: reject,
    delete: del,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** The mounts this file made, unmounted before the next render. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  get.mockReset().mockResolvedValue(responseOf({ data: [] }))
  post.mockReset().mockResolvedValue(responseOf(LINK))
  del.mockReset().mockResolvedValue(responseOf({}))
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
  vi.useRealTimers()
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Mount the manager standalone, the way a host does.
 *
 * @param props - The component's props.
 * @returns The container.
 */
function renderManager(props: Record<string, unknown>): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(Host, {
    target: container,
    props: {
      projectId: 'p1',
      theme: buildThemeProvider('dark'),
      http: buildHttpClient(),
      ...props,
    },
  })
  mounted.push({ instance: instance as Record<string, unknown>, container })
  return container
}

/** Lets Svelte flush what a DOM event or a settled promise queued. */
async function settle(): Promise<void> {
  flushSync()
  await Promise.resolve()
  flushSync()
}

describe('ShareLinkManager', () => {
  it('shows an existing link as an absolute URL with revoke, and NOT a create control', async () => {
    // A Svelte component is a component function; the contract is that the
    // barrel hands out the real one (React's `typeof` check).
    expect(ShareLinkManager).toBeDefined()
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = renderManager({})

    const field = await vi.waitFor(() => {
      const el = molId(container, 'share-link-url') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    // Absolute, not the bare "/share/…" path.
    expect(field.value).toMatch(/^https?:\/\/.+\/share\/abc123$/)
    expect(molId(container, 'share-link-revoke-l1')).not.toBeNull()
    // A link already exists, so no "Create link".
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('copies the absolute URL to the clipboard when the link is clicked', async () => {
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = renderManager({})

    const field = await vi.waitFor(() => {
      const el = molId(container, 'share-link-url') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    field.click()
    await vi.waitFor(() => expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1))
    expect(copyTextWithFallbackMock.mock.calls[0]?.[0]).toMatch(/\/share\/abc123$/)
    // Visual confirmation: the copy control flips to "Copied".
    await vi.waitFor(() =>
      expect(molId(container, 'share-link-copy')?.textContent).toContain('Copied'),
    )
  })

  it('keeps the copied confirmation off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = renderManager({})

    const copy = await vi.waitFor(() => {
      const el = molId(container, 'share-link-copy')
      expect(el).not.toBeNull()
      return el as HTMLButtonElement
    })
    copy.click()
    await vi.waitFor(() => expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1))
    expect(copyTextWithFallbackMock.mock.calls[0]?.[0]).toMatch(/\/share\/abc123$/)
    // No confirmation: the copy control still reads "Copy".
    await settle()
    expect(molId(container, 'share-link-copy')?.textContent).not.toContain('Copied')
  })

  it('revokes a link, then offers create again', async () => {
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = renderManager({})

    const revoke = await vi.waitFor(() => {
      expect(molId(container, 'share-link-revoke-l1')).not.toBeNull()
      return molId(container, 'share-link-revoke-l1') as HTMLButtonElement
    })
    revoke.click()

    await vi.waitFor(() => expect(del).toHaveBeenCalledWith('/projects/p1/shares/l1'))
    // The link is gone and create returns.
    await vi.waitFor(() => expect(molId(container, 'share-create')).not.toBeNull())
    expect(molId(container, 'share-link-url')).toBeNull()
  })

  it('creates a link when none exists, then hides the create control', async () => {
    const container = renderManager({})

    const create = await vi.waitFor(() => {
      expect(molId(container, 'share-create')).not.toBeNull()
      return molId(container, 'share-create') as HTMLButtonElement
    })
    create.click()

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' }),
    )
    await vi.waitFor(() => expect(molId(container, 'share-link-url')).not.toBeNull())
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('lets a read-only caller see and copy a link but never manage it', async () => {
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = renderManager({ canManage: false })

    await vi.waitFor(() => {
      expect(molId(container, 'share-link-url')).not.toBeNull()
    })
    // No revoke, and if there were no link, no create either.
    expect(molId(container, 'share-link-revoke-l1')).toBeNull()
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('tells a read-only caller when there is no link, without offering create', async () => {
    const container = renderManager({ canManage: false })

    await vi.waitFor(() => {
      expect(molId(container, 'share-links-none')).not.toBeNull()
    })
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('shows an error when creating a link fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    post.mockRejectedValue(new Error('nope'))

    const container = renderManager({})
    const create = await vi.waitFor(() => {
      expect(molId(container, 'share-create')).not.toBeNull()
      return molId(container, 'share-create') as HTMLButtonElement
    })
    create.click()

    await vi.waitFor(() =>
      expect(molId(container, 'share-error')?.textContent).toContain(
        'Could not create a share link. Please try again.',
      ),
    )
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('shows an error when revoking a link fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    get.mockResolvedValue(responseOf({ data: [LINK] }))
    del.mockRejectedValue(new Error('nope'))

    const container = renderManager({})
    const revoke = await vi.waitFor(() => {
      expect(molId(container, 'share-link-revoke-l1')).not.toBeNull()
      return molId(container, 'share-link-revoke-l1') as HTMLButtonElement
    })
    revoke.click()

    await vi.waitFor(() =>
      expect(molId(container, 'share-error')?.textContent).toContain(
        'Could not revoke that link. Please try again.',
      ),
    )
    // The link survives a failed revoke.
    expect(molId(container, 'share-link-url')).not.toBeNull()
    warn.mockRestore()
  })

  it('clears the copied confirmation after 1.5 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = renderManager({})
    const copy = await vi.waitFor(() => {
      expect(molId(container, 'share-link-copy')).not.toBeNull()
      return molId(container, 'share-link-copy') as HTMLButtonElement
    })
    copy.click()
    await vi.waitFor(() =>
      expect(molId(container, 'share-link-copy')?.textContent).toContain('Copied'),
    )
    vi.advanceTimersByTime(1600)
    await settle()
    expect(molId(container, 'share-link-copy')?.textContent).not.toContain('Copied')
  })
})
