/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — a real express app with the real
 * express.json / connect-busboy parsers, exercised over real HTTP (port 0).
 *
 * @module
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  bodyParser,
  createJsonParser,
  setBodyParser,
  setJsonParserFactory,
} from '@molecule/api-middleware-body-parser'

import { jsonParserFactory, provider } from '../index.js'

describe('README @example', () => {
  let server: Server
  let base = ''

  beforeAll(async () => {
    setBodyParser(provider)
    setJsonParserFactory(jsonParserFactory)

    const app = express()

    app.post('/api/imports', createJsonParser({ limit: '10mb' }), (req, res) => {
      res.json({ rows: Array.isArray(req.body.rows) ? req.body.rows.length : 0 })
    })

    app.use(bodyParser)
    app.post('/api/items', (req, res) => {
      res.status(201).json({ item: req.body, rawBody: req.rawBody ?? null })
    })

    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('parses JSON into req.body and keeps req.rawBody', async () => {
    const res = await fetch(`${base}/api/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Desk' }),
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ item: { name: 'Desk' }, rawBody: '{"name":"Desk"}' })
  })

  it('parses urlencoded fields, JSON-decoding each value', async () => {
    const res = await fetch(`${base}/api/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'qty=3&active=true',
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ item: { qty: 3, active: true }, rawBody: null })
  })

  it('rejects JSON over 2 MB on the global parser but accepts it on the 10 MB route', async () => {
    const rows = Array.from({ length: 100_000 }, (_, i) => ({ id: i, label: 'row' }))
    const body = JSON.stringify({ rows })
    expect(body.length).toBeGreaterThan(2 * 1024 * 1024)

    const tooBig = await fetch(`${base}/api/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
    expect(tooBig.status).toBe(413)

    const imported = await fetch(`${base}/api/imports`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
    expect(imported.status).toBe(200)
    expect(await imported.json()).toEqual({ rows: 100_000 })
  })
})
