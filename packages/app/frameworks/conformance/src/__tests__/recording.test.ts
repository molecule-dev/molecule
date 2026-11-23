import { afterEach, describe, expect, it, vi } from 'vitest'

import { CHILDREN_STEP_SWITCH } from '../ui/index.js'
import {
  assertCompleteRecording,
  assertKeepsChildStepGoldens,
  missingRecordings,
} from './recording.js'

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

describe('the children-step recording guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })
  const committed = {
    List: {
      rows: {},
      'rows, then children change': {},
      'rows, then footer emptied and refilled': {},
    },
  }

  it('refuses a recording without the switch over goldens that hold children-step cases', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '')
    expect(() => assertKeepsChildStepGoldens(committed, 'goldens.json')).toThrow(
      'RECORD_GOLDENS would drop 2 children-step case(s) from goldens.json (List / rows, then children change; List / rows, then footer emptied and refilled): record with CONFORMANCE_CHILDREN_STEP=1 set.',
    )
    expect(() => assertKeepsChildStepGoldens({ List: { rows: {} } }, 'goldens.json')).not.toThrow()
    expect(() => assertKeepsChildStepGoldens(undefined, 'goldens.json')).not.toThrow()
  })

  it('allows it with the switch set', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    expect(() => assertKeepsChildStepGoldens(committed, 'goldens.json')).not.toThrow()
  })
})
