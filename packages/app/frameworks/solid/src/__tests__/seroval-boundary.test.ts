import { fromJSON, type SerovalJSON, SerovalMalformedNodeError, toJSON } from 'seroval'
import { describe, expect, it } from 'vitest'

/**
 * seroval turns serialized values back into objects, and solid-js uses it when
 * hydrating. Two advisories were fixed upstream in seroval 1.6.3 along that
 * path: a typed-array node (GHSA-jp82-f5mq-hwhp) or a DataView node could point
 * its buffer field at a plain object carrying a `length`, so the view was built
 * over whatever that length said instead of rejecting a buffer that is not an
 * ArrayBuffer. GHSA-p6vx-979v-rg4c is the related Promise-assimilation bug.
 *
 * The workspace pins a patched seroval (through solid-js 1.9.16 and up), so this
 * test runs against the real deserializer. A downgrade of solid-js to a seroval
 * range below 1.6.3 makes the hostile cases below deserialize instead of throw,
 * and the test fails here instead of showing up as a renewed advisory.
 */

/** seroval's node encoding: object = 10, typed array = 15, DataView = 20. */
const objectNodeWithLength = (length: number): unknown => ({
  t: 10,
  i: 1,
  p: { k: ['length'], v: [{ t: 0, s: length }] },
  o: 0,
})

/** Wraps a deliberately malformed root node in the outer shape `fromJSON` reads. */
const payload = (root: unknown): SerovalJSON =>
  ({ t: root, f: 63, m: [] }) as unknown as SerovalJSON

/** Returns the `cause` seroval attaches to its deserialization error, if it throws. */
const causeOfRejection = (hostile: SerovalJSON): unknown => {
  try {
    fromJSON(hostile)
  } catch (error) {
    return (error as { cause?: unknown }).cause
  }
  return undefined
}

describe('seroval deserialization boundary', () => {
  it('round-trips a legitimate typed array', () => {
    const restored = fromJSON<Uint8Array>(toJSON(new Uint8Array([1, 2, 3])))
    expect(Array.from(restored)).toEqual([1, 2, 3])
  })

  it('rejects a typed array whose buffer is a plain object with a length', () => {
    const hostile = payload({
      t: 15,
      i: 0,
      c: 'Uint8Array',
      f: objectNodeWithLength(16),
      b: 0,
      l: 3,
    })
    expect(() => fromJSON(hostile)).toThrow()
    expect(causeOfRejection(hostile)).toBeInstanceOf(SerovalMalformedNodeError)
  })

  it('rejects a DataView whose buffer is a plain object with a length', () => {
    const hostile = payload({ t: 20, i: 0, f: objectNodeWithLength(16), b: 0, l: 4 })
    expect(() => fromJSON(hostile)).toThrow()
    expect(causeOfRejection(hostile)).toBeInstanceOf(SerovalMalformedNodeError)
  })
})
