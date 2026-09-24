/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The only stand-in is the Cloudflare
 * D1 binding itself, which this test backs with a real in-memory SQLite
 * database (D1 is SQLite) so the shared store's generated SQL actually runs.
 *
 * @module
 */
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'

import { create, findMany, setStore } from '@molecule/api-database'

import { createProvider, type D1DatabaseLike, type D1PreparedStatementLike } from '../index.js'

/**
 * A D1-shaped binding over better-sqlite3, standing in for `env.DB`.
 *
 * @param sqlite - The in-memory database.
 * @returns An object with D1's `prepare().bind().all()/run()` shape.
 */
const d1Over = (sqlite: Database.Database): D1DatabaseLike => ({
  prepare(query: string): D1PreparedStatementLike {
    let bound: unknown[] = []
    const statement: D1PreparedStatementLike = {
      bind(...values: unknown[]) {
        bound = values
        return statement
      },
      async all<T>() {
        const stmt = sqlite.prepare(query)
        if (stmt.reader) return { results: stmt.all(...bound) as T[] }
        const info = stmt.run(...bound)
        return { results: [] as T[], meta: { changes: info.changes } }
      },
      async run() {
        const info = sqlite.prepare(query).run(...bound)
        return { meta: { changes: info.changes } }
      },
    }
    return statement
  },
})

interface Env {
  DB: D1DatabaseLike
}

interface Todo {
  id: string
  title: string
  done: number
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    setStore(createProvider({ database: env.DB }))

    if (request.method === 'POST') {
      const { title } = (await request.json()) as { title: string }
      const { data } = await create<Todo>('todos', { title, done: 0 })
      return Response.json(data, { status: 201 })
    }

    const open = await findMany<Todo>('todos', {
      where: [{ field: 'done', operator: '=', value: 0 }],
      orderBy: [{ field: 'title', direction: 'asc' }],
      limit: 50,
    })
    return Response.json(open)
  },
}

describe('README @example', () => {
  const sqlite = new Database(':memory:')

  afterEach(() => {
    sqlite.exec('DELETE FROM todos')
  })

  sqlite.exec(
    'CREATE TABLE todos (id TEXT PRIMARY KEY, title TEXT NOT NULL, done INTEGER NOT NULL)',
  )

  it('creates a row with a generated id and lists open todos, per invocation', async () => {
    const env: Env = { DB: d1Over(sqlite) }

    const post = async (title: string): Promise<Response> =>
      worker.fetch(
        new Request('https://app.example/todos', {
          method: 'POST',
          body: JSON.stringify({ title }),
        }),
        env,
      )

    const created = await post('Walk dog')
    expect(created.status).toBe(201)
    const todo = (await created.json()) as Todo
    expect(todo.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(todo).toMatchObject({ title: 'Walk dog', done: 0 })

    await post('Buy milk')
    sqlite.prepare('INSERT INTO todos (id, title, done) VALUES (?, ?, ?)').run('x', 'Done', 1)

    const listed = await worker.fetch(new Request('https://app.example/todos'), env)
    const open = (await listed.json()) as Todo[]
    expect(open.map((t) => t.title)).toEqual(['Buy milk', 'Walk dog'])
  })
})
