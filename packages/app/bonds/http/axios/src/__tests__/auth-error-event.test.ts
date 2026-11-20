import { type AxiosAdapter, AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { createAxiosClient } from '../provider.js'
import type { AxiosHttpClientConfig } from '../types.js'

function createClient({
  status = 401,
  onSend = () => {},
  config,
}: {
  status?: number
  onSend?: () => void
  config?: AxiosHttpClientConfig
} = {}) {
  const adapter: AxiosAdapter = async (sent) => {
    onSend()
    const response = { config: sent, status, statusText: '', data: {}, headers: {} }
    if (status < 400) return response
    throw new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', sent, undefined, response)
  }
  const client = createAxiosClient({ ...config, axiosConfig: { ...config?.axiosConfig, adapter } })
  const listener = vi.fn()
  client.onAuthError(listener)
  return { client, listener }
}

describe('Axios 401 request metadata', () => {
  it('reports the final method and sanitized path', async () => {
    const { client, listener } = createClient()
    client.addRequestInterceptor((request) => ({
      ...request,
      method: 'GET',
      url: '/private?token=secret&view=mine',
    }))

    await expect(client.post('/before-interception', null)).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      method: 'GET',
      url: '/private?token=[REDACTED]&view=mine',
      sentCredentials: false,
    })
  })

  it('reports the credential from dispatch after the token is cleared', async () => {
    let token: string | null = 'expired'
    const { client, listener } = createClient({ onSend: () => (token = null) })
    client.setAuthTokenResolver?.(() => token)
    await expect(client.get('/private')).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      method: 'GET',
      url: '/private',
      sentCredentials: true,
    })
  })

  it('respects an interceptor that removes the credential before dispatch', async () => {
    const { client, listener } = createClient()
    client.setAuthToken('old')
    client.addRequestInterceptor((request) => ({ ...request, headers: {} }))
    await expect(client.get('/private')).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      method: 'GET',
      url: '/private',
      sentCredentials: false,
    })
  })

  it.each<AxiosHttpClientConfig>([
    { defaultHeaders: { aUtHoRiZaTiOn: 'Basic test' } },
    { defaultHeaders: { cOoKiE: 'session=test' } },
    { withCredentials: true },
    { axiosConfig: { auth: { username: 'test', password: 'secret' } } },
  ])('reports explicit credentials on a failed POST with %j', async (config) => {
    const { client, listener } = createClient({ config })
    await expect(client.post('/private', {})).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      method: 'POST',
      url: '/private',
      sentCredentials: true,
    })
  })

  it('does not report 200 or 422', async () => {
    const ok = createClient({ status: 200 })
    const invalid = createClient({ status: 422 })
    await ok.client.get('/public')
    await expect(invalid.client.post('/login', {})).rejects.toMatchObject({ status: 422 })
    expect(ok.listener).not.toHaveBeenCalled()
    expect(invalid.listener).not.toHaveBeenCalled()
  })
})
