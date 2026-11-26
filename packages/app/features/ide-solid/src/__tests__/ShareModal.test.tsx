// @vitest-environment jsdom
/**
 * `ShareModal` — the `/share` dialog.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/share-modal-roles.test.tsx`
 * and `share-modal-host-content.test.tsx` with the same test names and the
 * same behavioral assertions, mounted as a real Solid root under
 * `MoleculeProvider` with the theme and http services (the only providers the
 * pair needs).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

// Deliberately the package BARREL, not the component paths — a host has no
// other way in, so this import IS half the contract under test.
import type { ShareModalProps } from '../components/ShareModal.jsx'
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

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/** Lets Solid's queued effects settle before the assertions. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Mount the modal standalone, the way a host does.
 *
 * @param props - The modal's props.
 * @returns The container.
 */
function renderModal(
  props: Omit<ShareModalProps, 'projectId'> & { withChildren?: boolean },
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider('dark')} http={buildHttpClient()}>
        <ShareModal projectId="p1" {...props}>
          {props.withChildren ? <div data-mol-id="host-section">extra</div> : null}
        </ShareModal>
      </MoleculeProvider>
    ),
    container,
  )
  return container.ownerDocument.body
}

describe('ShareModal — offered roles', () => {
  it('offers no role choice by default and mints the safe role', async () => {
    expect(ShareModal).toBeDefined()
    const container = renderModal({ onClose: () => {} })
    await settle()

    // The create control appears once the (empty) link list has loaded.
    const create = molId(container, 'share-create')
    expect(create).not.toBeNull()
    // No select at all: with one role there is nothing to choose, and a control
    // whose value the backend overrides is worse than no control.
    expect(molId(container, 'share-role')).toBeNull()

    create!.click()
    await settle()
    expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
  })

  it('says what the single link will grant, instead of implying a choice', async () => {
    const container = renderModal({ onClose: () => {} })
    await settle()
    expect(container.textContent).toContain('can act as viewer')
    expect(container.textContent).not.toContain('the role you choose')
  })

  it('offers exactly the roles the host declares, in order', async () => {
    const container = renderModal({ roles: ['viewer', 'editor'], onClose: () => {} })
    await settle()

    const select = molId(container, 'share-role') as HTMLSelectElement | null
    expect(select).not.toBeNull()
    expect(Array.from(select!.options).map((option) => option.value)).toEqual(['viewer', 'editor'])
  })

  it('ignores an initial role the host does not grant', async () => {
    const container = renderModal({ initialRole: 'owner', onClose: () => {} })
    await settle()

    const create = molId(container, 'share-create')
    expect(create).not.toBeNull()
    create!.click()
    await settle()
    // `/share owner` must not POST a role the backend would silently downgrade.
    expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
  })
})

describe('ShareModal — host content', () => {
  it('renders host children below the links', async () => {
    const container = renderModal({ onClose: () => {}, withChildren: true })
    await settle()
    const host = molId(container, 'host-section')
    expect(host).not.toBeNull()
    const create = molId(container, 'share-create')!
    // Links first, host sections after.
    expect(create.compareDocumentPosition(host!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('showLinks={false} hides the link section and never lists links', async () => {
    const container = renderModal({ showLinks: false, onClose: () => {}, withChildren: true })
    await settle()
    expect(molId(container, 'host-section')).not.toBeNull()
    expect(molId(container, 'share-create')).toBeNull()
    expect(container.textContent).not.toContain('Create a public link')
    await new Promise((resolve) => {
      setTimeout(resolve, 20)
    })
    expect(get).not.toHaveBeenCalled()
  })

  it('closes on a backdrop click, but never on a click inside the dialog', async () => {
    const onClose = vi.fn()
    const container = renderModal({ showLinks: false, onClose })
    await settle()
    const dialog = molId(container, 'share-modal') as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')

    dialog.click()
    await settle()
    expect(onClose).not.toHaveBeenCalled()

    const backdrop = container.querySelector(
      '[role="presentation"]:has(> [data-mol-id="share-modal"])',
    ) as HTMLElement
    backdrop.click()
    await settle()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ShareModal works standalone, with no ChatPanel in the tree', () => {
  it('is reachable from the package barrel and POSTs the link to the platform API', async () => {
    expect(typeof ShareModal).toBe('function')
    post.mockReset().mockResolvedValue(responseOf({ slug: 's1', role: 'viewer' }))
    const onCreated = vi.fn<(result: ShareLinkResult) => void>()

    const container = renderModal({ onClose: () => {}, onCreated })

    expect(molId(container, 'share-modal')).not.toBeNull()

    // The create control appears once the (empty) link list has loaded.
    await settle()
    const create = molId(container, 'share-create')
    expect(create).not.toBeNull()
    create!.click()

    await settle()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toBe('/projects/p1/shares')
    expect(post.mock.calls[0][1]).toMatchObject({ role: 'viewer' })

    await settle()
    expect(onCreated).toHaveBeenCalledTimes(1)
    // The created link renders inline as a full, copyable URL, so the host gets
    // the result (and the URL builder) to persist it somewhere.
    const field = molId(container, 'share-link-url') as HTMLInputElement | null
    expect(field).not.toBeNull()
    expect(field!.value).toContain('/share/s1')
    expect(buildShareUrl(onCreated.mock.calls[0][0], 'https://app.example')).toBe(
      'https://app.example/share/s1',
    )
  })
})
