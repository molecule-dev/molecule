import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findOne } = vi.hoisted(() => ({ findOne: vi.fn() }))
vi.mock('@molecule/api-database', () => ({ findOne }))

import { slugify, uniqueSlug, uniqueSlugInTable } from '../index.js'

describe('slugify', () => {
  it('folds accents and punctuation into a lowercase hyphenated slug', () => {
    expect(slugify('Café au lait: a how-to!')).toBe('cafe-au-lait-a-how-to')
    expect(slugify('  Straße über Øresund  ')).toBe('strasse-uber-oresund')
    expect(slugify('Hello   World')).toBe('hello-world')
    expect(slugify('!!!')).toBe('')
  })

  it('cuts long text at a word boundary and honours the separator', () => {
    const long = 'word '.repeat(40)
    const slug = slugify(long, { maxLength: 22 })
    expect(slug.length).toBeLessThanOrEqual(22)
    expect(slug.endsWith('-')).toBe(false)
    expect(slug).toBe('word-word-word-word')
    expect(slugify('A B C', { separator: '_' })).toBe('a_b_c')
  })
})

describe('uniqueSlug', () => {
  it('takes the plain slug, then numbers it', async () => {
    const taken = new Set(['hello-world', 'hello-world-2'])
    expect(await uniqueSlug('Hello World', (s) => taken.has(s))).toBe('hello-world-3')
    expect(await uniqueSlug('Fresh', () => false)).toBe('fresh')
  })

  it('falls back to a random suffix, and always suffixes when asked', async () => {
    const slug = await uniqueSlug('x', (s) => !/^x-[a-z0-9]{12}$/.test(s), { maxNumbered: 3 })
    expect(slug).toMatch(/^x-[a-z0-9]{12}$/)
    expect(await uniqueSlug('Hello', () => false, { alwaysSuffix: true })).toMatch(
      /^hello-[a-z0-9]{6}$/,
    )
    expect(await uniqueSlug('!!!', () => false, { fallback: 'post' })).toBe('post')
  })
})

describe('uniqueSlugInTable', () => {
  beforeEach(() => findOne.mockReset())

  it('checks the column, and lets a row keep its own slug', async () => {
    findOne.mockImplementation(async (_table: string, where?: Array<{ value: string }>) =>
      where?.[0]?.value === 'hello' ? { id: 'a1' } : null,
    )
    expect(await uniqueSlugInTable('articles', 'slug', 'Hello')).toBe('hello-2')
    expect(findOne).toHaveBeenCalledWith('articles', [
      { field: 'slug', operator: '=', value: 'hello' },
    ])
    expect(await uniqueSlugInTable('articles', 'slug', 'Hello', { excludeId: 'a1' })).toBe('hello')
  })
})
