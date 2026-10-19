import { describe, expect, it } from 'vitest'

import { TOOL_SCHEMAS } from '../schemas.js'

/**
 * The tool descriptions are where the executor reads how to call them, so the
 * "independent calls go in ONE reply" rule lives there first (xr-molecule-flash-m211:
 * 164 assistant messages for 221 calls, most messages carrying one). A description
 * that loses it silently costs a round trip per file.
 *
 * @module
 */

describe('the file tools’ descriptions ask for one reply with the independent calls', () => {
  it.each(['write_file', 'edit_file', 'read_file'])(
    '%s says independent calls go in ONE response',
    (name) => {
      expect(TOOL_SCHEMAS[name]?.description).toContain('Independent calls go in ONE response')
    },
  )

  it('write_file names the shape: one call per file, different paths', () => {
    expect(TOOL_SCHEMAS.write_file?.description).toContain('different paths')
  })
})
