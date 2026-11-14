import { describe, expect, it } from 'vitest'

import { assertCompleteRecording, missingRecordings } from './recording.js'

describe('the goldens recording guard', () => {
  it('names every case a run did not record, including whole groups', () => {
    expect(
      missingRecordings(
        { Button: ['solid', 'ghost'], Input: ['empty'], useAuth: [] },
        { Button: { solid: {} } },
      ),
    ).toEqual(['Button / ghost', 'Input / empty'])
  })

  it('refuses a partial recording and allows a complete one', () => {
    expect(() => assertCompleteRecording(['Button / ghost'], 'goldens.json')).toThrow(
      'RECORD_GOLDENS did not write goldens.json: 1 case(s) did not record (Button / ghost)',
    )
    expect(() => assertCompleteRecording([], 'goldens.json')).not.toThrow()
  })
})
