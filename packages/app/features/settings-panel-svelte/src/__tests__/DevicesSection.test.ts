// @vitest-environment jsdom

/**
 * Tests for the Svelte `DevicesSection` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/DevicesSection.test.tsx`:
 * the same two behaviors, mounted through the binding's `setHttpContext`.
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import type { Device } from '../types.js'
import DevicesHost from './DevicesHost.svelte'
import { fakeHttpClient } from './http-client.js'

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
 * @returns The client, its `get` mock and the function that answers its read with rows.
 */
function pendingClient(): {
  client: HttpClient
  get: ReturnType<typeof fakeHttpClient>['get']
  answer: (rows: Device[]) => Promise<void>
} {
  const { client, get } = fakeHttpClient()
  let resolve!: (response: HttpResponse<Device[]>) => void
  const read = new Promise<HttpResponse<Device[]>>((done) => {
    resolve = done
  })
  get.mockReturnValue(read)
  const answer = async (rows: Device[]): Promise<void> => {
    resolve(ok(rows))
    await read
    await new Promise((done) => setTimeout(done, 0))
    flushSync()
  }
  return { client, get, answer }
}

const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

/**
 * Mounts the section under one HTTP client.
 *
 * @param client - The client the section reads its devices with.
 * @returns A function that unmounts the section.
 */
function mountSection(client: HttpClient): () => void {
  setI18nProvider(createSimpleI18nProvider('en'))
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(DevicesHost, { target: container, props: { http: client } })
  flushSync()
  const entry = { instance, container }
  mounted.push(entry)
  return () => {
    mounted.splice(mounted.indexOf(entry), 1)
    void unmount(instance)
    container.remove()
  }
}

const laptop: Device = { id: 'laptop', name: 'Laptop', platform: 'web' }
const phone: Device = { id: 'phone', name: 'Phone', platform: 'ios' }

afterEach(() => {
  for (const { instance, container } of mounted.splice(0)) {
    void unmount(instance)
    container.remove()
  }
  document.body.innerHTML = ''
})

describe('<DevicesSection>', () => {
  it('lists the devices its read returns', async () => {
    const { client, get, answer } = pendingClient()
    mountSection(client)

    await answer([laptop, phone])

    expect(get).toHaveBeenCalledWith('/api/devices', undefined)
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
