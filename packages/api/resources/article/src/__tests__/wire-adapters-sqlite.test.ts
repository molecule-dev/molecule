import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { setStore } from '@molecule/api-database'
import { createMigrator, createPool, createStore } from '@molecule/api-database-sqlite'
import type { RequestHandlerOptions } from '@molecule/api-resource'

import * as handlers from '../handlers/index.js'

let directory: string
let server: Server
let origin: string
let pool: ReturnType<typeof createPool>
const options: RequestHandlerOptions = {
  mapRequest: (req) => ({ body: req.body?.entry }),
  mapResponse: (result) =>
    result.statusCode >= 400 || result.statusCode === 204
      ? result
      : { ...result, body: { archive: result.body } },
}

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'article-wire-http-'))
  const migrations = join(directory, 'migrations')
  mkdirSync(migrations)
  const setup = new URL('../__setup__/', import.meta.url)
  readdirSync(setup)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .forEach((file, index) => {
      copyFileSync(new URL(file, setup), join(migrations, `${index + 1}-${file}`))
    })
  const path = join(directory, 'archive.db')
  const previousPath = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = path
  try {
    await createMigrator(migrations)()
  } finally {
    if (previousPath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = previousPath
  }
  pool = createPool({ path })
  setStore(createStore(pool))

  // Use the untouched old named handlers in the before-control. The same HTTP
  // requests then fail on wire assertions, rather than on a missing export.
  const mapped =
    'createArticleHandlers' in handlers ? handlers.createArticleHandlers(options) : handlers
  const app = express()
  app.use(express.json())
  app.use((req, res, next) => {
    const userId = req.header('X-Fixture-User')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.post('/archive', mapped.create)
  app.get('/archive', mapped.list)
  app.get('/archive/:slug', mapped.read)
  app.put('/archive/:slug', mapped.update)
  app.delete('/archive/:slug', mapped.del)
  app.post('/archive/:slug/save', mapped.favorite)
  const filtered =
    'createArticleHandlers' in handlers
      ? handlers.createArticleHandlers({
          mapRequest: (req) => ({ query: { ...req.query, author: 'editor' } }),
        })
      : handlers
  app.get('/filtered', filtered.list)
  app.post('/native', handlers.create)
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('HTTP fixture did not listen')
  origin = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
  if (pool) await pool.end()
  if (directory) rmSync(directory, { recursive: true, force: true })
})

const call = async (path: string, method = 'GET', userId?: string, body?: unknown) => {
  const response = await fetch(origin + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-Fixture-User': userId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : undefined }
}

describe('configured article HTTP handlers with SQLite', () => {
  it('persists an enveloped publish, viewer favorite, paged read, edit and delete', async () => {
    const created = await call('/archive', 'POST', 'editor', {
      entry: { title: 'Release notes', body: 'First edition', tagList: ['news'] },
    })
    expect(created.status).toBe(201)
    expect(created.body.archive).toMatchObject({
      slug: 'release-notes',
      authorId: 'editor',
      tagList: ['news'],
    })
    const saved = await call('/archive/release-notes/save', 'POST', 'reader')
    expect(saved.body.archive).toMatchObject({ favorited: true, favoritesCount: 1 })
    const read = await call('/archive/release-notes', 'GET', 'reader')
    expect(read.body.archive).toMatchObject({ body: 'First edition', favorited: true })
    const list = await call('/archive?limit=1&tag=news', 'GET', 'reader')
    expect(list.body.archive).toMatchObject({ total: 1, limit: 1 })
    expect(list.body.archive.data[0]).toMatchObject({ slug: 'release-notes', favorited: true })
    const filtered = await call('/filtered?author=public-editor')
    expect(filtered.status).toBe(200)
    expect(filtered.body).toMatchObject({ total: 1 })
    expect(filtered.body.data[0].authorId).toBe('editor')
    const edited = await call('/archive/release-notes', 'PUT', 'editor', {
      entry: { body: 'Second edition' },
    })
    expect(edited.body.archive.body).toBe('Second edition')
    const deleted = await call('/archive/release-notes', 'DELETE', 'editor')
    expect(deleted).toEqual({ status: 204, body: undefined })
    expect((await call('/archive/release-notes')).status).toBe(404)
  })

  it('keeps authorization and input validation in front of real database writes', async () => {
    expect(
      (await call('/archive', 'POST', undefined, { entry: { title: 'Denied', body: 'Text' } }))
        .status,
    ).toBe(401)
    expect(
      (await call('/archive', 'POST', 'editor', { entry: { title: '', body: 'Text' } })).status,
    ).toBe(400)
    const created = await call('/archive', 'POST', 'editor', {
      entry: { title: 'Private draft', body: 'Original' },
    })
    expect(created.status).toBe(201)
    const denied = await call('/archive/private-draft', 'PUT', 'intruder', {
      entry: { body: 'Changed' },
    })
    expect(denied.status).toBe(403)
    expect((await call('/archive/private-draft')).body.archive.body).toBe('Original')
  })

  it('does not apply the archive envelope to a native-contract route', async () => {
    const native = await call('/native', 'POST', 'editor', {
      title: 'Native contract',
      body: 'Flat',
    })
    expect(native.status).toBe(201)
    expect(native.body).toMatchObject({ slug: 'native-contract', body: 'Flat' })
    expect(native.body).not.toHaveProperty('archive')
    const nested = await call('/native', 'POST', 'editor', {
      entry: { title: 'Wrong contract', body: 'Nested' },
    })
    expect(nested.status).toBe(400)
  })
})
