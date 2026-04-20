import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createMockServer } from '../server/server.js'
import type { MockServer } from '../types.js'

/**
 * Resolve the fixtures path for a given app type.
 * Tests run from inside molecule/packages/api/testing/mock-server/src/__tests__/,
 * so we walk up 7 levels to reach molecule-workspace root.
 */
function fixturesPathFor(appType: string): string {
  // __dirname = .../molecule/packages/api/testing/mock-server/src/__tests__
  // 7 levels up = molecule-workspace root
  return join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'mlcl',
    'templates',
    'apps',
    appType,
    'api',
    'fixtures',
  )
}

describe('createMockServer', () => {
  let server: MockServer | null = null

  afterEach(async () => {
    if (server) {
      await server.close()
      server = null
    }
  })

  it('starts on a random port when port is 0', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })
    expect(server.port).toBeGreaterThan(0)
    expect(server.appType).toBe('personal-finance')
  })

  it('serves fixture data for GET /api/accounts', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    // Check the first account has realistic fields
    const account = data[0]
    expect(account).toHaveProperty('id')
    expect(account).toHaveProperty('name')
    expect(account).toHaveProperty('balance')
    expect(typeof account.name).toBe('string')
    expect(typeof account.balance).toBe('number')
  })

  it('serves fixture data for GET /api/transactions', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/transactions`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    const tx = data[0]
    expect(tx).toHaveProperty('description')
    expect(tx).toHaveProperty('amount')
  })

  it('returns error response when _state=error', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts?_state=error`)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('returns empty response when _state=empty', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts?_state=empty`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0)
  })

  it('returns unauthorized when _state=unauthorized', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts?_state=unauthorized`)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('supports X-Mock-State header', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts`, {
      headers: { 'X-Mock-State': 'error' },
    })
    expect(response.status).toBe(500)
  })

  it('has a health check endpoint', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/health`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('ok')
    expect(data.appType).toBe('personal-finance')
    expect(data.endpoints).toBeGreaterThan(0)
  })

  it('supports CORS', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts`)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('allows programmatic state control', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    // Initially success
    let response = await fetch(`http://localhost:${server.port}/api/accounts`)
    expect(response.status).toBe(200)

    // Set to error
    server.setState('GET /api/accounts', { state: 'error' })
    response = await fetch(`http://localhost:${server.port}/api/accounts`)
    expect(response.status).toBe(500)
  })

  it('handles online-store app type', async () => {
    server = await createMockServer({
      appType: 'online-store',
      fixturesPath: fixturesPathFor('online-store'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/products`)
    expect(response.status).toBe(200)

    const body = await response.json()
    // generateFixtures returns a flat array for list endpoints
    const data = Array.isArray(body) ? body : body.data
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    const product = data[0]
    expect(product).toHaveProperty('name')
    expect(product).toHaveProperty('price')
    expect(typeof product.price).toBe('number')
  })

  it('handles DELETE requests with 204', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts/some-id`, {
      method: 'DELETE',
    })
    expect(response.status).toBe(204)
  })

  it('handles POST requests with 201', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', type: 'checking' }),
    })
    expect(response.status).toBe(201)
  })

  it('throws for nonexistent fixtures path', async () => {
    await expect(
      createMockServer({
        appType: 'nonexistent-app-type',
        fixturesPath: '/tmp/nonexistent-fixtures-dir',
        port: 0,
        logging: false,
      }),
    ).rejects.toThrow('No fixture data available')
  })

  it('serves report endpoints for personal-finance', async () => {
    server = await createMockServer({
      appType: 'personal-finance',
      fixturesPath: fixturesPathFor('personal-finance'),
      port: 0,
      logging: false,
    })

    const response = await fetch(`http://localhost:${server.port}/api/reports/spending-by-category`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('category_name')
    expect(data[0]).toHaveProperty('total_amount')
  })
})
