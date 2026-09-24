/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the RxNorm bond with only the
 * network (`fetch`) stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provider as rxnorm } from '@molecule/api-drug-database-rxnorm'

import { checkInteractions, getDrug, searchDrug, setProvider } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

const concept = (rxcui: string, name: string): Response =>
  json({
    drugGroup: { conceptGroup: [{ tty: 'SCD', conceptProperties: [{ rxcui, name, tty: 'SCD' }] }] },
  })

const route = (url: string): Response => {
  if (url.includes('/drugs.json') && url.includes('metformin'))
    return concept('861007', 'metformin hydrochloride 500 MG Oral Tablet')
  if (url.includes('/drugs.json') && url.includes('lisinopril'))
    return concept('314076', 'lisinopril 10 MG Oral Tablet')
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
  // NLM retired the interaction API — the bond degrades to [] rather than failing.
  if (url.includes('/interaction/list.json')) return json({}, 410)
  return json({}, 404)
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves ids via search, loads detail, and renders [] as "none found", not "safe"', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(rxnorm)

    const [metformin] = await searchDrug('metformin')
    const [lisinopril] = await searchDrug('lisinopril')
    expect(metformin?.id).toBe('861007')
    expect(lisinopril?.id).toBe('314076')

    const detail = metformin ? await getDrug(metformin.id) : null
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

    const ids = [metformin, lisinopril].flatMap((match) => (match ? [match.id] : []))
    const interactions = await checkInteractions(ids)
    const summary =
      interactions.length === 0
        ? 'No known interactions found. Always confirm with a pharmacist.'
        : interactions.map((ix) => `${ix.severity}: ${ix.description}`).join('\n')

    expect(ids).toEqual(['861007', '314076'])
    expect(interactions).toEqual([])
    expect(summary).toBe('No known interactions found. Always confirm with a pharmacist.')
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/interaction/list.json')
  })
})
