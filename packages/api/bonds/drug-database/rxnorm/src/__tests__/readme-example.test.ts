/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkInteractions, getDrug, searchDrug, setProvider } from '@molecule/api-drug-database'

import { provider } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

const route = (url: string): Response => {
  if (url.includes('/drugs.json'))
    return json({
      drugGroup: {
        conceptGroup: [
          {
            tty: 'SCD',
            conceptProperties: [
              { rxcui: '861007', name: 'metformin hydrochloride 500 MG Oral Tablet', tty: 'SCD' },
            ],
          },
        ],
      },
    })
  if (url.includes('/rxcui/861007/properties.json'))
    return json({
      properties: {
        rxcui: '861007',
        name: 'metformin hydrochloride 500 MG Oral Tablet',
        tty: 'SCD',
      },
    })
  if (url.includes('/rxcui/861007/related.json'))
    return json({
      relatedGroup: {
        conceptGroup: [
          { tty: 'IN', conceptProperties: [{ rxcui: '6809', name: 'metformin', tty: 'IN' }] },
          { tty: 'DF', conceptProperties: [{ rxcui: '317541', name: 'Oral Tablet', tty: 'DF' }] },
        ],
      },
    })
  if (url.includes('/interaction/list.json')) return json({}, 410)
  return json({}, 404)
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('searches, loads detail and degrades retired interactions to []', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(provider)

    const matches = await searchDrug('metformin')
    expect(matches).toEqual([
      {
        id: '861007',
        name: 'metformin hydrochloride 500 MG Oral Tablet',
        genericName: 'metformin hydrochloride 500 MG Oral Tablet',
        brandName: null,
        source: 'rxnorm',
      },
    ])
    const first = matches[0]
    const detail = first ? await getDrug(first.id) : null
    console.log(
      detail?.name,
      detail?.dosageForms,
      detail?.ingredients.map((i) => i.name),
    )
    expect(log).toHaveBeenCalledWith(
      'metformin hydrochloride 500 MG Oral Tablet',
      ['Oral Tablet'],
      ['metformin'],
    )

    const interactions = await checkInteractions(['861007', '310965'])
    expect(interactions).toEqual([])
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/interaction/list.json')

    const callsBefore = fetchMock.mock.calls.length
    expect(await checkInteractions(['861007'])).toEqual([])
    expect(fetchMock.mock.calls.length).toBe(callsBefore)
  })
})
