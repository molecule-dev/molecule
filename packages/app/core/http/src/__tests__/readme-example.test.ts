/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Axios bond — real Axios,
 * with only its network adapter replaced by an in-memory server.
 *
 * @module
 */
import type axios from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'

const server = vi.hoisted(() => {
  const calls: Array<{ method: string; url: string; data: unknown }> = []
  return { calls }
})

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof axios }>()
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const url = `${config.baseURL ?? ''}${config.url ?? ''}`
    const method = (config.method ?? 'get').toUpperCase()
    server.calls.push({ method, url, data: config.data })
    const reply = (status: number, data: unknown): AxiosResponse => ({
      data,
      status,
      statusText: status === 201 ? 'Created' : 'OK',
      headers: { 'content-type': 'application/json' },
      config,
    })
    if (method === 'GET' && url === '/api/plants') {
      return reply(200, {
        data: [
          { id: 'p1', name: 'Fern' },
          { id: 'p2', name: 'Cactus' },
        ],
      })
    }
    if (method === 'POST' && url === '/api/plants') {
      const body = JSON.parse(String(config.data)) as { name: string }
      return reply(201, { id: 'p3', name: body.name })
    }
    return reply(404, { error: 'not found' })
  }
  const create: typeof actual.default.create = (config) =>
    actual.default.create({ ...config, adapter })
  return { ...actual, default: { ...actual.default, create } }
})

import { createAxiosClient } from '@molecule/app-http-axios'

import { get, post, setClient, unwrapList } from '../index.js'

interface Plant {
  id: string
  name: string
}

describe('README @example', () => {
  it('sends relative requests through the bonded Axios client under its baseURL', async () => {
    setClient(createAxiosClient({ baseURL: '/api', timeout: 10_000 }))

    const res = await get<Plant[]>('/plants')
    const plants = unwrapList<Plant>(res)
    expect(plants.map((plant) => plant.name)).toEqual(['Fern', 'Cactus'])

    const created = await post<Plant>('/plants', { name: 'Monstera' })
    expect(created.status).toBe(201)
    expect(created.data.id).toBe('p3')

    expect(server.calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /api/plants',
      'POST /api/plants',
    ])
    expect(JSON.parse(String(server.calls[1]?.data))).toEqual({ name: 'Monstera' })
  })
})
