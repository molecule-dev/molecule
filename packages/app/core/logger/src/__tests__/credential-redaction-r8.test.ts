import { describe, expect, it } from 'vitest'

import { snapshotCredentials } from '../index.js'

describe('round-eight logger boundaries', () => {
  it('keeps serialized element attributes after a final credential query value', () => {
    const input =
      'a:attr__href="/reset?token=chain-secret"attr__target="_blank"text="Open recovery"'

    expect(snapshotCredentials(input)).toBe(
      'a:attr__href="/reset?token=[REDACTED]"attr__target="_blank"text="Open recovery"',
    )
  })

  it('keeps a safe custom bound stack accessor', () => {
    const failure = new Error()
    const stack = 'Error: offline\n    at application (/safe/app.ts:4:2)'
    Object.defineProperty(failure, 'message', {
      get: () => 'offline',
      configurable: true,
    })
    Object.defineProperty(failure, 'stack', {
      get: function applicationStack() {
        return stack
      }.bind(null),
      configurable: true,
    })

    expect(snapshotCredentials(failure).stack).toBe(stack)
  })

  it('still recognizes the actual native lazy stack getter', () => {
    let reads = 0
    class CustomError extends Error {
      get message() {
        reads++
        return 'offline'
      }
    }

    snapshotCredentials(new CustomError())
    expect(reads).toBe(1)
  })
})
