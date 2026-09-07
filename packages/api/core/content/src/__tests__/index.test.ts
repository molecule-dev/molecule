import { afterEach, describe, expect, it } from 'vitest'

import { unbondAll } from '@molecule/api-bond'

import type { ContentProvider, ContentRecord } from '../index.js'
import {
  getProvider,
  hasProvider,
  isContentValidationError,
  parseContent,
  readContentDirectory,
  setProvider,
} from '../index.js'

const record: ContentRecord = {
  slug: 'hello',
  path: '/posts/hello.md',
  frontMatter: { title: 'Hello', date: '2026-09-07' },
  body: 'Hi.',
  draft: false,
  date: '2026-09-07T00:00:00.000Z',
  title: 'Hello',
}

const fake: ContentProvider = {
  name: 'fake',
  parse: (input) => ({ ...record, path: input.path }),
  readDirectory: async (dir) => [{ ...record, path: `${dir}/hello.md` }],
}

describe('@molecule/api-content', () => {
  afterEach(() => {
    unbondAll('content')
  })

  it('has no provider until one is bonded, and getProvider says so', () => {
    expect(hasProvider()).toBe(false)
    expect(() => getProvider()).toThrow(/Content provider not configured/)
  })

  it('setProvider bonds the provider and the conveniences delegate to it', async () => {
    setProvider(fake)
    expect(hasProvider()).toBe(true)
    expect(getProvider().name).toBe('fake')
    expect(parseContent({ source: '', path: '/x.md' }).path).toBe('/x.md')
    const records = await readContentDirectory('/dir')
    expect(records).toHaveLength(1)
    expect(records[0].path).toBe('/dir/hello.md')
  })

  it('isContentValidationError identifies the error by code, not by class', () => {
    const err = Object.assign(new Error('bad'), {
      code: 'CONTENT_VALIDATION',
      path: '/x.md',
      reason: 'bad',
    })
    expect(isContentValidationError(err)).toBe(true)
    expect(isContentValidationError(new Error('bad'))).toBe(false)
    expect(isContentValidationError({ code: 'CONTENT_VALIDATION' })).toBe(false)
    expect(isContentValidationError(null)).toBe(false)
  })
})
