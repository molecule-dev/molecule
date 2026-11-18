// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { HttpProvider, I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { type Device, DevicesSection } from '../DevicesSection.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

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
    await act(async () => {
      resolve(ok(rows))
      await read
    })
  }
  return { client, answer }
}

/**
 * The section under one HTTP client.
 *
 * @param props - Props.
 * @param props.client - The client the section reads its devices with.
 * @returns The section inside its providers.
 */
function Section({ client }: { client: HttpClient }): React.ReactElement {
  return (
    <HttpProvider client={client}>
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <DevicesSection />
      </I18nProvider>
    </HttpProvider>
  )
}

const laptop: Device = { id: 'laptop', name: 'Laptop', platform: 'web' }
const phone: Device = { id: 'phone', name: 'Phone', platform: 'ios' }

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('<DevicesSection>', () => {
  it('lists the devices its read returns', async () => {
    const { client, answer } = pendingClient()
    render(<Section client={client} />)

    await answer([laptop, phone])

    expect(client.get).toHaveBeenCalledWith('/api/devices')
    expect(screen.getByText('Laptop')).toBeTruthy()
    expect(screen.getByText('Phone')).toBeTruthy()
  })

  it("shows the current client's devices when the previous client's read answers late", async () => {
    const previous = pendingClient()
    const current = pendingClient()
    // React hands a mounted section a changed client through the provider.
    const view = render(<Section client={previous.client} />)
    view.rerender(<Section client={current.client} />)

    await current.answer([phone])
    await previous.answer([laptop])

    expect(screen.getByText('Phone')).toBeTruthy()
    expect(screen.queryByText('Laptop')).toBeNull()
  })
})
