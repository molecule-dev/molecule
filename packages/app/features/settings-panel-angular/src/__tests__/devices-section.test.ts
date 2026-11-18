// @vitest-environment jsdom
/**
 * Tests for the Angular `DevicesSection` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/DevicesSection.test.tsx`:
 * the same two behaviors, mounted through Angular's real renderer
 * (`createApplication` + `createComponent`) with the binding's real
 * `provideHttp` token providing the HTTP client.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideHttp } from '@molecule/app-angular'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DevicesSection } from '../devices-section.component.js'
import type { Device } from '../types.js'

/**
 * Wrap data in a successful HttpResponse envelope.
 *
 * @param data - The body.
 * @returns A fake HttpResponse.
 */
function ok<T>(data: T): HttpResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { method: 'GET', url: '' } }
}

/** A mounted section: refresh the app, or tear it down. */
interface Mounted {
  flush(): Promise<void>
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the section under one HTTP client through a JIT host in a
 * disposable container (the kit's mount shape).
 *
 * @param client - The client the section reads its devices with.
 * @returns The mounted section.
 */
async function mountSection(client: HttpClient): Promise<Mounted> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideHttp(client)],
  })
  const ref: ComponentRef<unknown> = createComponent(DevicesSection as Type<unknown>, {
    environmentInjector: appRef.injector,
  })
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  const flush = async (): Promise<void> => {
    appRef.tick()
    for (let i = 0; i < 3; i++) await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    appRef.tick()
  }
  const section: Mounted = {
    flush,
    destroy: async () => {
      mounted.splice(mounted.indexOf(section), 1)
      appRef.destroy()
      container.remove()
    },
  }
  mounted.push(section)
  await flush()
  return section
}

/**
 * An HTTP client whose device read answers when the test says so.
 *
 * @returns The client and the function that answers its read with rows.
 */
function pendingClient(): {
  client: HttpClient
  answer: (rows: Device[], section: Mounted) => Promise<void>
} {
  let resolve!: (response: HttpResponse<Device[]>) => void
  const read = new Promise<HttpResponse<Device[]>>((done) => {
    resolve = done
  })
  const client: HttpClient = {
    baseURL: '',
    defaultHeaders: {},
    get: vi.fn().mockReturnValue(read),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    setAuthToken: vi.fn(),
    getAuthToken: () => null,
    onAuthError: () => () => {},
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
  }
  const answer = async (rows: Device[], section: Mounted): Promise<void> => {
    resolve(ok(rows))
    await read
    await section.flush()
  }
  return { client, answer }
}

const laptop: Device = { id: 'laptop', name: 'Laptop', platform: 'web' }
const phone: Device = { id: 'phone', name: 'Phone', platform: 'ios' }

beforeEach(() => {
  setClassMap(classMap)
  setI18nProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const section of [...mounted]) await section.destroy()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<DevicesSection>', () => {
  it('lists the devices its read returns', async () => {
    const { client, answer } = pendingClient()
    const section = await mountSection(client)

    await answer([laptop, phone], section)

    expect(client.get).toHaveBeenCalledWith('/api/devices')
    expect(document.body.textContent).toContain('Laptop')
    expect(document.body.textContent).toContain('Phone')
  })

  it("shows the current client's devices when the previous client's read answers late", async () => {
    const previous = pendingClient()
    const current = pendingClient()
    // A changed client is a new mount in this binding.
    const first = await mountSection(previous.client)
    await first.destroy()
    const second = await mountSection(current.client)

    await current.answer([phone], second)
    await previous.answer([laptop], second)

    expect(document.body.textContent).toContain('Phone')
    expect(document.body.textContent).not.toContain('Laptop')
  })
})
