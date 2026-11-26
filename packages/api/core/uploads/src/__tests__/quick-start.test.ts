/**
 * The Quick Start ends with a curl round trip, so an agent checks its upload route with the
 * standard tool instead of hand-building a multipart body in a script. The file curl sends must
 * be one the example's `types` accepts, or the documented check answers 415.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.ts'),
  'utf8',
)
const example = /@example\n \* ```ts\n([\s\S]*?)\n \* ```/.exec(source)?.[1] ?? ''

/** The type curl gives a `-F file=@…` part, by extension (curl's own table, lib/mime.c). */
const CURL_TYPES: Record<string, string> = {
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
}

describe('the Quick Start', () => {
  it('ends with one curl upload and a download of the id it returned', () => {
    // One upload, its id kept for the download: no second upload just to read the id.
    expect(example.match(/curl -fsS -F file=@/g)).toHaveLength(1)
    expect(example).toMatch(/id=\$\(curl -fsS -F file=@\S+ localhost:\$PORT\/files \| node -pe/)
    expect(example).toMatch(/curl -fsS localhost:\$PORT\/files\/\$id/)
  })

  it('uploads a file of a type its route accepts', () => {
    const extension = /-F file=@\S+\.(\w+)/.exec(example)?.[1] ?? ''
    const types = /types: \[([^\]]*)\]/.exec(example)?.[1] ?? ''
    expect(CURL_TYPES[extension]).toBeDefined()
    expect(types).toContain(`'${CURL_TYPES[extension]}'`)
  })
})
