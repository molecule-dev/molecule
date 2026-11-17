/**
 * `PlanCard` cases: the working-plan strip above the composer, redrawn in
 * place on every `update_task_list` call. The card is PRESENTATIONAL — the
 * rows arrive whole as the `todos` prop — so the states are plain prop sets:
 * the three row marks (check circle, molecule spinner, empty ring), the
 * collapse toggle and the collapsed hint naming the step in flight, the
 * stopped/waiting marks for a turn that is not running, the all-done header
 * mark, a plan redraw in place, the light theme's marks, and a locale switch
 * re-labelling the strip. Rows carry their `priority` and are keyed by
 * position (the derived keyed-list cases mark them and re-pass the list equal
 * and reversed).
 *
 * The card is a part (React renders it inside ChatPanel without exporting
 * it), so the kit mounts it standalone: the tray chip's `chipLabel` and
 * `chipTitle` pass through with no DOM here — the tray is the work tray's own
 * surface.
 *
 * @module
 */

import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'

import type { FeatureComponentCases } from '../../spec.js'

/** The plan most cases share: one done, one in flight, one to do. */
const PLAN: TaskListRow[] = [
  { content: 'Write tests', status: 'completed', priority: 'high' },
  { content: 'Fix the card', status: 'in_progress', priority: 'high' },
  { content: 'Ship it', status: 'pending', priority: 'high' },
]

/** The same plan with every step done: the header's spinner swaps for a check. */
const PLAN_DONE: TaskListRow[] = PLAN.map((row) => ({ ...row, status: 'completed' }))

/** A plan nothing has started yet: empty rings only. */
const PLAN_TODO: TaskListRow[] = [
  { content: 'Write tests', status: 'pending' },
  { content: 'Ship it', status: 'pending' },
]

/** A shorter follow-up plan the redraw case swaps in. */
const PLAN_TWO: TaskListRow[] = [
  { content: 'Review the diff', status: 'in_progress' },
  { content: 'Reply to the review', status: 'pending' },
]

/** The strip's disclosure button (the transparent overlay over the header row). */
const TOGGLE = '[data-mol-id="task-list-toggle"]'

/** `PlanCard`. */
export const planCardCases: FeatureComponentCases = {
  component: 'PlanCard',
  keyedLists: [
    {
      prop: 'todos',
      selector: '[data-mol-id="task-list-row"]',
      caseName: 'the live plan marks rows: done, spinning, to do',
    },
  ],
  cases: [
    // ── The plan at rest ────────────────────────────────────────────────────
    {
      name: 'the live plan marks rows: done, spinning, to do',
      props: { todos: PLAN },
    },
    {
      name: 'an empty plan renders nothing',
      props: { todos: [] },
    },
    {
      name: 'a single-step plan spins its only row',
      props: { todos: [{ content: 'Only step', status: 'in_progress' }] },
    },
    {
      name: 'a plan not yet started shows empty rings',
      props: { todos: PLAN_TODO },
    },

    // ── The collapse toggle ─────────────────────────────────────────────────
    {
      name: 'a collapsed plan hints the step in flight and folds the rows away',
      props: { todos: PLAN },
      interactions: [{ type: 'click', selector: TOGGLE }],
    },
    {
      name: 'toggling twice unfolds the rows again',
      props: { todos: PLAN },
      interactions: [
        { type: 'click', selector: TOGGLE },
        { type: 'click', selector: TOGGLE },
      ],
    },
    {
      name: 'a collapsed plan with no step in flight hints nothing',
      props: { todos: PLAN_DONE },
      interactions: [{ type: 'click', selector: TOGGLE }],
    },

    // ── A turn that is not running ──────────────────────────────────────────
    {
      name: 'a stopped turn says the work stopped and stills the step',
      props: { todos: PLAN, live: false },
    },
    {
      name: 'a turn paused on a question waits for the person',
      props: { todos: PLAN, live: false, awaitingUser: true },
    },
    {
      name: 'a live turn ignores awaitingUser and keeps the step spinning',
      props: { todos: PLAN, awaitingUser: true },
    },

    // ── The plan moves ──────────────────────────────────────────────────────
    {
      name: 'a new plan redraws the strip in place',
      props: { todos: PLAN },
      interactions: [{ type: 'props', props: { todos: PLAN_TWO } }],
    },
    {
      name: 'completing the last step swaps the spinner for a check in place',
      props: { todos: PLAN },
      interactions: [{ type: 'props', props: { todos: PLAN_DONE } }],
    },

    // ── Chrome ──────────────────────────────────────────────────────────────
    {
      name: 'the light theme recolours the waiting mark',
      props: { todos: PLAN, live: false, awaitingUser: true },
      context: { theme: 'light' },
    },
    {
      name: 'a locale switch re-renders the label and the stopped note',
      props: { todos: PLAN, live: false },
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                taskListTitle: 'Plan de travail',
              },
              work: {
                plan: 'Plan {{done}}/{{total}}',
                stopped: 'Arrêté avant la fin',
                waiting: 'En attente de votre réponse',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
