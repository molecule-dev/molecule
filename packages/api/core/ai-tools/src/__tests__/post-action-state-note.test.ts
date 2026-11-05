import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { failureCausesNote, failuresByCause, TOOL_RESULT_CHARS } from '../utilities.js'

// Retained l1349 walk #26 (and #39): the click returned, but the reverse state never appeared.
const click = `await page.click('button.btn-primary:has-text("Unfavorite")');`
const wait = `await page.waitForSelector('button.btn-outline-primary:has-text("Favorite")');`
function failedState(action = click, waiting = wait, between = '// Wait for the button to update') {
  return [
    'Running 138 tests using 1 worker',
    'progress\n'.repeat(600),
    '  1) [chromium] › articles.spec.ts:139:3 › Articles › should unfavorite an article ───',
    '    TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.',
    '    Call log:',
    `      - waiting for locator('button.btn-outline-primary:has-text("Favorite")') to be visible`,
    '       at helpers/articles.ts:72',
    `      70 |   ${action}`,
    `      71 |   ${between}`,
    `    > 72 |   ${waiting}`,
    '         |              ^',
    '      73 | }',
    '        at unfavoriteArticle (/workspace/fixtures/realworld-spec/specs/e2e/helpers/articles.ts:72:14)',
    'progress\n'.repeat(600),
    '  1 failed',
    '    [chromium] › articles.spec.ts:139:3 › Articles › should unfavorite an article',
    '  72 passed (3.8m)',
  ].join('\n')
}

function expectStateDiagnosis(note: string | null, action = click) {
  expect(note).toContain(action.replace(/;$/, ''))
  expect(note).toContain('helpers/articles.ts:70')
  expect(note).toContain('pending')
  expect(note).toContain('guard')
  expect(note).toContain('queue')
  expect(note).toContain('delayed')
  expect(note).toContain('both directions')
  expect(note).toContain('If this is an optimistic toggle')
}

describe('completed click before a failed state wait', () => {
  it('keeps the l1349 action and pending-click diagnostic beside the failed reverse-state selector', () => {
    const note = failureCausesNote(failedState())
    expectStateDiagnosis(note)
    expect(note).toContain('button.btn-outline-primary:has-text("Favorite")')
    expect(note).toContain('articles.spec.ts:139')
    expect(note!.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
  })

  it.each([
    [
      `await tab.click('button.following:has-text("Unfollow")')`,
      `await tab.waitForSelector('button.follow:has-text("Follow")')`,
    ],
    [`await view.locator('.liked').click()`, `await view.locator('.unliked').waitFor()`],
    [
      `await screen.getByRole('switch', { name: 'Mute' }).click()`,
      `await screen.getByRole('switch', { name: 'Unmute' }).waitFor({ state: 'visible' })`,
    ],
    [
      `await tab.getByRole('button', { name: 'Unlike' }).click()`,
      `await expect(tab.getByRole('button', { name: 'Like' })).toBeVisible()`,
    ],
  ])('preserves the same evidence for a non-X1 control: %s', (action, waiting) => {
    expectStateDiagnosis(failureCausesNote(failedState(action, waiting)), action)
  })

  it('keeps the first failed attempt distinct from a different retry source frame', () => {
    const log = failedState().replace(
      '  1 failed',
      `    Retry #1 ───\n    TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.\n      70 | await page.click('button.other')\n      71 | // retry\n    > 72 | await page.waitForSelector('button.result')\n  1 failed`,
    )
    expectStateDiagnosis(failureCausesNote(log))
    expect(failureCausesNote(log)).not.toContain('button.other')
    expect(failuresByCause(log)[0].tests).toHaveLength(1)
  })

  it.each([
    ['no await', click.replace('await ', ''), wait, ''],
    ['conditional click', `if (ready) ${click}`, wait, ''],
    ['intervening operation', click, wait, `await page.goto('/other')`],
    ['intervening branch', click, wait, '} else {'],
    ['different page', click, wait.replace('page.', 'other.'), ''],
    ['negative assertion', click, `await expect(page.locator('.ready')).not.toBeVisible()`, ''],
    ['hidden state', click, `await page.waitForSelector('.ready', { state: 'hidden' })`, ''],
    [
      'quoted hidden state',
      click,
      `await page.waitForSelector('.ready', { "state": 'hidden' })`,
      '',
    ],
    ['unknown state', click, `await page.waitForSelector('.ready', { state: desiredState })`, ''],
    ['unknown wait options', click, `await page.waitForSelector('.ready', options)`, ''],
    ['spread wait options', click, `await page.waitForSelector('.ready', { ...options })`, ''],
    ['detached state', click, `await page.locator('.ready').waitFor({ state: 'detached' })`, ''],
    ['navigation wait', click, `await page.waitForURL('/other')`, ''],
    ['failed click', click, click, ''],
    ['multiple statements', `${click} await page.goto('/other');`, wait, ''],
    ['callback declaration', `const unused = async () => { ${click} }`, wait, ''],
  ])('does not infer a completed state action from %s', (_name, action, waiting, between) => {
    expect(failureCausesNote(failedState(action, waiting, between))).not.toContain(
      'optimistic toggle',
    )
  })

  it('does not join source lines across a missing portion of the code frame', () => {
    expect(failureCausesNote(failedState().replace('71 |', '69 |'))).not.toContain(
      'optimistic toggle',
    )
  })

  it('does not diagnose an unrelated exception thrown by the wait expression', () => {
    const log = failedState().replace(
      'TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.',
      'TypeError: page.waitForSelector is not a function',
    )
    expect(failureCausesNote(log)).not.toContain('optimistic toggle')
  })

  it('does not read a Timeout property in a TypeError as a timeout failure', () => {
    const log = failedState().replace(
      'TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.',
      'TypeError: Cannot read properties of undefined (reading Timeout)',
    )
    expect(failureCausesNote(log)).not.toContain('optimistic toggle')
  })

  it('leaves a body without a source frame as an unknown state transition', () => {
    const log = failedState()
      .split('\n')
      .filter((line) => !/^\s*(?:>\s*)?\d+\s*\|/.test(line))
      .join('\n')
    expect(failureCausesNote(log)).not.toContain('optimistic toggle')
  })

  it('preserves request exclusions and native flaky outcomes', () => {
    expect(failureCausesNote(failedState(), ['should unfavorite an article'])).toBeNull()
    expect(failureCausesNote(failedState().replace('  1 failed', '  1 flaky'))).toBeNull()
  })

  it.each(['exec_command', 'wait_for_task'])(
    'delivers the diagnosis through the real %s caller',
    async (name) => {
      const log = `${'progress\n'.repeat(1000)}${failedState()}\n${'progress\n'.repeat(1000)}`
      const backend: ExecutionBackend = {
        projectRoot: '/test',
        readFile: vi.fn(async (path) => (path.endsWith('.exit') ? '1\n' : log)),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        readDir: vi.fn(),
        run: vi.fn(async () => ({ stdout: log, stderr: '', exitCode: 1 })),
      }
      const tool = buildTools(backend).find((tool) => tool.name === name)!
      const result = (await tool.execute(
        name === 'exec_command'
          ? { command: 'npx playwright test --reporter=list' }
          : { taskId: 'mol-bg-state-review', timeout: 1 },
      )) as { note?: string }
      expectStateDiagnosis(result.note ?? null)
    },
  )
})
