/**
 * REAL-DEPENDENCY integration tests — no mocks, the real built-in `fetch` against a
 * real in-process `node:http` OAuth server (deterministic, no external service).
 *
 * The unit suite (`provider.test.ts`) stubs `global.fetch`, so it can only validate OUR
 * assumptions about the HTTP exchange — not the exchange itself. These tests pin what a
 * consumer actually experiences against any RFC 6749 provider: the token request really
 * goes out form-encoded (the encoding the RFC mandates and mocks never check), both JSON
 * and GitHub-style form-encoded token responses parse, client credentials travel in the
 * body or the Basic header per `clientAuthMethod`, and every failure mode is
 * DISTINGUISHABLE (provider rejected the code vs HTTP error vs 200-with-no-token vs
 * timeout) so a caller never debugs a blank `accessToken: ''`.
 *
 * @module
 */

import type { Server } from 'node:http'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { OAuthConfig } from '@molecule/api-oauth-client'

import { createProvider, provider } from '../provider.js'

/** The most recent request the fake provider saw, for assertions. */
interface SeenRequest {
  path: string
  method: string
  headers: Record<string, string | string[] | undefined>
  body: string
}

let server: Server
let baseUrl: string
const seen: SeenRequest[] = []
const lastSeen = (): SeenRequest => seen[seen.length - 1]

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      seen.push({ path: req.url ?? '', method: req.method ?? '', headers: req.headers, body })
      const params = new URLSearchParams(body)

      switch (req.url) {
        case '/token': {
          // Scenario switched by the submitted code/grant, like a real provider would.
          if (params.get('grant_type') === 'refresh_token') {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end(
              JSON.stringify({
                access_token: 'refreshed-token',
                token_type: 'Bearer',
                expires_in: 7200,
              }),
            )
            return
          }
          switch (params.get('code')) {
            case 'good-code':
              res.writeHead(200, { 'content-type': 'application/json' })
              res.end(
                JSON.stringify({
                  access_token: 'access-123',
                  token_type: 'Bearer',
                  refresh_token: 'refresh-456',
                  expires_in: 3600,
                  scope: 'user repo',
                }),
              )
              return
            case 'rejected-code':
              // GitHub-style: HTTP 200, failure only in the body.
              res.writeHead(200, { 'content-type': 'application/json' })
              res.end(
                JSON.stringify({
                  error: 'bad_verification_code',
                  error_description: 'The code passed is incorrect or expired.',
                }),
              )
              return
            case 'empty-200':
              // Misconfigured endpoint: 200 OK, JSON, but not a token response at all.
              res.writeHead(200, { 'content-type': 'application/json' })
              res.end(JSON.stringify({ message: 'welcome to the API index' }))
              return
            default:
              res.writeHead(400, { 'content-type': 'application/json' })
              res.end(JSON.stringify({ error: 'invalid_request' }))
              return
          }
        }
        case '/token-form':
          // GitHub also answers form-encoded when Accept isn't honored.
          res.writeHead(200, { 'content-type': 'application/x-www-form-urlencoded' })
          res.end('access_token=form-token-789&token_type=bearer&scope=user')
          return
        case '/resource':
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(
            JSON.stringify({
              authorization: req.headers.authorization ?? null,
              method: req.method,
              receivedBody: body || null,
            }),
          )
          return
        case '/revoke':
          res.writeHead(200)
          res.end()
          return
        case '/slow':
          // Never answers within any sane timeout; unref'd so it can't hold the process.
          setTimeout(() => {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end('{}')
          }, 5000).unref()
          return
        default:
          res.writeHead(404)
          res.end()
      }
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

const config = (): OAuthConfig => ({
  id: 'local',
  clientId: 'client-abc',
  clientSecret: 'secret-xyz-123',
  authorizationUrl: `${baseUrl}/authorize`,
  tokenUrl: `${baseUrl}/token`,
  revocationUrl: `${baseUrl}/revoke`,
  redirectUri: 'https://myapp.example/callback',
  scopes: ['user', 'repo'],
})

