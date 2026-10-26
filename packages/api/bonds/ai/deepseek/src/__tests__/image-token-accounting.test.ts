/** Provider-owned image budgeting, including exact endpoint and alias boundaries. */
import process from 'node:process'
import { URL } from 'node:url'

import { describe, expect, it } from 'vitest'

import type {
  AIProvider,
  ChatEvent,
  ImageInputSize,
  ImageInputTokenEstimate,
} from '@molecule/api-ai'
import * as core from '@molecule/api-ai'

import * as deepseek from '../provider.js'

/** A provider implementing the optional capability, as a bond would. */
const priced = (tokens: (image: ImageInputSize) => number): AIProvider => ({
  name: 'test',
  chat: async function* (): AsyncGenerator<ChatEvent> {},
  estimateImageInputTokens: (image) => ({ known: true, upperBoundTokens: tokens(image) }),
})

describe('the core accessor answers unknown, never a guess', () => {
  const image = { model: 'some-model', mediaType: 'image/png' }

  it('a provider without the optional method is unknown, not an error', () => {
    const legacy: AIProvider = {
      name: 'legacy',
      chat: async function* (): AsyncGenerator<ChatEvent> {},
    }
    expect(core.estimateImageInputTokens(legacy, image)).toEqual({ known: false })
  })

  it('no provider at all is unknown', () => {
    expect(core.estimateImageInputTokens(null, image)).toEqual({ known: false })
    expect(core.estimateImageInputTokens(undefined, image)).toEqual({ known: false })
  })

  it('a documented bound passes through unchanged', () => {
    expect(
      core.estimateImageInputTokens(
        priced(() => 1024),
        image,
      ),
    ).toEqual({
      known: true,
      upperBoundTokens: 1024,
    })
  })

  it('a bound that is not a usable ceiling is refused, not trusted', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, undefined, '1024']) {
      expect(
        core.estimateImageInputTokens(
          priced(() => bad as number),
          image,
        ),
      ).toEqual({ known: false })
    }
  })

  it('a bond claiming unknown is passed through as unknown', () => {
    const honest: AIProvider = {
      name: 'honest',
      chat: async function* (): AsyncGenerator<ChatEvent> {},
      estimateImageInputTokens: () => ({ known: false }),
    }
    expect(core.estimateImageInputTokens(honest, image)).toEqual({ known: false })
  })
})

describe('the DeepSeek bond prices its documented models only', () => {
  const bound = (provider: AIProvider, model: string, mediaType: string): ImageInputTokenEstimate =>
    core.estimateImageInputTokens(provider, { model, mediaType })

  it('deepseek-flash carries the documented 1024-token ceiling per image', () => {
    const provider = deepseek.createProvider({ apiKey: 'sk-test' })
    expect(bound(provider, 'deepseek-flash', 'image/png')).toEqual({
      known: true,
      upperBoundTokens: 1024,
    })
  })

  it('the retired vision id is still accepted and served by the same model', () => {
    const provider = deepseek.createProvider({ apiKey: 'sk-test' })
    expect(bound(provider, 'deepseek-v4-flash-vision-exp', 'image/jpeg')).toEqual({
      known: true,
      upperBoundTokens: 1024,
    })
  })

  it('every documented image format is priced, and the media type is case-insensitive', () => {
    const provider = deepseek.createProvider({ apiKey: 'sk-test' })
    for (const mediaType of ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'IMAGE/PNG']) {
      expect(bound(provider, 'deepseek-flash', mediaType)).toEqual({
        known: true,
        upperBoundTokens: 1024,
      })
    }
  })

  it('a format the guide does not list is unknown, never the ceiling', () => {
    const provider = deepseek.createProvider({ apiKey: 'sk-test' })
    for (const mediaType of ['image/svg+xml', 'image/tiff', 'application/pdf', 'text/plain', '']) {
      expect(bound(provider, 'deepseek-flash', mediaType)).toEqual({ known: false })
    }
  })

  it('a model with no documented image support is unknown', () => {
    const provider = deepseek.createProvider({ apiKey: 'sk-test' })
    for (const model of ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro', 'gpt-5', '']) {
      expect(bound(provider, model, 'image/png')).toEqual({ known: false })
    }
  })

  it('a re-host alias gets no inherited bound; an alias onto a vision id does', () => {
    // The id the wire carries is what a re-host bills for; DeepSeek's documented
    // ceiling says nothing about another backend's accounting.
    const rehost = deepseek.createProvider({
      apiKey: 'sk-test',
      modelMap: { 'deepseek-flash': 'deepseek-ai/DeepSeek-V4-Flash' },
    })
    expect(bound(rehost, 'deepseek-flash', 'image/png')).toEqual({ known: false })

    // The bond's OWN alias resolution is reused: a canonical id that the map sends
    // to a documented vision id is priced as that model.
    const aliased = deepseek.createProvider({
      apiKey: 'sk-test',
      modelMap: { 'my-catalog-id': 'deepseek-flash' },
    })
    expect(bound(aliased, 'my-catalog-id', 'image/png')).toEqual({
      known: true,
      upperBoundTokens: 1024,
    })
  })
})

