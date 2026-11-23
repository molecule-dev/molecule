// @vitest-environment jsdom
/**
 * `ShareModal` — the `/share` dialog.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/share-modal-roles.test.tsx`
 * and `share-modal-host-content.test.tsx` with the same test names and the
 * same behavioral assertions, mounted through Angular's own `createApplication`
 * with the theme and http providers (the only providers the pair needs).
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideHttp, provideTheme } from '@molecule/app-angular'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

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

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the inputs are set through real bindings, and it
 * projects host content when the case asks for it.
 */
const ShareModalHost = Component({
  selector: 'mol-share-modal-host',
  standalone: true,
  imports: [ShareModal],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-share-modal [projectId]="p['projectId']" [initialRole]="p['initialRole']" [roles]="p['roles']" [canManage]="p['canManage']" [canCreate]="p['canCreate']" [canRevoke]="p['canRevoke']" [showLinks]="p['showLinks']" [refreshSignal]="p['refreshSignal']" [onClose]="p['onClose']" [onCreated]="p['onCreated']">@if (p['withChildren']) {<div data-mol-id="host-section">extra</div>}</div>`,
})(
  class ShareModalHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ShareModalHost>>
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // The manager lists existing links on mount; default to "none" so the create
  // control is what renders.
  get.mockReset().mockResolvedValue(responseOf({ data: { data: [] } }))
  post.mockReset().mockResolvedValue(responseOf(LINK))
  del.mockReset().mockResolvedValue(responseOf({}))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Mount the modal standalone, the way a host does.
 *
 * @param props - The modal's inputs.
 * @returns The container.
 */
async function renderModal(props: Record<string, unknown>): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider('dark')),
      provideHttp(buildHttpClient()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ShareModalHost>> = createComponent(ShareModalHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { projectId: 'p1', ...props }
  ref.changeDetectorRef.detectChanges()
  current = { appRef, ref, container }
  await flush()
  return container
}

describe('ShareModal — offered roles', () => {
  it('offers no role choice by default and mints the safe role', async () => {
    expect(ShareModal).toBeDefined()
    const container = await renderModal({ onClose: () => {} })

    // The create control appears once the (empty) link list has loaded.
    const create = molId(container, 'share-create') as HTMLElement | null
    expect(create).not.toBeNull()
    // No select at all: with one role there is nothing to choose, and a control
    // whose value the backend overrides is worse than no control.
    expect(molId(container, 'share-role')).toBeNull()

    create!.click()
    await flush()
    expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
  })

  it('says what the single link will grant, instead of implying a choice', async () => {
    const container = await renderModal({ onClose: () => {} })
    expect(container.textContent).toContain('can act as viewer')
    expect(container.textContent).not.toContain('the role you choose')
  })

  it('offers exactly the roles the host declares, in order', async () => {
    const container = await renderModal({ roles: ['viewer', 'editor'], onClose: () => {} })

    const select = molId(container, 'share-role') as HTMLSelectElement | null
    expect(select).not.toBeNull()
    expect(Array.from(select!.options).map((option) => option.value)).toEqual(['viewer', 'editor'])
  })

  it('ignores an initial role the host does not grant', async () => {
    const container = await renderModal({ initialRole: 'owner', onClose: () => {} })

    const create = molId(container, 'share-create') as HTMLElement | null
    expect(create).not.toBeNull()
    create!.click()
    await flush()
    // `/share owner` must not POST a role the backend would silently downgrade.
    expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
  })
})

describe('ShareModal — host content', () => {
  it('renders host children below the links', async () => {
    const container = await renderModal({ onClose: () => {}, withChildren: true })
    const host = molId(container, 'host-section')
    expect(host).not.toBeNull()
    const create = molId(container, 'share-create')!
    // Links first, host sections after.
    expect(create.compareDocumentPosition(host!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('showLinks={false} hides the link section and never lists links', async () => {
    const container = await renderModal({ showLinks: false, onClose: () => {}, withChildren: true })
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
    const container = await renderModal({ showLinks: false, onClose })
    const dialog = molId(container, 'share-modal') as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')

    dialog.click()
    await flush()
    expect(onClose).not.toHaveBeenCalled()

    const backdrop = molId(container, 'share-modal-backdrop') as HTMLElement
    backdrop.click()
    await flush()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ShareModal works standalone, with no ChatPanel in the tree', () => {
  it('is reachable from the package barrel and POSTs the link to the platform API', async () => {
    expect(typeof ShareModal).toBe('function')
    post.mockResolvedValue(responseOf({ slug: 's1', role: 'viewer' }))
    const onCreated = vi.fn<(result: ShareLinkResult) => void>()

    const container = await renderModal({ onClose: () => {}, onCreated })

    expect(molId(container, 'share-modal')).not.toBeNull()

    // The create control appears once the (empty) link list has loaded.
    const create = molId(container, 'share-create') as HTMLButtonElement | null
    expect(create).not.toBeNull()
    create!.click()

    await flush()
    expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })

    await flush()
    expect(onCreated).toHaveBeenCalledTimes(1)
    // The created link renders inline as a full, copyable URL, so the host gets
    // the result (and the URL builder) to persist it somewhere.
    const field = molId(container, 'share-link-url') as HTMLInputElement
    expect(field).not.toBeNull()
    expect(field.value).toContain('/share/s1')
    expect(buildShareUrl(onCreated.mock.calls[0][0], 'https://app.example')).toBe(
      'https://app.example/share/s1',
    )
  })
})
