// @vitest-environment jsdom

/**
 * Tests for the Solid `DevicesSection` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/DevicesSection.test.tsx`:
 * the same two behaviors, rendered with Solid's browser renderer under the
 * binding's real `MoleculeProvider`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DevicesSection } from '../DevicesSection.jsx'
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

/**
 * An HTTP client whose device read answers when the test says so.
 *
 * @returns The client and the function that answers its read with rows.
 */
function pendingClient(): { client: HttpClient; answer: (rows: Device[]) => Promise<void> } {
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
  const answer = async (rows: Device[]): Promise<void> => {
    resolve(ok(rows))
    await read
    for (let i = 0; i < 5; i++) {
      await new Promise((done) => {
        setTimeout(done, 0)
      })
    }
  }
  return { client, answer }
}

const disposers: Array<() => void> = []

/**
 * Mounts the section under one HTTP client.
 *
 * @param client - The client the section reads its devices with.
 * @returns A function that unmounts the section.
 */
function mountSection(client: HttpClient): () => void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () =>
      (
        <MoleculeProvider http={client}>
          <DevicesSection />
        </MoleculeProvider>
      ) as JSX.Element,
    container,
  )
  const unmount = (): void => {
    dispose()
    container.remove()
  }
  disposers.push(unmount)
  return unmount
}

const laptop: Device = { id: 'laptop', name: 'Laptop', platform: 'web' }
const phone: Device = { id: 'phone', name: 'Phone', platform: 'ios' }

beforeEach(() => {
  setClassMap(classMap)
  setI18nProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<DevicesSection>', () => {
  it('lists the devices its read returns', async () => {
    const { client, answer } = pendingClient()
    mountSection(client)

    await answer([laptop, phone])

    expect(client.get).toHaveBeenCalledWith('/api/devices')
    expect(document.body.textContent).toContain('Laptop')
    expect(document.body.textContent).toContain('Phone')
  })

  it("shows the current client's devices when the previous client's read answers late", async () => {
    const previous = pendingClient()
    const current = pendingClient()
    // A changed client is a new mount in this binding.
    mountSection(previous.client)()
    mountSection(current.client)

    await current.answer([phone])
    await previous.answer([laptop])

    expect(document.body.textContent).toContain('Phone')
    expect(document.body.textContent).not.toContain('Laptop')
  })
})
