import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DrugDatabaseProvider } from '@molecule/api-drug-database'

import { createProvider } from '../provider.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
 *
 * @param data - JSON body the response should resolve to.
 * @param status - HTTP status. Defaults to `200`.
 * @returns A minimal `Response` stub.
 */
const mockFetchResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (): string | null => null,
    },
    json: () => Promise.resolve(data),
  }) as unknown as Response

// Realistic /drugs.json?name=metformin response. Trimmed to the fields
// the provider reads. RxCUI / TTY / name values are taken verbatim from
// RxNav's published example output.
const METFORMIN_DRUGS_FIXTURE = {
  drugGroup: {
    name: 'metformin',
    conceptGroup: [
      {
        tty: 'SBD',
        conceptProperties: [
          {
            rxcui: '861007',
            name: 'metformin hydrochloride 500 MG Oral Tablet [Glucophage]',
            synonym: 'Glucophage 500 MG Oral Tablet',
            tty: 'SBD',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
      {
        tty: 'SCD',
        conceptProperties: [
          {
            rxcui: '860975',
            name: 'metformin hydrochloride 500 MG Oral Tablet',
            synonym: '',
            tty: 'SCD',
            language: 'ENG',
            suppress: 'N',
          },
          {
            rxcui: '860981',
            name: 'metformin hydrochloride 850 MG Oral Tablet',
            synonym: '',
            tty: 'SCD',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
      {
        tty: 'BN',
        conceptProperties: [
          {
            rxcui: '203484',
            name: 'Glucophage',
            synonym: '',
            tty: 'BN',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
      {
        tty: 'IN',
        conceptProperties: [
          {
            rxcui: '6809',
            name: 'metformin',
            synonym: '',
            tty: 'IN',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
    ],
  },
}

const METFORMIN_PROPERTIES_FIXTURE = {
  properties: {
    rxcui: '860975',
    name: 'metformin hydrochloride 500 MG Oral Tablet',
    synonym: '',
    tty: 'SCD',
    language: 'ENG',
    suppress: 'N',
    umlscui: 'C0876139',
  },
}

const METFORMIN_RELATED_FIXTURE = {
  relatedGroup: {
    rxcui: '860975',
    termType: ['IN', 'SBD', 'SCD', 'DF', 'BN'],
    conceptGroup: [
      {
        tty: 'IN',
        conceptProperties: [
          {
            rxcui: '6809',
            name: 'metformin',
            synonym: '',
            tty: 'IN',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
      {
        tty: 'BN',
        conceptProperties: [
          {
            rxcui: '203484',
            name: 'Glucophage',
            synonym: '',
            tty: 'BN',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
      {
        tty: 'DF',
        conceptProperties: [
          {
            rxcui: '317541',
            name: 'Oral Tablet',
            synonym: '',
            tty: 'DF',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
      {
        tty: 'SBD',
        conceptProperties: [
          {
            rxcui: '861007',
            name: 'metformin hydrochloride 500 MG Oral Tablet [Glucophage]',
            synonym: '',
            tty: 'SBD',
            language: 'ENG',
            suppress: 'N',
          },
        ],
      },
    ],
  },
}

const METFORMIN_NDCS_FIXTURE = {
  ndcGroup: {
    rxcui: '860975',
    ndcList: {
      ndc: ['00093-1074-01', '00093-1074-10', '00378-0118-01'],
    },
  },
}

// Realistic /interaction/list.json response for warfarin (rxcui 11289)
// + aspirin (rxcui 1191). Source name is the upstream's `sourceName`
// field — historically ONCHigh / DrugBank.
const WARFARIN_ASPIRIN_INTERACTION_FIXTURE = {
  fullInteractionTypeGroup: [
    {
      sourceName: 'DrugBank',
      sourceDisclaimer: 'Drug interaction information is for informational use only.',
      fullInteractionType: [
        {
          comment: '',
          minConcept: [
            { rxcui: '11289', name: 'warfarin', tty: 'IN' },
            { rxcui: '1191', name: 'aspirin', tty: 'IN' },
          ],
          interactionPair: [
            {
              description:
                'The risk or severity of bleeding can be increased when Warfarin is combined with Aspirin.',
              severity: 'high',
              interactionConcept: [
                {
                  minConceptItem: { rxcui: '11289', name: 'warfarin', tty: 'IN' },
                  sourceConceptItem: {
                    id: 'DB00682',
                    name: 'warfarin',
                    url: 'https://www.drugbank.ca/drugs/DB00682',
                  },
                },
                {
                  minConceptItem: { rxcui: '1191', name: 'aspirin', tty: 'IN' },
                  sourceConceptItem: {
                    id: 'DB00945',
                    name: 'aspirin',
                    url: 'https://www.drugbank.ca/drugs/DB00945',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

const NO_INTERACTION_FIXTURE = {
  // RxNav returns the bare envelope when no interactions are found.
}

const PROPERTIES_NOT_FOUND_FIXTURE = {
  // RxNav returns an empty object when the rxcui is unknown.
}

const EMPTY_NDC_FIXTURE = {
  ndcGroup: {
    rxcui: '0',
    ndcList: {},
  },
}

describe('rxnorm drug-database provider', () => {
  let provider: DrugDatabaseProvider

  beforeEach(() => {
    provider = createProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with the expected methods', () => {
      expect(provider).toBeDefined()
      expect(provider.searchDrug).toBeInstanceOf(Function)
      expect(provider.getDrug).toBeInstanceOf(Function)
      expect(provider.checkInteractions).toBeInstanceOf(Function)
      expect(provider.getNDCs).toBeInstanceOf(Function)
    })

    it('should send Accept: application/json on every request', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(METFORMIN_DRUGS_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await provider.searchDrug('metformin')

      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
      const headers = init?.headers as Record<string, string> | undefined
      expect(headers?.['Accept']).toBe('application/json')
    })

    it('should strip a trailing slash on the configured base URL', async () => {
      const customProvider = createProvider({ baseUrl: 'https://rxnav.example.test/REST/' })
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(METFORMIN_DRUGS_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await customProvider.searchDrug('metformin')

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url.startsWith('https://rxnav.example.test/REST/drugs.json')).toBe(true)
      expect(url).not.toContain('/REST//drugs.json')
    })
  })

  describe('searchDrug', () => {
    it('should map /drugs.json into normalized search-result rows', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(METFORMIN_DRUGS_FIXTURE)))

      const matches = await provider.searchDrug('metformin')

      // Four conceptGroups produce 5 records in total (SBD: 1, SCD: 2, BN: 1, IN: 1).
      expect(matches).toHaveLength(5)
      const sbd = matches.find((m) => m.id === '861007')
      expect(sbd?.brandName).toBe('metformin hydrochloride 500 MG Oral Tablet [Glucophage]')
      expect(sbd?.genericName).toBeNull()
      const scd = matches.find((m) => m.id === '860975')
      expect(scd?.genericName).toBe('metformin hydrochloride 500 MG Oral Tablet')
      expect(scd?.brandName).toBeNull()
      const bn = matches.find((m) => m.id === '203484')
      expect(bn?.brandName).toBe('Glucophage')
      const ingredient = matches.find((m) => m.id === '6809')
      expect(ingredient?.genericName).toBe('metformin')
      // Source identifier stamped on every record.
      for (const m of matches) {
        expect(m.source).toBe('rxnorm')
      }
    })

    it('should call /drugs.json with name= encoded query', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(METFORMIN_DRUGS_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await provider.searchDrug('hydrochlorothiazide')

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toBe('https://rxnav.nlm.nih.gov/REST/drugs.json?name=hydrochlorothiazide')
    })

    it('should return an empty array when the upstream response carries no drugGroup', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({})))

      const matches = await provider.searchDrug('zzzz-no-match')

      expect(matches).toEqual([])
    })

    it('should return an empty array for a blank query without making a request', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const matches = await provider.searchDrug('   ')

      expect(matches).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('getDrug', () => {
    it('should fetch /properties.json + /related.json and assemble a DrugDetail', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/properties.json')) {
          return Promise.resolve(mockFetchResponse(METFORMIN_PROPERTIES_FIXTURE))
        }
        if (url.includes('/related.json')) {
          return Promise.resolve(mockFetchResponse(METFORMIN_RELATED_FIXTURE))
        }
        return Promise.reject(new Error(`unexpected url: ${url}`))
      })
      vi.stubGlobal('fetch', fetchMock)

      const detail = await provider.getDrug('860975')

      expect(detail).not.toBeNull()
      expect(detail?.id).toBe('860975')
      expect(detail?.name).toBe('metformin hydrochloride 500 MG Oral Tablet')
      expect(detail?.genericName).toBe('metformin hydrochloride 500 MG Oral Tablet')
      expect(detail?.brandName).toBe('Glucophage')
      expect(detail?.dosageForms).toEqual(['Oral Tablet'])
      expect(detail?.ingredients).toEqual([{ id: '6809', name: 'metformin', strength: null }])
      expect(detail?.source).toBe('rxnorm')
    })

    it('should call /rxcui/:id/properties.json with the id encoded', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/properties.json')) {
          return Promise.resolve(mockFetchResponse(METFORMIN_PROPERTIES_FIXTURE))
        }
        return Promise.resolve(mockFetchResponse(METFORMIN_RELATED_FIXTURE))
      })
      vi.stubGlobal('fetch', fetchMock)

      await provider.getDrug('860975')

      const propsUrl = fetchMock.mock.calls.find((c) =>
        String(c[0]).includes('/properties.json'),
      )?.[0]
      expect(propsUrl).toBe('https://rxnav.nlm.nih.gov/REST/rxcui/860975/properties.json')
    })

    it('should return null when /properties.json does not contain a properties record', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(PROPERTIES_NOT_FOUND_FIXTURE)),
      )

      const detail = await provider.getDrug('0')

      expect(detail).toBeNull()
    })

    it('should still return a DrugDetail when /related.json fails, with empty dosage forms / ingredients', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/properties.json')) {
          return Promise.resolve(mockFetchResponse(METFORMIN_PROPERTIES_FIXTURE))
        }
        // Simulate an upstream 500 on /related.json — the provider must
        // not let related-fetch failures mask the primary properties
        // response.
        return Promise.resolve(mockFetchResponse({}, 500))
      })
      vi.stubGlobal('fetch', fetchMock)

      const detail = await provider.getDrug('860975')

      expect(detail).not.toBeNull()
      expect(detail?.id).toBe('860975')
      expect(detail?.dosageForms).toEqual([])
      expect(detail?.ingredients).toEqual([])
      // The SCD concept itself classifies as generic.
      expect(detail?.genericName).toBe('metformin hydrochloride 500 MG Oral Tablet')
      expect(detail?.brandName).toBeNull()
    })

    it('should raise on non-OK statuses from /properties.json', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 503)))

      await expect(provider.getDrug('860975')).rejects.toThrow(
        /RxNorm API request failed with status 503/,
      )
    })
  })

  describe('checkInteractions', () => {
    it('should map /interaction/list.json into normalized interactions', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(WARFARIN_ASPIRIN_INTERACTION_FIXTURE)),
      )

      const interactions = await provider.checkInteractions(['11289', '1191'])

      expect(interactions).toHaveLength(1)
      const interaction = interactions[0]
      expect(interaction?.drugIds).toEqual(['11289', '1191'])
      expect(interaction?.severity).toBe('high')
      expect(interaction?.description).toContain('bleeding')
      expect(interaction?.sources).toEqual(['DrugBank'])
    })

    it('should call /interaction/list.json with rxcuis as a +-separated list', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(WARFARIN_ASPIRIN_INTERACTION_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await provider.checkInteractions(['11289', '1191'])

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toMatch(/^https:\/\/rxnav\.nlm\.nih\.gov\/REST\/interaction\/list\.json\?/)
      expect(url).toContain('rxcuis=11289+1191')
    })

    it('should return [] when the upstream response carries no fullInteractionTypeGroup', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(NO_INTERACTION_FIXTURE)))

      const interactions = await provider.checkInteractions(['11289', '1191'])

      expect(interactions).toEqual([])
    })

    it('should return [] (deprecation fallback) on HTTP 404', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({}, 404))
      vi.stubGlobal('fetch', fetchMock)

      const interactions = await provider.checkInteractions(['11289', '1191'])

      expect(interactions).toEqual([])
    })

    it('should return [] (deprecation fallback) on HTTP 410', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 410)))

      const interactions = await provider.checkInteractions(['11289', '1191'])

      expect(interactions).toEqual([])
    })

    it('should return [] (deprecation fallback) on HTTP 503', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 503)))

      const interactions = await provider.checkInteractions(['11289', '1191'])

      expect(interactions).toEqual([])
    })

    it('should rethrow on unrelated non-OK statuses (e.g. 500)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      await expect(provider.checkInteractions(['11289', '1191'])).rejects.toThrow(
        /RxNorm API request failed with status 500/,
      )
    })

    it('should return [] without making a request when fewer than 2 ids are supplied', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const noIds = await provider.checkInteractions([])
      const oneId = await provider.checkInteractions(['11289'])

      expect(noIds).toEqual([])
      expect(oneId).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should normalize free-text severity values onto the core enum', async () => {
      const fixture = {
        fullInteractionTypeGroup: [
          {
            sourceName: 'TestSource',
            fullInteractionType: [
              {
                minConcept: [
                  { rxcui: 'a', name: 'a' },
                  { rxcui: 'b', name: 'b' },
                ],
                interactionPair: [
                  { description: 'severe', severity: 'severe' },
                  { description: 'medium', severity: 'medium' },
                  { description: 'minor', severity: 'minor' },
                  { description: 'unknown-text', severity: 'unrecognized' },
                  { description: 'absent' },
                ],
              },
            ],
          },
        ],
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const interactions = await provider.checkInteractions(['a', 'b'])

      expect(interactions.map((i) => i.severity)).toEqual([
        'high',
        'moderate',
        'low',
        'unknown',
        'unknown',
      ])
    })
  })

  describe('getNDCs', () => {
    it('should map /ndcs.json into a flat NDC string array', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(METFORMIN_NDCS_FIXTURE)))

      const ndcs = await provider.getNDCs('860975')

      expect(ndcs).toEqual(['00093-1074-01', '00093-1074-10', '00378-0118-01'])
    })

    it('should call /rxcui/:id/ndcs.json with the id encoded', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(METFORMIN_NDCS_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      await provider.getNDCs('860975')

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url).toBe('https://rxnav.nlm.nih.gov/REST/rxcui/860975/ndcs.json')
    })

    it('should return [] when the upstream response carries no ndc list', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(EMPTY_NDC_FIXTURE)))

      const ndcs = await provider.getNDCs('0')

      expect(ndcs).toEqual([])
    })

    it('should raise on non-OK statuses', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 503)))

      await expect(provider.getNDCs('860975')).rejects.toThrow(
        /RxNorm API request failed with status 503/,
      )
    })
  })

  describe('createProvider with custom baseUrl', () => {
    it('should send requests to the configured base URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(METFORMIN_DRUGS_FIXTURE))
      vi.stubGlobal('fetch', fetchMock)

      const customProvider = createProvider({ baseUrl: 'https://rxnav.example.test/REST' })
      await customProvider.searchDrug('metformin')

      const url = fetchMock.mock.calls[0]?.[0] as string
      expect(url.startsWith('https://rxnav.example.test/REST/drugs.json')).toBe(true)
    })
  })
})
