/**
 * `BackgroundTasksStrip` cases: the strip above the composer listing the
 * commands the executor detached with `run_in_background` — what each one is
 * for, how long it has been running, and how it ended.
 *
 * The strip is PRESENTATIONAL: the tasks arrive whole as the `tasks` prop, so
 * the states are plain prop sets moved forward with `props` steps exactly the
 * way the chat's `background_task` events would update one task. Every case
 * that shows a running command pins `now` and fake timers: the elapsed time
 * reads `Date.now()` and a once-a-second tick counts it up, so both the
 * ticking itself and the moment it stops are compared step by step.
 *
 * @module
 */

import type { BackgroundTaskState } from '@molecule/app-ai-chat'

import type { FeatureComponentCases } from '../../spec.js'

/** The pinned epoch every timed case starts from (cases run in UTC). */
const NOW = 1_800_000_000_000

/**
 * A finished command: ran 90s, ended 30s before the pin — `done · 1m 0s`.
 */
const FINISHED: BackgroundTaskState = {
  id: 'mol-bg-f1',
  command: 'npm run e2e -- --project=chromium',
  status: 'succeeded',
  startedAt: NOW - 90_000,
  finishedAt: NOW - 30_000,
}

/** A failed command: exit 2 after 30s — `exit 2 · 30s`. */
const FAILED: BackgroundTaskState = {
  id: 'mol-bg-x1',
  command: 'npx tsc --noEmit',
  status: 'failed',
  exitCode: 2,
  startedAt: NOW - 45_000,
  finishedAt: NOW - 15_000,
}

/** A cancelled command: stopped by the person after 2m — `cancelled · 2m 0s`. */
const CANCELLED: BackgroundTaskState = {
  id: 'mol-bg-c1',
  command: 'npm run dev',
  status: 'cancelled',
  startedAt: NOW - 125_000,
  finishedAt: NOW - 5_000,
}

/** A command still running, started 45s before the pin — `running · 45s`. */
const RUNNING: BackgroundTaskState = {
  id: 'mol-bg-r1',
  command: 'npx vitest run packages/app',
  description: 'The app test suite',
  status: 'running',
  startedAt: NOW - 45_000,
}

