import { describe, expect, it } from 'vitest'

import { createProvider, provider } from '../provider.js'

interface Pkg extends Record<string, unknown> {
  name: string
  description: string
  category: string
  type: string
  exports: string[]
}

const docs: Pkg[] = [
  {
    name: 'app-auth',
    description: 'Sign in with sessions and passwords',
    category: 'auth',
    type: 'core',
    exports: ['useAuth', 'login'],
  },
  {
    name: 'app-auth-oauth',
    description: 'OAuth sign in with Google and GitHub',
    category: 'auth',
    type: 'bond',
    exports: ['provider'],
  },
  {
    name: 'api-payments',
    description: 'Checkout, subscriptions and invoices',
    category: 'payments',
    type: 'core',
    exports: ['charge'],
  },
  {
    name: 'api-payments-stripe',
    description: 'Stripe billing bond, deprecated soon',
    category: 'payments',
    type: 'bond',
    exports: ['provider'],
  },
  {
    name: 'app-i18n',
    description: 'Translations for every UI string',
    category: 'i18n',
    type: 'core',
    exports: ['t'],
  },
]

const options = {
  idField: 'name',
  fields: ['name', 'description', 'exports'],
  filterFields: ['category', 'type'],
  boost: { name: 3 },
}

describe('minisearch provider', () => {
  it('is named and builds an index of the right size', () => {
    const index = provider.createIndex(docs, options)
    expect(provider.name).toBe('minisearch')
    expect(index.size).toBe(5)
    expect(index.options).toBe(options)
  })

  it('ranks a name match above a description match and returns the original documents', () => {
    const index = provider.createIndex(docs, options)
    const hits = index.search('payments')
    expect(hits.map((h) => h.id)).toEqual(['api-payments', 'api-payments-stripe'])
    expect(hits[0].doc).toBe(docs[2])
    expect(hits[0].fields).toContain('name')
    expect(hits[0].score).toBeGreaterThan(0)
  })

  it('matches prefixes and tolerates a typo', () => {
    const index = provider.createIndex(docs, options)
    expect(index.search('subscr').map((h) => h.id)).toEqual(['api-payments'])
    expect(index.search('paymnts').map((h) => h.id)).toContain('api-payments')
  })

  it('searches exported names', () => {
    const index = provider.createIndex(docs, options)
    expect(index.search('useAuth').map((h) => h.id)).toEqual(['app-auth'])
  })

  it('applies field filters from the query string', () => {
    const index = provider.createIndex(docs, options)
    expect(
      index
        .search('category:auth sign')
        .map((h) => h.id)
        .sort(),
    ).toEqual(['app-auth', 'app-auth-oauth'])
    expect(index.search('type:bond sign').map((h) => h.id)).toEqual(['app-auth-oauth'])
    expect(index.search('-type:bond sign').map((h) => h.id)).toEqual(['app-auth'])
  })

  it('treats an unknown field:value as text', () => {
    const index = provider.createIndex(docs, options)
    expect(index.search('exports:useAuth').map((h) => h.id)).toEqual(['app-auth'])
  })

  it('requires phrases verbatim and honours exclusions', () => {
    const index = provider.createIndex(docs, options)
    expect(index.search('"sign in" google').map((h) => h.id)).toEqual(['app-auth-oauth'])
    expect(index.search('"in sign"').map((h) => h.id)).toEqual([])
    expect(index.search('payments -deprecated').map((h) => h.id)).toEqual(['api-payments'])
  })

  it('ANDs several terms, then falls back to OR when nothing matches all of them', () => {
    const index = provider.createIndex(docs, options)
    expect(index.search('stripe billing').map((h) => h.id)).toEqual(['api-payments-stripe'])
    const either = index.search('stripe translations').map((h) => h.id)
    expect(either).toContain('api-payments-stripe')
    expect(either).toContain('app-i18n')
    const orOnly = createProvider({ combineWith: 'OR' }).createIndex(docs, options)
    expect(
      orOnly
        .search('stripe sessions')
        .map((h) => h.id)
        .sort(),
    ).toEqual(['api-payments-stripe', 'app-auth'])
  })

  it('ranks a document containing the words as a phrase above one containing them apart', () => {
    const index = provider.createIndex(
      [
        {
          name: 'api-resource-user',
          description: 'User accounts, with a feedback flag per user',
          category: 'users',
          type: 'core',
          exports: [],
        },
        {
          name: 'app-feedback-widget',
          description: 'Collect user feedback inside the app',
          category: 'feedback',
          type: 'core',
          exports: [],
        },
      ],
      options,
    )
    expect(index.search('user feedback').map((h) => h.id)).toEqual([
      'app-feedback-widget',
      'api-resource-user',
    ])
  })

  it('drops union matches that hit fewer than half of the terms', () => {
    const index = provider.createIndex(docs, options)
    expect(index.search('zzz stripe qqq')).toEqual([])
    expect(index.search('stripe qqq').map((h) => h.id)).toEqual(['api-payments-stripe'])
  })

  it('browses with filters when the text is empty, in insertion order, scored 0', () => {
    const index = provider.createIndex(docs, options)
    const hits = index.search('category:payments')
    expect(hits.map((h) => h.id)).toEqual(['api-payments', 'api-payments-stripe'])
    expect(hits.every((h) => h.score === 0)).toBe(true)
    expect(index.search('').length).toBe(5)
    expect(index.search({ text: '', limit: 2 }).length).toBe(2)
  })

  it('limits results', () => {
    const index = provider.createIndex(docs, options)
    expect(index.search({ text: 'app', limit: 1 }).length).toBe(1)
  })

  it('suggests completions', () => {
    const index = provider.createIndex(docs, options)
    expect(index.suggest('sub')).toContain('subscriptions')
    expect(index.suggest('')).toEqual([])
  })

  it('adds, replaces and removes documents', () => {
    const index = provider.createIndex(docs, options)
    index.add({
      name: 'app-search',
      description: 'Client search',
      category: 'search',
      type: 'core',
      exports: [],
    })
    expect(index.search('client search').map((h) => h.id)).toEqual(['app-search'])
    expect(() => index.add(docs[0])).toThrow(/already indexed/)
    index.replace({ ...docs[0], description: 'Magic links only' })
    expect(index.search('magic').map((h) => h.id)).toEqual(['app-auth'])
    expect(index.search('passwords').length).toBe(0)
    index.remove('app-auth')
    index.remove('nope')
    expect(index.size).toBe(5)
    expect(index.search('magic').length).toBe(0)
  })

  it('uses a custom field extractor', () => {
    const index = provider.createIndex(docs, {
      ...options,
      extractField: (doc, field) => (field === 'description' ? 'zebra' : String(doc[field] ?? '')),
    })
    expect(index.search('zebra').length).toBe(5)
    expect(index.search('checkout').length).toBe(0)
  })
})
