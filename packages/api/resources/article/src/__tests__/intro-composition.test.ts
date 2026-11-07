import { readFileSync } from 'node:fs'

import ts from 'typescript'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

const service = vi.hoisted(() => ({ createArticle: vi.fn() }))
vi.mock('../service.js', () => service)

import * as article from '../index.js'

// A bounded whole-doc read keeps the introduction, before @module/@example.
// Execute the recipe there, rather than locking its wording. The old intro has
// no recipe, leaving a reader on the existing default map. That control fails
// on HTTP behavior (400 instead of 201), not on a missing export or code fence.
function documentedMap(surface: 'source' | 'readme' = 'source'): article.ArticleRequestHandlerMap {
  const source = readFileSync(
    new URL(surface === 'source' ? '../index.ts' : '../../README.md', import.meta.url),
    'utf8',
  )
  const intro =
    surface === 'source'
      ? source.split(/\n \* @(?:module|example|remarks)\b/)[0].replace(/^ \* ?/gm, '')
      : source.split('\n## ')[0].slice(0, 4_000)
  const example =
    intro.match(/```typescript\n([\s\S]*?)```/)?.[1] ??
    "export { requestHandlerMap } from '@molecule/api-resource-article'"
  const js = ts.transpileModule(example, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const result: { requestHandlerMap?: article.ArticleRequestHandlerMap } = {}
  new Function('require', 'exports', js)(() => article, result)
  return result.requestHandlerMap!
}

const created = { slug: 'issue', title: 'Issue', body: 'News', authorId: 'editor' }

async function publish(
  handlers: article.ArticleRequestHandlerMap,
  body: unknown,
  userId?: string,
): Promise<{ statusCode: number; body: unknown }> {
  const state = { statusCode: 0, body: undefined as unknown }
  const res = {
    locals: userId ? { session: { userId } } : {},
    status: (code: number) => {
      state.statusCode = code
      return res
    },
    json: (value: unknown) => {
      state.body = value
      return res
    },
  }
  await handlers.create(
    { body, params: {}, query: {}, headers: {} } as MoleculeRequest,
    res as unknown as MoleculeResponse,
  )
  return state
}

beforeEach(() => {
  service.createArticle.mockReset().mockResolvedValue(created)
})

describe('the article composition recipe in the doc introduction', () => {
  it.each(['source', 'readme'] as const)(
    'publishes a newsletter entry through the %s introduction recipe',
    async (surface) => {
      const result = await publish(
        documentedMap(surface),
        { entry: { title: 'Issue', body: 'News' } },
        'editor',
      )
      expect(result).toEqual({ statusCode: 201, body: { entry: created } })
      expect(service.createArticle).toHaveBeenCalledExactlyOnceWith('editor', {
        title: 'Issue',
        body: 'News',
      })
    },
  )

  it('keeps authentication and validation in the documented shared path', async () => {
    expect(
      (await publish(documentedMap(), { entry: { title: 'Issue', body: 'News' } })).statusCode,
    ).toBe(401)
    expect(
      (await publish(documentedMap(), { entry: { title: '', body: 'News' } }, 'editor')).statusCode,
    ).toBe(400)
    expect(service.createArticle).not.toHaveBeenCalled()
  })

  it('keeps the default article map on its original flat-body contract', async () => {
    expect(
      await publish(article.requestHandlerMap, { title: 'Issue', body: 'News' }, 'editor'),
    ).toEqual({
      statusCode: 201,
      body: created,
    })
    expect(
      (
        await publish(
          article.requestHandlerMap,
          { entry: { title: 'Issue', body: 'News' } },
          'editor',
        )
      ).statusCode,
    ).toBe(400)
  })
})