describe('@molecule/api-oauth-client-generic × REAL fetch × real HTTP server', () => {
  it('full lifecycle: authorize URL → code exchange (RFC form-encoded) → authenticated request', async () => {
    const url = new URL(
      provider.getAuthorizationUrl(config(), {
        state: 'csrf-token',
        codeChallenge: 'challenge-abc',
        codeChallengeMethod: 'S256',
      }),
    )
    expect(url.searchParams.get('client_id')).toBe('client-abc')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('state')).toBe('csrf-token')
    expect(url.searchParams.get('scope')).toBe('user repo')
    expect(url.searchParams.get('code_challenge')).toBe('challenge-abc')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')

    const before = Date.now()
    const tokens = await provider.getToken(config(), 'good-code', {
      codeVerifier: 'verifier-abc',
    })
    const after = Date.now()

    // What actually went over the wire — the part fetch-stubbing unit tests never see.
    // RFC 6749 §4.1.3: the token request MUST be application/x-www-form-urlencoded.
    const req = lastSeen()
    expect(req.method).toBe('POST')
    expect(req.headers['content-type']).toBe('application/x-www-form-urlencoded')
    const sent = new URLSearchParams(req.body)
    expect(sent.get('grant_type')).toBe('authorization_code')
    expect(sent.get('code')).toBe('good-code')
    expect(sent.get('redirect_uri')).toBe('https://myapp.example/callback')
    expect(sent.get('code_verifier')).toBe('verifier-abc')
    // Default clientAuthMethod 'body': credentials in the body, no Basic header.
    expect(sent.get('client_id')).toBe('client-abc')
    expect(sent.get('client_secret')).toBe('secret-xyz-123')
    expect(req.headers.authorization).toBeUndefined()

    expect(tokens.accessToken).toBe('access-123')
    expect(tokens.refreshToken).toBe('refresh-456')
    expect(tokens.tokenType).toBe('Bearer')
    expect(tokens.expiresIn).toBe(3600)
    // expiresAt is derived from expires_in — bounded by the wall clock around the call.
    const expiresAt = new Date(tokens.expiresAt as string).getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000)
    expect(expiresAt).toBeLessThanOrEqual(after + 3600 * 1000)

    // The token then authenticates a real request.
    const resource = (await provider.request(tokens, `${baseUrl}/resource`)) as {
      authorization: string
    }
    expect(resource.authorization).toBe('Bearer access-123')
  })

  it('parses a GitHub-style form-encoded 200 token response', async () => {
    const tokens = await provider.getToken(
      { ...config(), tokenUrl: `${baseUrl}/token-form` },
      'good-code',
    )
    expect(tokens.accessToken).toBe('form-token-789')
    expect(tokens.tokenType).toBe('bearer')
    expect(tokens.scope).toBe('user')
  })

  it('FAILURE DISAMBIGUATION: rejected code vs HTTP error vs empty 200 are DIFFERENT errors', async () => {
    // 1. Provider rejected the code inside a 200 body (GitHub-style) → the provider's own
    //    description reaches the caller: "get a fresh code", not "debug your wiring".
    await expect(provider.getToken(config(), 'rejected-code')).rejects.toThrow(
      /OAuth token error: The code passed is incorrect or expired\./,
    )

    // 2. HTTP-level rejection → the status code is in the message.
    await expect(provider.getToken(config(), 'unknown-code')).rejects.toThrow(
      /OAuth token request failed \(400\)/,
    )

    // 3. A 200 with no access_token (misconfigured tokenUrl) → an immediate, named
    //    failure — NOT a silent `accessToken: ''` that dies later as the resource
    //    server's confusing 401.
    await expect(provider.getToken(config(), 'empty-200')).rejects.toThrow(/missing access_token/)
  })

  it('refreshToken performs a real refresh_token grant', async () => {
    const tokens = await provider.refreshToken(config(), 'refresh-456')
    const sent = new URLSearchParams(lastSeen().body)
    expect(sent.get('grant_type')).toBe('refresh_token')
    expect(sent.get('refresh_token')).toBe('refresh-456')
    expect(tokens.accessToken).toBe('refreshed-token')
    expect(tokens.expiresIn).toBe(7200)
  })

  it("clientAuthMethod 'header' sends Basic auth and keeps the secret OUT of the body", async () => {
    const headerProvider = createProvider({ clientAuthMethod: 'header' })
    await headerProvider.getToken(config(), 'good-code')

    const req = lastSeen()
    const expected = `Basic ${Buffer.from('client-abc:secret-xyz-123').toString('base64')}`
    expect(req.headers.authorization).toBe(expected)
    const sent = new URLSearchParams(req.body)
    expect(sent.get('client_secret')).toBeNull()
    expect(sent.get('client_id')).toBeNull()
  })

  it('request() POSTs a JSON body and parses the JSON response', async () => {
    const result = (await provider.request(
      { accessToken: 'tok', tokenType: 'Bearer' },
      `${baseUrl}/resource`,
      { method: 'POST', body: { hello: 'world' } },
    )) as { authorization: string; method: string; receivedBody: string }

    expect(result.method).toBe('POST')
    expect(result.authorization).toBe('Bearer tok')
    expect(JSON.parse(result.receivedBody)).toEqual({ hello: 'world' })
    expect(lastSeen().headers['content-type']).toBe('application/json')
  })

  it('revokeToken posts the token; a missing revocationUrl fails with an actionable message', async () => {
    await provider.revokeToken(config(), 'access-123')
    expect(new URLSearchParams(lastSeen().body).get('token')).toBe('access-123')

    const { revocationUrl: _drop, ...withoutRevocation } = config()
    await expect(provider.revokeToken(withoutRevocation, 'access-123')).rejects.toThrow(
      /revocation URL not configured/,
    )
  })

  it('CONSUMER PROPERTY: a hung provider fails at the configured timeout, not forever', async () => {
    // Deterministic: the /slow route answers after 5s (unref'd); a 150ms client timeout
    // must surface as a timeout error ~150ms in — the caller's login route stays
    // responsive instead of hanging the whole request.
    const impatient = createProvider({ timeout: 150 })
    const started = Date.now()
    await expect(
      impatient.getToken({ ...config(), tokenUrl: `${baseUrl}/slow` }, 'good-code'),
    ).rejects.toThrow(/timeout|timed out|aborted/i)
    expect(Date.now() - started).toBeLessThan(2000)
  })
})
