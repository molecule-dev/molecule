// @vitest-environment jsdom
/**
 * `ShareModal` — the `/share` dialog.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/share-modal-roles.test.tsx`
 * and `share-modal-host-content.test.tsx` with the same test names and the
 * same behavioral assertions, mounted through Svelte 5's own `mount` under the
 * theme and http contexts (the only providers the pair needs).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FullRequestConfig, HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

// Deliberately the package BARREL, not the component paths — a host has no
// other way in, so this import IS half the contract under test.
import { buildShareUrl, ShareModal } from '../index.js'
import Host from './ShareModalHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

const LINK = { id: 'l1', slug: 'abc123', role: 'viewer' as const }

const get = vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<never>>>()
const post =
  vi.fn<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>>()
const del = vi.fn<(url: string, config?: RequestConfig) => Promise<HttpResponse<never>>>()

/** The host content the host-content cases project into the dialog. */
const hostSection = createRawSnippet(() => ({
  render: () => '<div data-mol-id="host-section">extra</div>',
}))

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
    config: { method: 'GET', url: '' } as FullRequestConfig,
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

/** The mounts alive right now, unmounted before the next render. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // The manager lists existing links on mount; default to "none" so the create
  // control is what renders.
  get.mockReset().mockResolvedValue(responseOf({ data: [] }))
  post.mockReset().mockResolvedValue(responseOf(LINK))
  del.mockReset().mockResolvedValue(responseOf({}))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Mount the modal standalone, the way a host does.
 *
 * @param props - The modal's props.
 * @returns The container.
 */
function renderModal(
  props: Omit<ComponentProps<typeof Host>, 'projectId' | 'theme' | 'http'>,
): HTMLElement {
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
  flushSync()
  return container.ownerDocument.body
}

describe('ShareModal — offered roles', () => {
  it('offers no role choice by default and mints the safe role', async () => {
    expect(ShareModal).toBeDefined()
    const container = renderModal({ onClose: () => {} })

    // The create control appears once the (empty) link list has loaded.
    const create = await vi.waitFor(() => {
      const el = molId(container, 'share-create')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    // No select at all: with one role there is nothing to choose, and a control
    // whose value the backend overrides is worse than no control.
    expect(molId(container, 'share-role')).toBeNull()

    create.click()
    await vi.waitFor(() => {
      expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
    })
  })

  it('says what the single link will grant, instead of implying a choice', () => {
    const container = renderModal({ onClose: () => {} })
    expect(container.textContent).toContain('can act as viewer')
    expect(container.textContent).not.toContain('the role you choose')
  })

  it('offers exactly the roles the host declares, in order', async () => {
    const container = renderModal({ roles: ['viewer', 'editor'], onClose: () => {} })

    const select = await vi.waitFor(() => {
      const el = molId(container, 'share-role')
      expect(el).not.toBeNull()
      return el as HTMLSelectElement
    })
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['viewer', 'editor'])
  })

  it('ignores an initial role the host does not grant', async () => {
    const container = renderModal({ initialRole: 'owner', onClose: () => {} })

    const create = await vi.waitFor(() => {
      const el = molId(container, 'share-create')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    create.click()
    await vi.waitFor(() => {
      // `/share owner` must not POST a role the backend would silently downgrade.
      expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
    })
  })
})

describe('ShareModal — host content', () => {
  it('renders host children below the links', async () => {
    const container = renderModal({ onClose: () => {}, children: hostSection })
    await vi.waitFor(() => {
      expect(molId(container, 'share-create')).not.toBeNull()
    })
    const host = molId(container, 'host-section')
    expect(host).not.toBeNull()
    const create = molId(container, 'share-create')!
    // Links first, host sections after.
    expect(create.compareDocumentPosition(host!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('showLinks={false} hides the link section and never lists links', async () => {
    const container = renderModal({
      showLinks: false,
      onClose: () => {},
      children: hostSection,
    })
    expect(molId(container, 'host-section')).not.toBeNull()
    expect(molId(container, 'share-create')).toBeNull()
    expect(container.textContent).not.toContain('Create a public link')
    await new Promise((resolve) => {
      setTimeout(resolve, 20)
    })
    expect(get).not.toHaveBeenCalled()
  })

  it('closes on a backdrop click, but never on a click inside the dialog', () => {
    const onClose = vi.fn()
    const container = renderModal({ showLinks: false, onClose })
    const dialog = molId(container, 'share-modal') as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')

    dialog.click()
    flushSync()
    expect(onClose).not.toHaveBeenCalled()

    const backdrop = container.querySelector(
      '[role="presentation"]:has(> [data-mol-id="share-modal"])',
    ) as HTMLElement
    backdrop.click()
    flushSync()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ShareModal works standalone, with no ChatPanel in the tree', () => {
  it('is reachable from the package barrel and POSTs the link to the platform API', async () => {
    expect(typeof ShareModal).toBe('function')
    post.mockReset().mockResolvedValue(responseOf({ slug: 's1', role: 'viewer' }))
    const onCreated = vi.fn()

    const container = renderModal({ onClose: () => {}, onCreated })

    expect(molId(container, 'share-modal')).not.toBeNull()

    // The create control appears once the (empty) link list has loaded.
    const create = await vi.waitFor(() => {
      const el = molId(container, 'share-create')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    create.click()

    await vi.waitFor(() => {
      expect(post).toHaveBeenCalledTimes(1)
    })
    expect(post.mock.calls[0][0]).toBe('/projects/p1/shares')
    expect(post.mock.calls[0][1]).toMatchObject({ role: 'viewer' })

    await vi.waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1)
    })
    // The created link renders inline as a full, copyable URL, so the host gets
    // the result (and the URL builder) to persist it somewhere.
    const field = await vi.waitFor(() => {
      const el = molId(container, 'share-link-url') as HTMLInputElement
      expect(el).not.toBeNull()
      return el
    })
    expect(field.value).toContain('/share/s1')
    expect(buildShareUrl(onCreated.mock.calls[0][0], 'https://app.example')).toBe(
      'https://app.example/share/s1',
    )
  })
})
