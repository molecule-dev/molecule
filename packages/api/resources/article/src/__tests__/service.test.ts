/**
 * The article service against a real database: the SQLite bond, this
 * package's migration and the reaction and follow packages' tables, applied
 * the way a scaffolded app applies them on boot.
 */
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { findMany, setStore } from '@molecule/api-database'
import { createMigrator, createPool, createStore } from '@molecule/api-database-sqlite'

import {
  createArticle,
  deleteArticle,
  getArticleBySlug,
  getFeed,
  listArticles,
  popularTags,
  setFavorite,
  updateArticle,
} from '../service.js'

const ALICE = '00000000-0000-4000-8000-00000000000a'
const BOB = '00000000-0000-4000-8000-00000000000b'
const CAROL = '00000000-0000-4000-8000-00000000000c'

let dir: string

/** The tags of an article as a reader of the join table sees them. */
const tagsInTable = (articleId: string): Promise<{ tag: string; position: number }[]> =>
  findMany<{ tag: string; position: number }>('article_tags', {
    where: [{ field: 'articleId', operator: '=', value: articleId }],
    orderBy: [
      { field: 'position', direction: 'asc' },
      { field: 'tag', direction: 'asc' },
    ],
    select: ['tag', 'position'],
  })

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'article-service-'))
  const migrations = join(dir, 'migrations')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(migrations)
  const here = new URL('.', import.meta.url).pathname
  copyFileSync(join(here, '../__setup__/articles.sql'), join(migrations, '1-articles.sql'))
  // The scaffold applies both setup files, in this order (articles.sql sorts
  // first) — the position file is the one a database that predates the column
  // gets its upgrade from.
  copyFileSync(
    join(here, '../__setup__/articles_position.sql'),
    join(migrations, '2-articles-position.sql'),
  )
  copyFileSync(
    join(here, '../../../reaction/src/__setup__/reactions.sql'),
    join(migrations, '3-reactions.sql'),
  )
  copyFileSync(
    join(here, '../../../follow/src/__setup__/follows.sql'),
    join(migrations, '4-follows.sql'),
  )
  const path = join(dir, 'app.db')
  process.env.SQLITE_PATH = path
  await createMigrator(migrations)()
  setStore(createStore(createPool({ path })))
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('articles', () => {
  it('creates articles with unique slugs, keeps tags, and never uses a route word', async () => {
    const a = await createArticle(ALICE, {
      title: 'Hello World',
      body: 'First',
      tagList: ['intro', 'intro', ' news '],
    })
    const b = await createArticle(BOB, { title: 'Hello world!', body: 'Second' })
    const feed = await createArticle(BOB, { title: 'Feed', body: 'x' })
    expect(a.slug).toBe('hello-world')
    expect(a.tagList).toEqual(['intro', 'news'])
    expect(b.slug).toBe('hello-world-2')
    expect(feed.slug).toBe('feed-2')
    expect((await getArticleBySlug('hello-world'))?.body).toBe('First')
  })

  it('lists newest first, even within one second, and filters by tag and author', async () => {
    const first = await createArticle(CAROL, {
      title: 'Quick one',
      body: '1',
      tagList: ['dragons'],
    })
    const second = await createArticle(CAROL, {
      title: 'Quick two',
      body: '2',
      tagList: ['dragons'],
    })
    const all = await listArticles({ limit: 2 })
    expect(all.data.map((x) => x.slug)).toEqual([second.slug, first.slug])
    expect(all.total).toBeGreaterThanOrEqual(5)
    const tagged = await listArticles({ tag: 'dragons' })
    expect(tagged.data.map((x) => x.title)).toEqual(['Quick two', 'Quick one'])
    expect((await listArticles({ authorId: ALICE })).data.map((x) => x.slug)).toEqual([
      'hello-world',
    ])
    expect((await listArticles({ tag: 'nothing-has-this' })).total).toBe(0)
  })

  it('counts favorites, knows the viewer’s own, and filters by who favorited', async () => {
    await setFavorite('hello-world', BOB, true)
    await setFavorite('hello-world', BOB, true)
    const fav = await setFavorite('hello-world', CAROL, true)
    expect(fav?.favoritesCount).toBe(2)
    expect(fav?.favorited).toBe(true)
    expect((await getArticleBySlug('hello-world'))?.favorited).toBe(false)
    const bobs = await listArticles({ favoritedBy: BOB, viewerId: BOB })
    expect(bobs.data.map((x) => x.slug)).toEqual(['hello-world'])
    expect(bobs.data[0].favorited).toBe(true)
    const after = await setFavorite('hello-world', BOB, false)
    expect(after?.favoritesCount).toBe(1)
    expect(await setFavorite('no-such-article', BOB, true)).toBeNull()
  })

  it('feeds articles by followed authors only', async () => {
    const { follow } = await import('@molecule/api-resource-follow')
    expect((await getFeed(ALICE)).total).toBe(0)
    await follow(ALICE, 'user', CAROL)
    const feed = await getFeed(ALICE)
    expect(feed.data.length).toBeGreaterThan(0)
    expect(feed.data.every((x) => x.authorId === CAROL)).toBe(true)
  })

  it('moves updatedAt forward on every update, even within the same millisecond', async () => {
    const before = await getArticleBySlug('hello-world')
    const first = await updateArticle('hello-world', ALICE, { body: 'one' })
    const second = await updateArticle('hello-world', ALICE, { body: 'two' })
    if (!before || first.status !== 'ok' || second.status !== 'ok') throw new Error('update failed')
    expect(Date.parse(first.article.updatedAt)).toBeGreaterThan(Date.parse(before.updatedAt))
    expect(Date.parse(second.article.updatedAt)).toBeGreaterThan(
      Date.parse(first.article.updatedAt),
    )
  })

  it('lets only the author update and delete, and re-slugs on a new title', async () => {
    expect((await updateArticle('hello-world', BOB, { body: 'hijack' })).status).toBe('forbidden')
    const updated = await updateArticle('hello-world', ALICE, {
      title: 'Hello Again',
      tagList: ['updated'],
    })
    expect(updated.status).toBe('ok')
    if (updated.status !== 'ok') return
    expect(updated.article.slug).toBe('hello-again')
    expect(updated.article.tagList).toEqual(['updated'])
    expect((await listArticles({ tag: 'intro' })).total).toBe(0)
    expect((await deleteArticle('hello-again', BOB)).status).toBe('forbidden')
    expect((await deleteArticle('hello-again', ALICE)).status).toBe('ok')
    expect(await getArticleBySlug('hello-again')).toBeNull()
    expect((await deleteArticle('hello-again', ALICE)).status).toBe('not_found')
  })

  it('ranks tags by use', async () => {
    const tags = await popularTags()
    expect(tags[0]).toEqual({ tag: 'dragons', count: 2 })
  })

  it('keeps the submitted tag order in the join table', async () => {
    const article = await createArticle(CAROL, {
      title: 'Tag order',
      body: 'x',
      tagList: ['d', 't'],
    })
    expect(await tagsInTable(article.id)).toEqual([
      { tag: 'd', position: 0 },
      { tag: 't', position: 1 },
    ])
  })

  it('keeps an order that is not alphabetical, so a row order cannot stand in for it', async () => {
    const article = await createArticle(CAROL, {
      title: 'Tag order reversed',
      body: 'x',
      tagList: ['zebra', 'apple', 'middle'],
    })
    expect((await tagsInTable(article.id)).map((row) => row.tag)).toEqual([
      'zebra',
      'apple',
      'middle',
    ])
    const updated = await updateArticle(article.slug, CAROL, { tagList: ['apple', 'zebra'] })
    expect(updated.status).toBe('ok')
    if (updated.status !== 'ok') return
    // Re-writing the tags replaces the rows, positions included.
    expect((await tagsInTable(article.id)).map((row) => row.tag)).toEqual(['apple', 'zebra'])
  })
})
