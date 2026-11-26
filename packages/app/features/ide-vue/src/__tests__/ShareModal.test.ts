// @vitest-environment jsdom
/**
 * `ShareModal` — the `/share` dialog.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/share-modal-roles.test.tsx`
 * and `share-modal-host-content.test.tsx` with the same test names and the
 * same behavioral assertions, mounted through Vue's own `createApp` with the
 * theme and http plugins (the only providers the pair needs).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin, createThemePlugin } from '@molecule/app-vue'

import type { ShareModalProps } from '../components/ShareModal.js'
// Deliberately the package BARREL, not the component paths — a host has no
// other way in, so this import IS half the contract under test.
import { buildShareUrl, ShareModal } from '../index.js'
import { buildThemeProvider } from './theme-test-provider.js'

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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // The manager lists existing links on mount; default to "none" so the create
  // control is what renders.
  get.mockReset().mockResolvedValue(responseOf({ data: [] }))
  post.mockReset().mockResolvedValue(responseOf(LINK))
  del.mockReset().mockResolvedValue(responseOf({}))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Mount the modal standalone, the way a host does.
 *
 * @param props - The modal's props.
 * @param children - Optional host content (the default slot).
 * @returns The container.
 */
function renderModal(
  props: Partial<ShareModalProps> & Pick<ShareModalProps, 'onClose'>,
  children?: VNodeChild,
): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(
          ShareModal,
          { projectId: 'p1', ...props },
          children === undefined ? undefined : [children],
        ),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider('dark')))
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(host)
  return host.ownerDocument.body
}

describe('ShareModal works standalone, with no ChatPanel in the tree', () => {
  it('is reachable from the package barrel and POSTs the link to the platform API', async () => {
    // A Vue component is a component OBJECT, not a function; the contract is
    // that the barrel hands out the real one (React's `typeof` check).
    expect(ShareModal).toBeDefined()
    post.mockResolvedValue(responseOf({ slug: 's1', role: 'viewer' }))
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

    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0]?.[0]).toBe('/projects/p1/shares')
    expect(post.mock.calls[0]?.[1]).toMatchObject({ role: 'viewer' })

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    // The created link renders inline as a full, copyable URL, so the host gets
    // the result (and the URL builder) to persist it somewhere.
    const field = await vi.waitFor(() => {
      const el = molId(container, 'share-link-url')
      expect(el).not.toBeNull()
      return el as HTMLInputElement
    })
    expect(field.value).toContain('/share/s1')
    expect(buildShareUrl(onCreated.mock.calls[0]?.[0], 'https://app.example')).toBe(
      'https://app.example/share/s1',
    )
  })
})

describe('ShareModal — offered roles', () => {
  it('offers no role choice by default and mints the safe role', async () => {
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
    const container = renderModal(
      { onClose: () => {} },
      h('div', { 'data-mol-id': 'host-section' }, 'extra'),
    )
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
    const container = renderModal(
      { showLinks: false, onClose: () => {} },
      h('div', { 'data-mol-id': 'host-section' }, 'extra'),
    )
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
    expect(onClose).not.toHaveBeenCalled()

    const backdrop = container.querySelector(
      '[role="presentation"]:has(> [data-mol-id="share-modal"])',
    ) as HTMLElement
    backdrop.click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
