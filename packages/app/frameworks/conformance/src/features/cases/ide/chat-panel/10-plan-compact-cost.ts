/**
 * `ChatPanel` cases: /plan, /compact and /cost. Every case name starts with `plan and compact: `.
 *
 * The three commands are dispatched from the slash-command menu (type the command, Enter runs
 * the one row the filter left) and each answers in the timeline as a local system card:
 *
 * - /plan toggles the conversation mode and persists it with a PATCH to the project's
 *   chat-mode route; a failed persist logs why and reverts the toggle.
 * - /compact POSTs the project's compact route and reports how many messages it compacted,
 *   that none were needed, or that the request failed.
 * - /cost GETs the project's chat-usage route and renders the model's token totals, plus the
 *   cached-input line, the allowance line (today's or the billing period's, used-up included),
 *   and the streaming note as the payload names them.
 *
 * The panel starts in execute mode; a history load whose meta carries `mode: 'plan'` starts it
 * in plan mode, which is how the plan → execute direction of /plan is reached.
 *
 * @module
 */

import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import { base, CONV_HTTP, key, type } from './fixtures.js'

/** The usage answer a `/cost` case scripts, shaped like `GET /projects/p1/chat-usage`. */
const usage = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  model: 'm-pro',
  inputTokens: 1234,
  outputTokens: 567,
  ...extra,
})

/** Runs one slash command the way the menu does: type it, Enter executes the filtered row. */
const run = (command: string): Interaction[] => [type(command), key('Enter')]

/** The saved conversation a mount resumes (`mol-chat-conv:p1` in localStorage). */
const SAVED_CONV = { 'mol-chat-conv:p1': 'c1' }

/** A history load that reports a plan-mode conversation, so the panel mounts in plan mode. */
const PLAN_MODE = { areas: { chat: { meta: [{ mode: 'plan' }] } } }

/** The chat-mode persist a successful `/plan` case scripts. */
const MODE_PATCH = { method: 'PATCH', url: '/projects/p1/chat-mode', data: { ok: true } }

/** /plan, /compact and /cost. */
export const planCompactCostCases: FeatureCase[] = [
  // ── /plan ───────────────────────────────────────────────────────────────────
  base('plan and compact: /plan switches the panel into plan mode', run('/plan'), {
    http: [MODE_PATCH],
  }),
  base(
    'plan and compact: /plan switches a plan-mode conversation back to execute mode',
    run('/plan'),
    { context: PLAN_MODE, http: [MODE_PATCH] },
  ),
  base('plan and compact: a failed mode persist reverts the switch', run('/plan'), {
    context: PLAN_MODE,
    http: [{ method: 'PATCH', url: '/projects/p1/chat-mode', status: 500 }],
  }),

  // ── /compact ────────────────────────────────────────────────────────────────
  base('plan and compact: /compact reports how many messages it compacted', run('/compact'), {
    http: [{ method: 'POST', url: '/projects/p1/compact', data: { compactedCount: 3 } }],
  }),
  base('plan and compact: /compact on low context usage says none was needed', run('/compact'), {
    http: [{ method: 'POST', url: '/projects/p1/compact', data: { compactedCount: 0 } }],
  }),
  base('plan and compact: a failed compaction reports the failure', run('/compact'), {
    http: [{ method: 'POST', url: '/projects/p1/compact', status: 500 }],
  }),
  base('plan and compact: /compact names the open conversation in its request', run('/compact'), {
    context: { window: { localStorage: SAVED_CONV } },
    http: [
      {
        method: 'POST',
        url: '/projects/p1/compact?conversationId=c1',
        data: { compactedCount: 1 },
      },
      ...CONV_HTTP('c1'),
    ],
  }),

  // ── /cost ───────────────────────────────────────────────────────────────────
  base('plan and compact: /cost shows the model and its token totals', run('/cost'), {
    http: [{ method: 'GET', url: '/projects/p1/chat-usage', data: usage() }],
  }),
  base(
    'plan and compact: /cost adds the cached-input line when the provider cached prompt tokens',
    run('/cost'),
    {
      http: [
        {
          method: 'GET',
          url: '/projects/p1/chat-usage',
          data: usage({ cacheReadInputTokens: 1200, cacheCreationInputTokens: 300 }),
        },
      ],
    },
  ),
  base("plan and compact: /cost shows the share of today's allowance", run('/cost'), {
    http: [
      { method: 'GET', url: '/projects/p1/chat-usage', data: usage({ allowancePercent: 42 }) },
    ],
  }),
  base('plan and compact: /cost shows the share of a billing-period allowance', run('/cost'), {
    http: [
      {
        method: 'GET',
        url: '/projects/p1/chat-usage',
        data: usage({ allowancePercent: 42, allowanceWindow: 'billing-period' }),
      },
    ],
  }),
  base('plan and compact: a used-up daily allowance says when it refreshes', run('/cost'), {
    http: [
      {
        method: 'GET',
        url: '/projects/p1/chat-usage',
        data: usage({ allowancePercent: 100, allowanceResetAt: 1_700_001_800_000 }),
      },
    ],
  }),
  base(
    'plan and compact: a used-up billing-period allowance says when it refreshes',
    run('/cost'),
    {
      http: [
        {
          method: 'GET',
          url: '/projects/p1/chat-usage',
          data: usage({
            allowancePercent: 100,
            allowanceResetAt: 1_700_001_800_000,
            allowanceWindow: 'billing-period',
          }),
        },
      ],
    },
  ),
  base("plan and compact: a streaming response's usage is marked a running total", run('/cost'), {
    http: [{ method: 'GET', url: '/projects/p1/chat-usage', data: usage({ streaming: true }) }],
  }),
  base('plan and compact: a failed usage request says the data is unavailable', run('/cost'), {
    http: [{ method: 'GET', url: '/projects/p1/chat-usage', status: 500 }],
  }),
  base('plan and compact: /cost names the open conversation in its request', run('/cost'), {
    context: { window: { localStorage: SAVED_CONV } },
    http: [
      { method: 'GET', url: '/projects/p1/chat-usage?conversationId=c1', data: usage() },
      ...CONV_HTTP('c1'),
    ],
  }),
]
