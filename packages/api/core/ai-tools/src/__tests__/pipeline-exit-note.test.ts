import { describe, expect, it } from 'vitest'

import { pipelineExitCodeNote } from '../pipeline-exit-note.js'

/** One tsc diagnostic line, as the real run printed it (xr-molecule-flash-m117 +04:06). */
const TSC_ERROR = 'src/handlers/conduit.ts(867,24): error TS2339: Property does not exist.'

describe('pipelineExitCodeNote — the code is a pipeline stage’s, not the check’s', () => {
  it('says a 0 is head’s when tsc printed an error through the pipe (m117 +04:06)', () => {
    const note = pipelineExitCodeNote(
      'cd /workspace/my-app/api && npx tsc --noEmit 2>&1 | head -40',
      0,
      `${TSC_ERROR}\n`,
    )
    expect(note).toContain('exit code 0')
    expect(note).toContain('head')
    expect(note).toContain('tsc')
    expect(note).toContain('1 type error')
  })

  it('counts every type error the output carries (m117 +08:05, four errors at exit 0)', () => {
    const note = pipelineExitCodeNote(
      'npx tsc --noEmit 2>&1 | head -40',
      0,
      Array.from({ length: 4 }, (_, i) => TSC_ERROR.replace('867', String(800 + i))).join('\n'),
    )
    expect(note).toContain('4 type errors')
  })

  it('reads the non-pretty tally too (`Found 2 errors in 2 files`)', () => {
    const note = pipelineExitCodeNote(
      'npx tsc --noEmit --pretty false | head -20',
      0,
      'Found 2 errors in 2 files.\n',
    )
    expect(note).toContain('2 type errors')
  })

  it('says a 1 is tail’s when the checker was clean (m117 +04:06, second shape)', () => {
    const note = pipelineExitCodeNote(
      'cd /workspace/my-app/api && npx tsc --noEmit 2>&1 | head -40 && echo "---logs---" && ' +
        'tail -30 /tmp/mol-api.log 2>/dev/null',
      1,
      '---logs---\ntail: cannot open /tmp/mol-api.log for reading\n',
    )
    expect(note).toContain('exit code 1')
    expect(note).toContain('tail')
    expect(note).toContain('tsc')
    expect(note).toContain('printed no errors')
  })

  it('reads an eslint tally and a filtered run at exit 0', () => {
    const note = pipelineExitCodeNote(
      'npx eslint src --max-warnings 0 | head -30',
      0,
      '✖ 3 problems (2 errors, 1 warning)\n',
    )
    expect(note).toContain('eslint')
    expect(note).toContain('3 lint problems')
  })

  it('reads a vitest tally and a filtered run at exit 0', () => {
    const note = pipelineExitCodeNote(
      'npx vitest run | tail -30',
      0,
      ' Test Files  1 failed | 2 passed (3)\n      Tests  2 failed | 5 passed (7)\n',
    )
    expect(note).toContain('vitest')
    expect(note).toContain('2 failing tests')
  })

  it('names a Playwright run behind a filter', () => {
    const note = pipelineExitCodeNote(
      'npx playwright test | tail -40',
      0,
      '  1 failed\n  12 passed (13)\n',
    )
    expect(note).toContain('playwright')
    expect(note).toContain('1 failing test')
  })
})

describe('pipelineExitCodeNote — shapes that must not fire', () => {
  it('a non-checker pipeline (`grep x | head`) with no checker output', () => {
    expect(
      pipelineExitCodeNote('grep -rn TODO src | head -20', 0, 'src/a.ts:3 TODO x\n'),
    ).toBeNull()
  })

  it('a pipe guarded by `set -o pipefail` reports the check’s own code', () => {
    expect(
      pipelineExitCodeNote(
        'set -o pipefail; npx tsc --noEmit 2>&1 | head -40',
        2,
        `${TSC_ERROR}\n`,
      ),
    ).toBeNull()
  })

  it('a pipefail guard set as a shell flag (`bash -o pipefail -c …`)', () => {
    expect(
      pipelineExitCodeNote(
        "bash -o pipefail -c 'npx tsc --noEmit 2>&1 | head -40'",
        0,
        `${TSC_ERROR}\n`,
      ),
    ).toBeNull()
  })

  it('a single command with no pipe', () => {
    expect(pipelineExitCodeNote('npx tsc --noEmit', 0, `${TSC_ERROR}\n`)).toBeNull()
  })

  it('a code and an output that agree — a real failure', () => {
    expect(pipelineExitCodeNote('npx tsc --noEmit 2>&1 | head -40', 2, `${TSC_ERROR}\n`)).toBeNull()
  })

  it('a code and an output that agree — a clean run', () => {
    expect(pipelineExitCodeNote('npx tsc --noEmit 2>&1 | head -40', 0, '')).toBeNull()
  })

  it('a non-zero code from a stage that is not a filter (the check itself failed early)', () => {
    expect(pipelineExitCodeNote('npx tsc --noEmit 2>&1 | tee /tmp/tsc.log', 1, '')).toBeNull()
  })

  it('a checker after the pipe, not before it', () => {
    expect(
      pipelineExitCodeNote('cat /tmp/tsc.log | npx tsc --noEmit', 0, `${TSC_ERROR}\n`),
    ).toBeNull()
  })
})
