import { describe, expect, it } from 'vitest'

import { toAnthropicToolId } from '../tool-ids.js'

describe('toAnthropicToolId', () => {
  it('passes a valid id through unchanged', () => {
    expect(toAnthropicToolId('toolu_01SiYnjdBWbGFTau4wV3Z8d2')).toBe(
      'toolu_01SiYnjdBWbGFTau4wV3Z8d2',
    )
    expect(toAnthropicToolId('call_00_wmH3LWF1x2q4Du9hMRtI6012')).toBe(
      'call_00_wmH3LWF1x2q4Du9hMRtI6012',
    )
  })

  it('maps a disallowed id into the accepted pattern, deterministically', () => {
    const mapped = toAnthropicToolId('plan-approval:f1b63f6637ee6d55')
    expect(mapped).toMatch(/^[a-zA-Z0-9_-]+$/)
    expect(mapped.startsWith('plan-approval_f1b63f6637ee6d55_')).toBe(true)
    expect(toAnthropicToolId('plan-approval:f1b63f6637ee6d55')).toBe(mapped)
  })

  it('keeps two ids that differ only in a disallowed character apart', () => {
    expect(toAnthropicToolId('a:b')).not.toBe(toAnthropicToolId('a.b'))
    expect(toAnthropicToolId('a:b')).not.toBe('a_b')
  })
})
