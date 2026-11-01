import { describe, expect, it } from 'vitest'

import { snapshotAnalyticsSdkUrls } from '../sdk.js'

describe('round-six analytics SDK URL snapshots', () => {
  it('scrubs SDK-added URLs in properties and person updates without touching project credentials', () => {
    const input = {
      event: 'callback.completed',
      properties: {
        token: 'required-project-token',
        $current_url: '/callback?token=current-secret&view=full',
        $session_entry_referrer: '/start?session=entry-secret&safe=1',
        safe: 'byte-for-byte',
      },
      $set: {
        $initial_referrer: '/start?session=initial-secret&safe=1',
        plan: 'pro',
      },
      $set_once: {
        $pathname: '/callback?code=oauth-secret&view=full',
      },
    }

    const output = snapshotAnalyticsSdkUrls(input)

    expect(output).toEqual({
      event: 'callback.completed',
      properties: {
        token: 'required-project-token',
        $current_url: '/callback?token=[REDACTED]&view=full',
        $session_entry_referrer: '/start?session=[REDACTED]&safe=1',
        safe: 'byte-for-byte',
      },
      $set: {
        $initial_referrer: '/start?session=[REDACTED]&safe=1',
        plan: 'pro',
      },
      $set_once: {
        $pathname: '/callback?code=[REDACTED]&view=full',
      },
    })
    expect(output).not.toBe(input)
    expect(output.properties).not.toBe(input.properties)
    expect(input.properties.$current_url).toContain('current-secret')
  })
})
