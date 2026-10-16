/**
 * This package works with exactly what it declares.
 *
 * A scaffold creates the tables a package's registry entry declares, and this
 * package reads FOUR tables by name: `articles` and `article_tags` (its own),
 * and `reactions` and `follows` — favorites on every response and the
 * followed-authors feed. It ships the SQL for all four in its own
 * `src/__setup__/`, so a project that installs ONLY `@molecule/api-resource-article`
 * gets every table its endpoints need.
 *
 * This test builds a real SQLite database from nothing but the files in this
 * package's own `src/__setup__/` — no sibling package's SQL is copied in — and
 * drives create, get and list against it. Before `reactions.sql`/`follows.sql`
 * shipped here, every one of those calls died on
 * `no such table: reactions`, which is how the defect reached a live run.
 *
 * The copies must stay identical to the packages that own those tables, or the
 * two definitions of `reactions` drift and one app's column is missing — the
 * last test holds them together.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { setStore } from '@molecule/api-database'
import { createMigrator, createPool, createStore } from '@molecule/api-database-sqlite'

import { createArticle, getArticleBySlug, listArticles, setFavorite } from '../service.js'

const ALICE = '00000000-0000-4000-8000-00000000001a'
const BOB = '00000000-0000-4000-8000-00000000001b'

const here = new URL('.', import.meta.url).pathname
const setupDir = join(here, '..', '__setup__')

/** Every setup file this package ships, as the scaffold copies them. */
const setupFiles = readdirSync(setupDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

let dir: string

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'article-self-sufficient-'))
  const migrations = join(dir, 'migrations')
  mkdirSync(migrations)
  // ONLY this package's own setup files — the point of the test.
  setupFiles.forEach((file, index) => {
    copyFileSync(join(setupDir, file), join(migrations, `${index}-${file}`))
  })
  const path = join(dir, 'app.db')
  process.env.SQLITE_PATH = path
  await createMigrator(migrations)()
  setStore(createStore(createPool({ path })))
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('a database built from this package’s own setup only', () => {
  it('ships the four tables its endpoints read', () => {
    expect(setupFiles).toEqual([
      'articles.sql',
      'articles_position.sql',
      'follows.sql',
      'reactions.sql',
    ])
  })

  it('creates and reads an article without any other package’s SQL', async () => {
    const article = await createArticle(ALICE, {
      title: 'Self sufficient',
      body: 'built from one package',
      tagList: ['setup'],
    })
    expect(article.slug).toBe('self-sufficient')
    expect(article.favoritesCount).toBe(0)
    const read = await getArticleBySlug(article.slug)
    expect(read?.title).toBe('Self sufficient')
    expect(read?.tagList).toEqual(['setup'])
  })

  it('lists articles, favorites resolved from the reactions table', async () => {
    const favorited = await setFavorite('self-sufficient', BOB, true)
    expect(favorited?.favoritesCount).toBe(1)
    const page = await listArticles({ viewerId: BOB })
    expect(page.total).toBe(1)
    expect(page.data[0].favorited).toBe(true)
    // The favoritedBy filter reads `reactions` too.
    const byBob = await listArticles({ favoritedBy: BOB })
    expect(byBob.data.map((a) => a.slug)).toEqual(['self-sufficient'])
  })

  it('keeps the shipped copies identical to the packages that own those tables', () => {
    const copies: [string, string, string][] = [
      [
        'reactions.sql',
        join(here, '../../../reaction/src/__setup__/reactions.sql'),
        '@molecule/api-resource-reaction',
      ],
      [
        'follows.sql',
        join(here, '../../../follow/src/__setup__/follows.sql'),
        '@molecule/api-resource-follow',
      ],
    ]
    for (const [shipped, owner, ownerName] of copies) {
      expect(
        readFileSync(join(setupDir, shipped), 'utf-8'),
        `${shipped} has drifted from ${ownerName}'s own setup file — copy it verbatim`,
      ).toBe(readFileSync(owner, 'utf-8'))
    }
  })
})
