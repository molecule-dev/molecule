// @vitest-environment jsdom
/**
 * `ShareLinkManager` — the shared public-link UI used by both `ShareModal` and
 * a host's team/access panel.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/share-link-manager.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication` with the theme and http providers (the only
 * providers the component needs). Two extra cases cover the paths the
 * conformance kit cannot exercise in jsdom: the failure messages (the React
 * component logs them) and the copy confirmation's timer.
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
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

// Deliberately the package BARREL, not the component paths — a host has no
// other way in, so this import IS half the contract under test.
import { ShareLinkManager } from '../index.js'
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

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the inputs are set through real bindings.
 */
const ShareLinkManagerHost = Component({
  selector: 'mol-share-link-manager-host',
  standalone: true,
  imports: [ShareLinkManager],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-share-link-manager [projectId]="p['projectId']" [canManage]="p['canManage']" [canCreate]="p['canCreate']" [canRevoke]="p['canRevoke']" [roles]="p['roles']" [initialRole]="p['initialRole']" [refreshSignal]="p['refreshSignal']" [onCreated]="p['onCreated']" [onRevoked]="p['onRevoked']"></div>`,
})(
  class ShareLinkManagerHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ShareLinkManagerHost>>
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  get.mockReset().mockResolvedValue(responseOf({ data: [] }))
  post.mockReset().mockResolvedValue(responseOf(LINK))
  del.mockReset().mockResolvedValue(responseOf({}))
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
  vi.useRealTimers()
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
 * Mount the manager standalone, the way a host does.
 *
 * @param props - The component's inputs.
 * @returns The container.
 */
async function renderManager(props: Record<string, unknown>): Promise<HTMLElement> {
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
  const ref: ComponentRef<InstanceType<typeof ShareLinkManagerHost>> = createComponent(
    ShareLinkManagerHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { projectId: 'p1', ...props }
  ref.changeDetectorRef.detectChanges()
  current = { appRef, ref, container }
  await flush()
  return container
}

describe('ShareLinkManager', () => {
  it('shows an existing link as an absolute URL with revoke, and NOT a create control', async () => {
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = await renderManager({})

    const field = molId(container, 'share-link-url') as HTMLInputElement | null
    expect(field).not.toBeNull()
    // Absolute, not the bare "/share/…" path.
    expect(field!.value).toMatch(/^https?:\/\/.+\/share\/abc123$/)
    expect(molId(container, 'share-link-revoke-l1')).not.toBeNull()
    // A link already exists, so no "Create link".
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('copies the absolute URL to the clipboard when the link is clicked', async () => {
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = await renderManager({})

    const field = molId(container, 'share-link-url') as HTMLInputElement | null
    expect(field).not.toBeNull()
    field!.click()
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock.mock.calls[0]?.[0]).toMatch(/\/share\/abc123$/)
    // Visual confirmation: the copy control flips to "Copied".
    expect(molId(container, 'share-link-copy')?.textContent).toContain('Copied')
  })

  it('keeps the copied confirmation off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = await renderManager({})

    const copy = molId(container, 'share-link-copy') as HTMLButtonElement | null
    expect(copy).not.toBeNull()
    copy!.click()
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock.mock.calls[0]?.[0]).toMatch(/\/share\/abc123$/)
    // No confirmation: the copy control still reads "Copy".
    expect(molId(container, 'share-link-copy')?.textContent).not.toContain('Copied')
  })

  it('revokes a link, then offers create again', async () => {
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = await renderManager({})

    const revoke = molId(container, 'share-link-revoke-l1') as HTMLButtonElement | null
    expect(revoke).not.toBeNull()
    revoke!.click()

    await flush()
    expect(del).toHaveBeenCalledWith('/projects/p1/shares/l1')
    // The link is gone and create returns.
    expect(molId(container, 'share-create')).not.toBeNull()
    expect(molId(container, 'share-link-url')).toBeNull()
  })

  it('creates a link when none exists, then hides the create control', async () => {
    const container = await renderManager({})

    const create = molId(container, 'share-create') as HTMLButtonElement | null
    expect(create).not.toBeNull()
    create!.click()

    await flush()
    expect(post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
    expect(molId(container, 'share-link-url')).not.toBeNull()
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('lets a read-only caller see and copy a link but never manage it', async () => {
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = await renderManager({ canManage: false })

    expect(molId(container, 'share-link-url')).not.toBeNull()
    // No revoke, and if there were no link, no create either.
    expect(molId(container, 'share-link-revoke-l1')).toBeNull()
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('tells a read-only caller when there is no link, without offering create', async () => {
    const container = await renderManager({ canManage: false })

    expect(molId(container, 'share-links-none')).not.toBeNull()
    expect(molId(container, 'share-create')).toBeNull()
  })

  it('shows an error when creating a link fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    post.mockRejectedValue(new Error('nope'))

    const container = await renderManager({})
    const create = molId(container, 'share-create') as HTMLButtonElement | null
    expect(create).not.toBeNull()
    create!.click()

    await flush()
    expect(molId(container, 'share-error')?.textContent).toContain(
      'Could not create a share link. Please try again.',
    )
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('shows an error when revoking a link fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    get.mockResolvedValue(responseOf({ data: [LINK] }))
    del.mockRejectedValue(new Error('nope'))

    const container = await renderManager({})
    const revoke = molId(container, 'share-link-revoke-l1') as HTMLButtonElement | null
    expect(revoke).not.toBeNull()
    revoke!.click()

    await flush()
    expect(molId(container, 'share-error')?.textContent).toContain(
      'Could not revoke that link. Please try again.',
    )
    // The link survives a failed revoke.
    expect(molId(container, 'share-link-url')).not.toBeNull()
    warn.mockRestore()
  })

  it('clears the copied confirmation after 1.5 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    get.mockResolvedValue(responseOf({ data: [LINK] }))

    const container = await renderManager({})
    const copy = molId(container, 'share-link-copy') as HTMLButtonElement | null
    expect(copy).not.toBeNull()
    copy!.click()
    await flush()
    expect(molId(container, 'share-link-copy')?.textContent).toContain('Copied')
    vi.advanceTimersByTime(1600)
    await flush()
    expect(molId(container, 'share-link-copy')?.textContent).not.toContain('Copied')
  })
})
