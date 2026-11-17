/** Custom publishing routes compose the public services over the package's real tables. */
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create, setStore } from '@molecule/api-database'
import { createMigrator, createPool, createStore } from '@molecule/api-database-sqlite'
import { uniqueSlugInTable } from '@molecule/api-slug'

import { follow, isFollowing, unfollow } from '../../../follow/src/index.js'
import * as article from '../index.js'

let directory: string
let pool: ReturnType<typeof createPool>
let store: ReturnType<typeof createStore>

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'article-service-reuse-'))
  const migrations = join(directory, 'migrations')
  mkdirSync(migrations)
  const setup = new URL('../__setup__/', import.meta.url)
  readdirSync(setup)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .forEach((file, index) => {
      copyFileSync(new URL(file, setup), join(migrations, `${index + 1}-${file}`))
    })
  const path = join(directory, 'newsletter.db')
  const previousPath = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = path
  try {
    await createMigrator(migrations)()
  } finally {
    if (previousPath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = previousPath
  }
  pool = createPool({ path })
  store = createStore(pool)
  setStore(store)
})

afterEach(async () => {
  vi.restoreAllMocks()
  if (pool) await pool.end()
  if (directory) rmSync(directory, { recursive: true, force: true })
})

async function allocate(title: string, excludeId?: string): Promise<string> {
  // A missing public operation is an assertion failure, not an import/setup error.
  const service = (
    article as unknown as {
      uniqueArticleSlug?: (title: string, excludeId?: string) => Promise<string>
    }
  ).uniqueArticleSlug
  expect(service, 'custom workflows need the article slug policy as a public operation').toBeTypeOf(
    'function',
  )
  return service!(title, excludeId)
}

describe('shared services in a newsletter workflow', () => {
  it('allocates a reserved title and looks up the stored row without hydrating it', async () => {
    const slug = await allocate('Feed')
    expect(slug).toBe('feed-2')
    const row = await create<article.ArticleRow>('articles', {
      slug,
      title: 'Feed',
      body: 'Newsletter issue',
      authorId: 'editor',
    })
    const found = await article.findArticleRow(slug)
    expect(found).toMatchObject({ id: row.data!.id, slug, body: 'Newsletter issue' })
    expect(found).not.toHaveProperty('favoritesCount')
    expect(await article.findArticleRow('missing')).toBeNull()
    expect(await article.getArticleBySlug(slug)).toMatchObject({
      slug,
      tagList: [],
      favoritesCount: 0,
      favorited: false,
    })
  })

  it('shares collision and update-exclusion behavior with createArticle', async () => {
    const first = await article.createArticle('editor', { title: 'Café News', body: 'First' })
    expect(await allocate('Café News')).toBe('cafe-news-2')
    expect(await allocate('Café News', first.id)).toBe(first.slug)
    const second = await article.createArticle('editor', { title: 'Café News', body: 'Second' })
    expect(second.slug).toBe('cafe-news-2')
    expect(await allocate('Café News', second.id)).toBe(second.slug)
    expect(await allocate('Café News')).toBe('cafe-news-3')
    expect(await article.updateArticle(second.slug, 'editor', { title: 'Tags' })).toMatchObject({
      status: 'ok',
      article: { slug: 'tags-2' },
    })
  })

  it('keeps the article fallback and allocator free of writes', async () => {
    const writes = vi.spyOn(store, 'create')
    expect(await allocate('!!!')).toBe('article')
    expect(await allocate('Tags')).toBe('tags-2')
    expect(writes).not.toHaveBeenCalled()
  })

  it('leaves a different table and its legitimate custom slug policy local', async () => {
    await pool.query('CREATE TABLE collections (id TEXT PRIMARY KEY, slug TEXT UNIQUE)')
    const uniqueSlug = (title: string): Promise<string> =>
      uniqueSlugInTable('collections', 'slug', title)
    expect(await uniqueSlug('Feed')).toBe('feed')
    await create('collections', { id: 'collection', slug: 'feed' })
    expect(await uniqueSlug('Feed')).toBe('feed-2')
    expect(await article.findArticleRow('feed')).toBeNull()
  })

  it('projects a profile using the same canonical id for follow, read and unfollow', async () => {
    const profile = { id: 'editor-id', username: 'newsletter-editor' }
    const project = async (viewerId: string | null | undefined) => ({
      username: profile.username,
      following: await isFollowing(viewerId, 'user', profile.id),
    })
    await follow('reader', 'user', profile.id)
    expect(await project('reader')).toEqual({ username: profile.username, following: true })
    expect(await isFollowing('reader', 'user', profile.username)).toBe(false)
    expect(await isFollowing('reader', 'topic', profile.id)).toBe(false)
    const reads = vi.spyOn(store, 'findOne')
    expect(await project(null)).toEqual({ username: profile.username, following: false })
    expect(await project(undefined)).toEqual({ username: profile.username, following: false })
    expect(reads).not.toHaveBeenCalled()
    await unfollow('reader', 'user', profile.id)
    expect(await project('reader')).toEqual({ username: profile.username, following: false })
  })
})
