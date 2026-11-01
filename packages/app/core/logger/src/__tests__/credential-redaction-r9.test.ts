import { describe, expect, it } from 'vitest'

import { snapshotCredentials } from '../index.js'

describe('round-nine URL span boundaries', () => {
  it('redacts the complete credential value containing an apostrophe', () => {
    expect(snapshotCredentials("/reset?token=first'credential-tail&view=full")).toBe(
      '/reset?token=[REDACTED]&view=full',
    )
  })

  it('respects matching quote boundaries in serialized attributes', () => {
    expect(
      snapshotCredentials(
        'a:attr__href="/reset?token=first\'credential-tail&view=full"attr__target="_blank"',
      ),
    ).toBe('a:attr__href="/reset?token=[REDACTED]&view=full"attr__target="_blank"')
    expect(
      snapshotCredentials(
        "a:attr__href='/reset?token=credential-tail&view=full'attr__target='_blank'",
      ),
    ).toBe("a:attr__href='/reset?token=[REDACTED]&view=full'attr__target='_blank'")
  })
})
