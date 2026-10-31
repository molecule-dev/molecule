import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('portable comment identifier guidance', () => {
  it.each([
    '../index.ts',
    '../service.ts',
    '../numbers.ts',
    '../__setup__/comment_numbers.sql',
    '../../README.md',
  ])('%s explains the identifier contract without a workload-specific example', (relative) => {
    expect(readFileSync(new URL(relative, import.meta.url), 'utf8')).not.toMatch(
      /RealWorld|jwtToken|conduit/i,
    )
  })

  it('counterexample: keeps the schema relationship between the integer number and comment UUID', () => {
    const sql = readFileSync(new URL('../__setup__/comment_numbers.sql', import.meta.url), 'utf8')
    expect(sql).toContain('"number" INTEGER PRIMARY KEY')
    expect(sql).toContain(
      '"commentId" UUID NOT NULL UNIQUE REFERENCES "comments"("id") ON DELETE CASCADE',
    )
  })
})