/** `BackgroundTasksStrip`. */
export const backgroundTasksStripCases: FeatureComponentCases = {
  component: 'BackgroundTasksStrip',
  keyedLists: [
    {
      prop: 'tasks',
      selector: '[data-mol-id="chat-background-task"]',
      caseName: 'two finished commands render newest last',
    },
  ],
  cases: [
    // ── The empty strip ─────────────────────────────────────────────────────
    {
      name: 'no task was started renders nothing',
      props: { tasks: [] },
    },

    // ── The summary, per end state ──────────────────────────────────────────
    {
      name: 'one finished command counts as finished',
      props: { tasks: [FINISHED] },
    },
    {
      name: 'a failed command reports its exit code',
      props: { tasks: [FAILED] },
    },
    {
      name: 'a failed command without an exit code says exit 1',
      props: {
        tasks: [
          {
            id: 'mol-bg-x2',
            command: 'cargo check',
            description: 'Type-check the API',
            status: 'failed',
            startedAt: NOW - 10_000,
            finishedAt: NOW - 4_000,
          },
        ],
      },
    },
    {
      name: 'a failed command with exit code zero keeps the zero',
      props: {
        tasks: [
          {
            id: 'mol-bg-x4',
            command: 'npm run lint',
            status: 'failed',
            exitCode: 0,
            startedAt: NOW - 30_000,
            finishedAt: NOW - 10_000,
          },
        ],
      },
    },
    {
      name: 'one cancelled command says so',
      props: { tasks: [CANCELLED] },
    },
    {
      name: 'a finish earlier than the start clamps the elapsed time at zero',
      props: {
        tasks: [
          {
            id: 'mol-bg-f3',
            command: 'npm run build',
            status: 'succeeded',
            startedAt: NOW,
            finishedAt: NOW - 5_000,
          },
        ],
      },
    },
    {
      name: 'a cancelled command among finished ones counts the batch as finished',
      props: { tasks: [CANCELLED, FINISHED] },
    },
    {
      name: 'a failed command outranks a finished one in the summary',
      props: { tasks: [FINISHED, FAILED] },
    },
    {
      name: 'a running command outranks everything else in the summary',
      props: { tasks: [FINISHED, FAILED, CANCELLED, RUNNING] },
      now: NOW,
      fakeTimers: true,
    },

    // ── A row's own status ──────────────────────────────────────────────────
    {
      name: 'every status renders its own mark at once',
      props: { tasks: [FINISHED, FAILED, CANCELLED, RUNNING] },
      now: NOW,
      fakeTimers: true,
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-background-tasks-toggle"]' }],
    },
    {
      name: 'a described command shows its purpose above the raw command',
      props: {
        tasks: [
          {
            id: 'mol-bg-f2',
            command: 'docker build -t app .',
            description: 'Rebuild the container image',
            status: 'succeeded',
            startedAt: NOW - 20_000,
            finishedAt: NOW - 4_000,
          },
        ],
      },
    },
    {
      name: 'a command without a description stands in as its own purpose, with no code block',
      props: { tasks: [FINISHED] },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-background-tasks-toggle"]' }],
    },
    {
      name: 'an agent task renders like a command task',
      props: {
        tasks: [
          {
            id: 'mol-bg-a1',
            kind: 'agent',
            command: 'Summarize the captured context',
            status: 'succeeded',
            startedAt: NOW - 8_000,
            finishedAt: NOW - 2_000,
          },
          { ...FINISHED, kind: 'command' },
        ],
      },
    },

    // ── Observed output, never a percentage ─────────────────────────────────
    {
      name: 'measured output shows in the hint and the row without inventing a total',
      props: {
        tasks: [{ ...RUNNING, outputChars: 1024 }],
      },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'zero observed output still reports the count',
      props: {
        tasks: [{ ...RUNNING, description: undefined, outputChars: 0 }],
      },
      now: NOW,
      fakeTimers: true,
    },
    {
      name: 'a large output count groups its digits',
      props: {
        tasks: [
          {
            id: 'mol-bg-r2',
            command: 'npm run build',
            description: 'Rebuilding every package',
            status: 'running',
            startedAt: NOW - 12_000,
            outputChars: 1234567,
          },
        ],
      },
      now: NOW,
      fakeTimers: true,
    },

    // ── The elapsed time counts up ──────────────────────────────────────────
    {
      name: 'a running command counts up once a second',
      props: { tasks: [{ ...RUNNING, description: undefined }] },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 1000 },
        { type: 'advance', ms: 1000 },
      ],
    },
    {
      name: 'an advance shorter than a second does not tick',
      props: { tasks: [{ ...RUNNING, description: undefined }] },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 500 },
        { type: 'advance', ms: 500 },
        { type: 'advance', ms: 500 },
      ],
    },
    {
      name: 'the minute boundary switches to minutes and seconds',
      props: { tasks: [{ ...RUNNING, description: undefined, startedAt: NOW - 59_000 }] },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 1000 },
        { type: 'advance', ms: 1000 },
      ],
    },
    {
      name: 'two running commands count up together',
      props: {
        tasks: [
          { ...RUNNING, description: undefined, startedAt: NOW - 95_000 },
          { ...RUNNING, id: 'mol-bg-r3', command: 'npm run dev', startedAt: NOW - 10_000 },
        ],
      },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 1000 },
        { type: 'click', selector: '[data-mol-id="chat-background-tasks-toggle"]' },
      ],
    },
    {
      name: 'finishing the last command stops the counting',
      props: { tasks: [{ ...RUNNING, description: undefined }] },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 1000 },
        {
          type: 'props',
          props: {
            tasks: [
              {
                id: 'mol-bg-r1',
                command: 'npx vitest run packages/app',
                status: 'succeeded',
                startedAt: NOW - 45_000,
                finishedAt: NOW + 1000,
              },
            ],
          },
        },
        { type: 'advance', ms: 5000 },
      ],
    },
    {
      name: 'a second running command re-arms the count from its change, not the old phase',
      props: { tasks: [{ ...RUNNING, description: undefined }] },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 1000 },
        { type: 'advance', ms: 500 },
        {
          type: 'props',
          props: {
            tasks: [
              { ...RUNNING, description: undefined },
              { ...RUNNING, id: 'mol-bg-r4', command: 'npm run lint', startedAt: NOW + 1500 },
            ],
          },
        },
        { type: 'advance', ms: 500 },
        { type: 'advance', ms: 500 },
      ],
    },
    {
      name: 'unmount stops the counting',
      props: { tasks: [{ ...RUNNING, description: undefined }] },
      now: NOW,
      fakeTimers: true,
      interactions: [{ type: 'unmount' }, { type: 'advance', ms: 1000 }],
    },

    // ── The disclosure ──────────────────────────────────────────────────────
    {
      name: 'two finished commands render newest last',
      props: { tasks: [FINISHED, { ...FAILED, id: 'mol-bg-x3', command: 'npm run lint' }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-background-tasks-toggle"]' }],
    },
    {
      name: 'the toggle opens the list and the hint steps aside, twice over',
      props: { tasks: [{ ...RUNNING, outputChars: 2048 }] },
      now: NOW,
      fakeTimers: true,
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-background-tasks-toggle"]' },
        { type: 'click', selector: '[data-mol-id="chat-background-tasks-toggle"]' },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-renders every label through i18n',
      props: { tasks: [{ ...RUNNING, outputChars: 1024 }] },
      now: NOW,
      fakeTimers: true,
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                backgroundRunning: '{{count}} tâche en cours en arrière-plan',
                backgroundFailed: '{{count}} tâche en arrière-plan a échoué',
                backgroundCancelled: '{{count}} tâche en arrière-plan a été annulée',
                backgroundDone: '{{count}} tâche en arrière-plan terminée',
                backgroundElapsed: 'en cours · {{elapsed}}',
                backgroundExit: 'code {{code}} · {{elapsed}}',
                backgroundCancelledElapsed: 'annulée · {{elapsed}}',
                backgroundOk: 'terminée · {{elapsed}}',
                backgroundOutput: '{{count}} caractères produits',
              },
              work: {
                running: '{{count}} en cours',
                failed: '{{count}} échec',
                cancelled: '{{count}} annulée',
                finishedCount: '{{count}} terminée',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
