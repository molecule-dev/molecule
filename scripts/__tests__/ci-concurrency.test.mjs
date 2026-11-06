/** The CI concurrency group: newer changes supersede older ones, the daily full run never cancels a change run. */
import fs from 'node:fs'
import path from 'node:path'

import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const workflow = load(fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8'))

/**
 * Expand the workflow's `${{ … }}` group for one event. The expressions used here (`==`, `&&`, `||`, string literals,
 * `github.*` properties) mean the same in JavaScript, so each one is evaluated as JavaScript.
 *
 * @param github - The `github` context fields the expression reads.
 * @returns The concurrency group GitHub would compute.
 */
function groupFor(github) {
  return workflow.concurrency.group.replace(/\$\{\{([^}]*)\}\}/g, (_, expression) =>
    String(new Function('github', `return (${expression})`)(github)),
  )
}

const base = { workflow: 'CI', ref: 'refs/heads/main' }

describe('ci.yml concurrency', () => {
  it('cancels an older run of the same kind', () => {
    expect(workflow.concurrency['cancel-in-progress']).toBe(true)
    expect(groupFor({ ...base, event_name: 'push' })).toBe(
      groupFor({ ...base, event_name: 'push' }),
    )
    expect(groupFor({ ...base, event_name: 'schedule' })).toBe(
      groupFor({ ...base, event_name: 'schedule' }),
    )
  })

  it('keeps the daily full run out of the push and pull-request group', () => {
    const push = groupFor({ ...base, event_name: 'push' })
    expect(groupFor({ ...base, event_name: 'schedule' })).not.toBe(push)
    expect(groupFor({ ...base, event_name: 'pull_request' })).toBe(push)
  })

  it('keeps branches apart', () => {
    expect(groupFor({ ...base, event_name: 'push', ref: 'refs/heads/other' })).not.toBe(
      groupFor({ ...base, event_name: 'push' }),
    )
  })
})
