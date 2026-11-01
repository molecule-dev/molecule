import { describe, expect, it } from 'vitest'

import { snapshotAnalyticsSdkUrls } from '../sdk.js'

describe('round-seven analytics payload scrubbing', () => {
  it('scrubs nested DOM enrichment and arbitrary payload strings without a property list', () => {
    const userinfo = ['user', 'password'].join(':')
    const input = {
      event: 'password=event-name',
      token: 'required-project-token',
      properties: {
        distinct_id: 'user-1',
        $elements: [
          {
            attr__href: '/reset?token=element-secret&view=full',
            attr__aria_label: 'Open recovery',
          },
        ],
        $elements_chain: 'a:attr__href="/reset?token=chain-secret&view=full"attr__target="_blank"',
        customEnvelope: [
          { value: '#access_token=fragment-secret&view=full' },
          `https://${userinfo}@example.test:8443/callback?code=query-secret&view=full`,
        ],
        $referring_domain: 'user:password@ref.example.test:8443',
        hostname: 'ref.example.test:8443',
        pathname: '/reset',
      },
    }

    const output = snapshotAnalyticsSdkUrls(input)

    expect(output).toEqual({
      event: 'password=event-name',
      token: 'required-project-token',
      properties: {
        distinct_id: 'user-1',
        $elements: [
          {
            attr__href: '/reset?token=[REDACTED]&view=full',
            attr__aria_label: 'Open recovery',
          },
        ],
        $elements_chain: 'a:attr__href="/reset?token=[REDACTED]&view=full"attr__target="_blank"',
        customEnvelope: [
          { value: '#access_token=[REDACTED]&view=full' },
          'https://[REDACTED]@example.test:8443/callback?code=[REDACTED]&view=full',
        ],
        $referring_domain: '[REDACTED]@ref.example.test:8443',
        hostname: 'ref.example.test:8443',
        pathname: '/reset',
      },
    })
    expect(output).not.toBe(input)
    expect(output.properties).not.toBe(input.properties)
    expect(output.properties.$elements).not.toBe(input.properties.$elements)
    expect(input.properties.$elements[0].attr__href).toContain('element-secret')
  })

  it('keeps shared references and cycles without invoking non-URL identifiers', () => {
    const shared = { identifier: 'password=event-name', safe: 'byte-for-byte' }
    const input: { first: unknown; second: unknown; self?: unknown } = {
      first: shared,
      second: shared,
    }
    input.self = input

    const output = snapshotAnalyticsSdkUrls(input)

    expect(output.first).toBe(output.second)
    expect(output.self).toBe(output)
    expect(output.first).toEqual(shared)
  })
})
