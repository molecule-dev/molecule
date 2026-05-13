const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock('@molecule/api-http', () => ({
  post: mockPost,
}))

import { generateKeyPairSync } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APPLE_TOKEN_URL, exchangeCodeForTokens, refreshAccessToken } from '../tokens.js'

function generateEs256Pem(): string {
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  return privateKey
}

function setEnv() {
  process.env.OAUTH_APPLE_TEAM_ID = 'TEAM12345'
  process.env.OAUTH_APPLE_CLIENT_ID = 'com.example.app'
  process.env.OAUTH_APPLE_KEY_ID = 'KEY1234567'
  process.env.OAUTH_APPLE_PRIVATE_KEY = generateEs256Pem()
}

function clearEnv() {
  delete process.env.OAUTH_APPLE_TEAM_ID
  delete process.env.OAUTH_APPLE_CLIENT_ID
  delete process.env.OAUTH_APPLE_KEY_ID
  delete process.env.OAUTH_APPLE_PRIVATE_KEY
  delete process.env.APP_ORIGIN
}

beforeEach(() => {
  vi.resetAllMocks()
  clearEnv()
})

afterEach(() => {
  clearEnv()
})

describe('APPLE_TOKEN_URL', () => {
  it('points to the canonical Apple token endpoint', () => {
    expect(APPLE_TOKEN_URL).toBe('https://appleid.apple.com/auth/token')
  })
})

describe('exchangeCodeForTokens — env validation', () => {
  it('throws when OAUTH_APPLE_CLIENT_ID is unset', async () => {
    await expect(exchangeCodeForTokens('the-code')).rejects.toThrow(
      /OAUTH_APPLE_CLIENT_ID is not configured/,
    )
  })

  it('throws when OAUTH_APPLE_TEAM_ID is unset (via buildClientSecret)', async () => {
    process.env.OAUTH_APPLE_CLIENT_ID = 'com.x'
    await expect(exchangeCodeForTokens('the-code')).rejects.toThrow(
      /OAUTH_APPLE_TEAM_ID is not configured/,
    )
  })

  it('throws when OAUTH_APPLE_KEY_ID is unset', async () => {
    process.env.OAUTH_APPLE_CLIENT_ID = 'com.x'
    process.env.OAUTH_APPLE_TEAM_ID = 'T'
    await expect(exchangeCodeForTokens('c')).rejects.toThrow(/OAUTH_APPLE_KEY_ID is not configured/)
  })

  it('throws when OAUTH_APPLE_PRIVATE_KEY is unset', async () => {
    process.env.OAUTH_APPLE_CLIENT_ID = 'com.x'
    process.env.OAUTH_APPLE_TEAM_ID = 'T'
    process.env.OAUTH_APPLE_KEY_ID = 'K'
    await expect(exchangeCodeForTokens('c')).rejects.toThrow(
      /OAUTH_APPLE_PRIVATE_KEY is not configured/,
    )
  })
})

describe('exchangeCodeForTokens — happy path', () => {
  beforeEach(() => {
    setEnv()
  })

  it('POSTs to APPLE_TOKEN_URL with form-encoded body', async () => {
    mockPost.mockResolvedValue({
      data: { access_token: 'at', id_token: 'idt' },
    })
    process.env.APP_ORIGIN = 'https://app.test'
    await exchangeCodeForTokens('the-code')

    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockPost.mock.calls[0][0]).toBe(APPLE_TOKEN_URL)
    expect(mockPost.mock.calls[0][2]).toMatchObject({
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      timeout: 15_000,
    })
  })

  it('includes code, client_id, grant_type=authorization_code, redirect_uri, and a non-empty client_secret', async () => {
    mockPost.mockResolvedValue({ data: {} })
    process.env.APP_ORIGIN = 'https://app.test'
    await exchangeCodeForTokens('the-code')

    const body = mockPost.mock.calls[0][1] as string
    const params = new URLSearchParams(body)
    expect(params.get('client_id')).toBe('com.example.app')
    expect(params.get('code')).toBe('the-code')
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('redirect_uri')).toBe('https://app.test')
    expect(params.get('client_secret')?.split('.')).toHaveLength(3) // JWT shape
  })

  it('uses explicit redirectUri argument over APP_ORIGIN env', async () => {
    mockPost.mockResolvedValue({ data: {} })
    process.env.APP_ORIGIN = 'https://app.test'
    await exchangeCodeForTokens('the-code', 'https://custom.test/cb')

    const body = mockPost.mock.calls[0][1] as string
    const params = new URLSearchParams(body)
    expect(params.get('redirect_uri')).toBe('https://custom.test/cb')
  })

  it('falls back to APP_ORIGIN when redirectUri omitted', async () => {
    mockPost.mockResolvedValue({ data: {} })
    process.env.APP_ORIGIN = 'https://app.test'
    await exchangeCodeForTokens('c')
    const body = mockPost.mock.calls[0][1] as string
    expect(new URLSearchParams(body).get('redirect_uri')).toBe('https://app.test')
  })

  it('falls back to empty redirect_uri when neither arg nor APP_ORIGIN set', async () => {
    mockPost.mockResolvedValue({ data: {} })
    delete process.env.APP_ORIGIN
    await exchangeCodeForTokens('c')
    const body = mockPost.mock.calls[0][1] as string
    expect(new URLSearchParams(body).get('redirect_uri')).toBe('')
  })

  it('returns the token-exchange response data verbatim', async () => {
    const fakeResponse = { access_token: 'at', id_token: 'id', refresh_token: 'rt' }
    mockPost.mockResolvedValue({ data: fakeResponse })
    const result = await exchangeCodeForTokens('c')
    expect(result).toBe(fakeResponse)
  })
})

describe('refreshAccessToken', () => {
  beforeEach(() => {
    setEnv()
  })

  it('POSTs grant_type=refresh_token + refresh_token body', async () => {
    mockPost.mockResolvedValue({ data: {} })
    await refreshAccessToken('my-refresh-token')

    const body = mockPost.mock.calls[0][1] as string
    const params = new URLSearchParams(body)
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('refresh_token')).toBe('my-refresh-token')
    expect(params.get('client_id')).toBe('com.example.app')
    expect(params.get('client_secret')?.split('.')).toHaveLength(3)
  })

  it('does NOT include code or redirect_uri (refresh-flow specific)', async () => {
    mockPost.mockResolvedValue({ data: {} })
    await refreshAccessToken('rt')
    const params = new URLSearchParams(mockPost.mock.calls[0][1] as string)
    expect(params.has('code')).toBe(false)
    expect(params.has('redirect_uri')).toBe(false)
  })

  it('passes the same headers + timeout as exchangeCodeForTokens', async () => {
    mockPost.mockResolvedValue({ data: {} })
    await refreshAccessToken('rt')
    expect(mockPost.mock.calls[0][2]).toMatchObject({
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      timeout: 15_000,
    })
  })

  it('throws when env vars are not configured', async () => {
    clearEnv()
    await expect(refreshAccessToken('rt')).rejects.toThrow(/is not configured/)
  })

  it('returns the token-refresh response data verbatim', async () => {
    const data = { access_token: 'new-at', id_token: 'new-id' }
    mockPost.mockResolvedValue({ data })
    const out = await refreshAccessToken('rt')
    expect(out).toBe(data)
  })
})