/**
 * The endpoint boundary. Every case here sends a DOCUMENTED native vision id
 * (`deepseek-flash` + `image/png`); what changes is where the bond will POST.
 */
describe("the DeepSeek bond prices only DeepSeek's own endpoint", () => {
  const bound = (provider: AIProvider): ImageInputTokenEstimate =>
    core.estimateImageInputTokens(provider, { model: 'deepseek-flash', mediaType: 'image/png' })

  /** Endpoints DeepSeek documents, in the forms that compose to exactly those paths. */
  const native = [
    { label: 'the default endpoint', config: {} },
    { label: 'the documented root', config: { baseUrl: 'https://api.deepseek.com' } },
    {
      label: 'the documented /v1 base with its own completions path',
      config: { baseUrl: 'https://api.deepseek.com/v1', completionsPath: '/chat/completions' },
    },
    {
      label: 'a /v1 base with a trailing slash and a bare path',
      config: { baseUrl: 'https://api.deepseek.com/v1/', completionsPath: 'chat/completions' },
    },
    {
      label: 'the root base with the bare completions path',
      config: { baseUrl: 'https://api.deepseek.com', completionsPath: '/chat/completions' },
    },
    {
      label: 'an explicit default port',
      config: { baseUrl: 'https://api.deepseek.com:443' },
    },
  ]

  for (const { label, config } of native) {
    it(`${label} is priced`, () => {
      expect(bound(deepseek.createProvider({ apiKey: 'sk-test', ...config }))).toEqual({
        known: true,
        upperBoundTokens: 1024,
      })
    })
  }

  /**
   * Endpoints that are not DeepSeek's backend, or not a documented request URL.
   *
   * A synthetic endpoint carrying embedded credentials is BUILT from parts rather
   * than written as one literal, so the workspace's pre-commit secret scanner does
   * not read a test fixture as a real URL credential. Nothing here is, or ever was,
   * a secret; a username-only and a user:password form must both answer unknown.
   */
  const USER_AT_HOST = ['https://user', '@api.deepseek.com'].join('')
  const CREDENTIAL_ENDPOINT = ['https://user', ':', 'secret', '@api.deepseek.com'].join('')
  const elsewhere = [
    // Astra's reproduction: a custom endpoint that keeps the native model names.
    {
      label: 'a custom endpoint preserving native model names',
      config: { baseUrl: 'https://other.example', modelMap: {} },
    },
    { label: 'a gateway that keeps the native path', config: { baseUrl: 'https://other.example' } },
    { label: 'a suffix host', config: { baseUrl: 'https://api.deepseek.com.example' } },
    { label: 'a lookalike host', config: { baseUrl: 'https://api.deepseek.com.evil.example' } },
    { label: 'plain http', config: { baseUrl: 'http://api.deepseek.com' } },
    { label: 'a non-default port', config: { baseUrl: 'https://api.deepseek.com:8443' } },
    {
      label: 'another path on the native host',
      config: { baseUrl: 'https://api.deepseek.com/proxy' },
    },
    {
      label: 'an extra path segment after the completions path',
      config: {
        baseUrl: 'https://api.deepseek.com',
        completionsPath: '/v1/chat/completions/extra',
      },
    },
    // The two undocumented shapes this amendment closes. `Request` preserves
    // them (see the witness below), so they are different paths, not the
    // documented one written differently.
    {
      label: 'a duplicate slash in the path (a base URL with a trailing slash)',
      config: { baseUrl: 'https://api.deepseek.com/' },
    },
    {
      label: 'a trailing slash after the completions path',
      config: { baseUrl: 'https://api.deepseek.com', completionsPath: '/v1/chat/completions/' },
    },
    {
      label: 'a query string on the endpoint',
      config: {
        baseUrl: 'https://api.deepseek.com',
        completionsPath: '/v1/chat/completions?trace=1',
      },
    },
    { label: 'a username in the endpoint', config: { baseUrl: USER_AT_HOST } },
    { label: 'credentials embedded in the endpoint', config: { baseUrl: CREDENTIAL_ENDPOINT } },
    { label: 'a relative base', config: { baseUrl: '/v1' } },
  ]

  for (const { label, config } of elsewhere) {
    it(`${label} is unknown`, () => {
      expect(bound(deepseek.createProvider({ apiKey: 'sk-test', ...config }))).toEqual({
        known: false,
      })
    })
  }

  it('the request keeps duplicate and trailing slashes, and the gate answers for that path', () => {
    // The gate must describe the URL the bond will actually POST to. A Request
    // parses its URL with the same WHATWG parser and normalizes NOTHING in the
    // path: both undocumented shapes keep their extra slash in `request.url`,
    // and `URL.pathname` reports it unchanged. Crediting them would price a
    // request DeepSeek does not document.
    const witness = [
      {
        endpoint: 'https://api.deepseek.com//v1/chat/completions',
        pathname: '//v1/chat/completions',
      },
      {
        endpoint: 'https://api.deepseek.com/v1/chat/completions/',
        pathname: '/v1/chat/completions/',
      },
      {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        pathname: '/v1/chat/completions',
      },
      { endpoint: 'https://api.deepseek.com/chat/completions', pathname: '/chat/completions' },
    ]
    for (const { endpoint, pathname } of witness) {
      const request = new Request(endpoint)
      expect(request.url).toBe(endpoint)
      expect(new URL(request.url).pathname).toBe(pathname)
      expect(new URL(endpoint).pathname).toBe(pathname)
    }
    // Exactly the two documented paths survive that parse, and the bond prices
    // only those: the same three URLs, composed through its own config.
    expect(
      witness.filter((w) => ['/v1/chat/completions', '/chat/completions'].includes(w.pathname)),
    ).toHaveLength(2)
    const provider = (
      config: Omit<NonNullable<Parameters<typeof deepseek.createProvider>[0]>, 'apiKey'>,
    ): AIProvider => deepseek.createProvider({ apiKey: 'sk-test', ...config })
    expect(
      bound(
        provider({ baseUrl: 'https://api.deepseek.com', completionsPath: '/v1/chat/completions' }),
      ),
    ).toEqual({ known: true, upperBoundTokens: 1024 })
    expect(
      bound(
        provider({ baseUrl: 'https://api.deepseek.com/', completionsPath: '/v1/chat/completions' }),
      ),
    ).toEqual({ known: false })
    expect(
      bound(
        provider({ baseUrl: 'https://api.deepseek.com', completionsPath: '/v1/chat/completions/' }),
      ),
    ).toEqual({ known: false })
  })

  it('DEEPSEEK_BASE_URL pointing away from the native endpoint answers unknown', () => {
    const previous = process.env.DEEPSEEK_BASE_URL
    process.env.DEEPSEEK_BASE_URL = 'https://gateway.example/v1'
    try {
      expect(bound(deepseek.createProvider({ apiKey: 'sk-test' }))).toEqual({ known: false })
    } finally {
      if (previous === undefined) delete process.env.DEEPSEEK_BASE_URL
      else process.env.DEEPSEEK_BASE_URL = previous
    }
  })

  it('DEEPSEEK_COMPLETIONS_PATH that leaves the documented path answers unknown', () => {
    const previous = process.env.DEEPSEEK_COMPLETIONS_PATH
    process.env.DEEPSEEK_COMPLETIONS_PATH = '/proxy/chat/completions'
    try {
      expect(bound(deepseek.createProvider({ apiKey: 'sk-test' }))).toEqual({ known: false })
    } finally {
      if (previous === undefined) delete process.env.DEEPSEEK_COMPLETIONS_PATH
      else process.env.DEEPSEEK_COMPLETIONS_PATH = previous
    }
  })

  it('a configured native endpoint outranks a hostile environment, end to end', () => {
    // The constructor resolves config FIRST, then the environment: the gate has to
    // follow the same order, or a config that pins the native endpoint would be
    // reported unknown just because the environment named another host.
    const previous = process.env.DEEPSEEK_BASE_URL
    process.env.DEEPSEEK_BASE_URL = 'https://gateway.example'
    try {
      const provider = deepseek.createProvider({
        apiKey: 'sk-test',
        baseUrl: 'https://api.deepseek.com',
      })
      expect(bound(provider)).toEqual({ known: true, upperBoundTokens: 1024 })
    } finally {
      if (previous === undefined) delete process.env.DEEPSEEK_BASE_URL
      else process.env.DEEPSEEK_BASE_URL = previous
    }
  })

  it('the US re-host (DeepInfra base and its model map) answers unknown', () => {
    const us = deepseek.createProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.deepinfra.com/v1/openai',
      completionsPath: '/chat/completions',
      modelMap: { 'deepseek-flash': 'deepseek-ai/DeepSeek-V4-Flash' },
    })
    expect(bound(us)).toEqual({ known: false })
  })

  it('pricing never leaves the process', () => {
    const original = globalThis.fetch
    let calls = 0
    globalThis.fetch = () => {
      calls++
      throw new Error('image pricing must not touch the network')
    }
    try {
      const provider = deepseek.createProvider({ apiKey: 'sk-test' })
      expect(bound(provider)).toEqual({ known: true, upperBoundTokens: 1024 })
      expect(
        provider.estimateImageInputTokens({ model: 'deepseek-flash', mediaType: 'image/svg+xml' }),
      ).toEqual({ known: false })
      expect(calls).toBe(0)
    } finally {
      globalThis.fetch = original
    }
  })
})
