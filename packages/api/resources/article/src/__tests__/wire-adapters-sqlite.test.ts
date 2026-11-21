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
import scaffoldRouter from '../scaffold-router.js'

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
          mapRequest: (req) => {
            const { byline, ...query } = req.query
            if (byline !== 'public-editor') {
              return { response: { statusCode: 404, body: { error: 'Editor not found' } } }
            }
            return { query: { ...query, authorId: 'editor' } }
          },
        })
      : handlers
  app.get('/filtered', filtered.list)
  app.get('/native', handlers.list)
  app.post('/native', handlers.create)
  app.use('/editable', scaffoldRouter)
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
  it('serves all native article routes from the editable Express router', async () => {
    const articles = '/editable/articles'
    const input = { title: 'Feed', body: 'From the newsroom', tagList: ['newsroom'] }
    expect((await call(articles, 'POST', undefined, input)).status).toBe(401)
    expect((await call(articles, 'POST', 'lead', { ...input, title: '' })).status).toBe(400)
    const created = await call(articles, 'POST', 'lead', input)
    expect(created).toMatchObject({ status: 201, body: { slug: 'feed-2', ...input } })
    const article = `${articles}/${created.body.slug}`
    expect((await call(`${articles}/feed`)).status).toBe(401)
    expect((await call(`${articles}/feed`, 'GET', 'reader')).body.total).toBe(0)
    expect((await call(`${articles}/tags`)).body).toContainEqual({ tag: 'newsroom', count: 1 })
    expect((await call(`${articles}?tag=newsroom&authorId=lead`)).body).toMatchObject({
      total: 1,
      data: [{ slug: 'feed-2' }],
    })
    const favorite = `${article}/favorite`
    expect((await call(favorite, 'POST', 'reader')).body).toMatchObject({ favorited: true })
    expect((await call(article, 'GET', 'reader')).body).toMatchObject({ favoritesCount: 1 })
    expect((await call(favorite, 'DELETE', 'reader')).body).toMatchObject({ favorited: false })
    expect((await call(article, 'PUT', 'reader', { body: 'Denied' })).status).toBe(403)
    expect((await call(article, 'DELETE', 'reader')).status).toBe(403)
    expect((await call(article, 'PUT', 'lead', { body: 'Edited' })).body.body).toBe('Edited')
    expect(await call(article, 'DELETE', 'lead')).toEqual({ status: 204, body: undefined })
    expect((await call(article)).status).toBe(404)
  })

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
    const edited = await call('/archive/release-notes', 'PUT', 'editor', {
      entry: { body: 'Second edition' },
    })
    expect(edited.body.archive.body).toBe('Second edition')
    const deleted = await call('/archive/release-notes', 'DELETE', 'editor')
    expect(deleted).toEqual({ status: 204, body: undefined })
    expect((await call('/archive/release-notes')).status).toBe(404)
  })

  describe('a bulletin archive with entries by different editors', () => {
    beforeAll(async () => {
      for (const [author, title] of [
        ['editor', 'Bulletin one'],
        ['guest', 'Guest bulletin'],
        ['editor', 'Bulletin two'],
      ]) {
        const created = await call('/native', 'POST', author, {
          title,
          body: 'News from the team',
          tagList: ['bulletin'],
        })
        expect(created.status).toBe(201)
      }
    })

    it('applies a resolved authorId from mapRequest before counting and paging', async () => {
      const page = await call('/filtered?byline=public-editor&tag=bulletin&limit=1&offset=1')
      expect(page.status).toBe(200)
      expect(page.body).toMatchObject({
        data: [{ authorId: 'editor', slug: 'bulletin-one' }],
        total: 2,
        limit: 1,
        offset: 1,
      })
    })

    it('keeps legacy author filters and lists every matching entry when no author is requested', async () => {
      const legacy = await call('/native?tag=bulletin&author=guest')
      expect(legacy.status).toBe(200)
      expect(legacy.body).toMatchObject({
        data: [{ authorId: 'guest' }],
        total: 1,
      })
      const all = await call('/native?tag=bulletin')
      expect(all.status).toBe(200)
      expect(all.body.total).toBe(3)
    })

    it('prefers the canonical authorId if a request also includes the legacy key', async () => {
      const page = await call('/native?tag=bulletin&authorId=guest&author=editor')
      expect(page.status).toBe(200)
      expect(page.body).toMatchObject({
        data: [{ authorId: 'guest' }],
        total: 1,
      })
    })
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
