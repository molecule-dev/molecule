/**
 * `ReportModal` cases: the `/report` dialog's every state — the defaults and
 * each prop variant (product name, preset title, conversation id, app
 * version), filling the form field by field, the checkbox, submitting against
 * deferred, answering and failing HTTP replies, the error text, Escape and
 * the backdrop versus the dialog, the dark theme, the phone viewport, the
 * coarse pointer, and a locale switch.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The answer a successful report POST returns. */
const REPORT_OK = { ok: true, id: 'r7', url: 'https://github.com/molecule-dev/molecule/issues/7' }

/** `ReportModal`. */
export const reportModalCases: FeatureComponentCases = {
  component: 'ReportModal',
  cases: [
    // ── Defaults (the kit derives the pseudo-locale case from the first) ────
    { name: 'an empty report', props: { projectId: 'p1' }, callbacks: ['onClose', 'onSubmitted'] },

    // ── The props ───────────────────────────────────────────────────────────
    {
      name: 'a custom product name and a preset title',
      props: { projectId: 'p1', productName: 'Molecule', initialTitle: 'Typing lags' },
      callbacks: ['onClose', 'onSubmitted'],
    },
    {
      name: 'a later initialTitle prop never reseeds the title',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      interactions: [
        { type: 'input', selector: '[data-mol-id="report-title"]', value: 'typed by hand' },
        { type: 'props', props: { initialTitle: 'preset later' } },
      ],
    },

    // ── Filling and submitting ──────────────────────────────────────────────
    {
      name: 'clicking submit while the form is invalid does nothing',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      interactions: [{ type: 'click', selector: '[data-mol-id="report-submit"]' }],
    },
    {
      name: 'a full report POSTs to the project route with the conversation and hands the result back',
      props: { projectId: 'p1', conversationId: 'c1', appVersion: '1.2.3' },
      callbacks: ['onClose', 'onSubmitted'],
      context: {
        http: [
          {
            method: 'POST',
            url: '/projects/p1/report?conversationId=c1',
            status: 200,
            data: REPORT_OK,
            defer: true,
          },
        ],
      },
      interactions: [
        { type: 'input', selector: '[data-mol-id="report-title"]', value: 'Preview stays blank' },
        {
          type: 'input',
          selector: '[data-mol-id="report-description"]',
          value: 'It never comes back after hibernating.',
        },
        {
          type: 'input',
          selector: '[data-mol-id="report-steps"]',
          value: '1. Open the IDE\n2. Wait',
        },
        { type: 'check', selector: '[data-mol-id="report-include-chat"]', checked: false },
        { type: 'click', selector: '[data-mol-id="report-submit"]' },
        {
          type: 'http',
          method: 'POST',
          url: '/projects/p1/report?conversationId=c1',
          status: 200,
          data: REPORT_OK,
        },
      ],
    },
    {
      name: 'a report without a conversation POSTs to the bare project route',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      context: {
        http: [
          { method: 'POST', url: '/projects/p1/report', status: 200, data: { ok: true, id: 'r1' } },
        ],
      },
      interactions: [
        { type: 'input', selector: '[data-mol-id="report-title"]', value: 't' },
        { type: 'input', selector: '[data-mol-id="report-description"]', value: 'd' },
        { type: 'click', selector: '[data-mol-id="report-submit"]' },
      ],
    },
    // ── Closing ─────────────────────────────────────────────────────────────
    {
      name: 'escape closes the modal; another key does not',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      interactions: [
        { type: 'keydown', selector: '[data-mol-id="report-title"]', key: 'a' },
        { type: 'keydown', selector: '[data-mol-id="report-title"]', key: 'Escape' },
      ],
    },
    {
      name: 'a click inside the dialog stays; a backdrop click closes',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="report-modal"]' },
        { type: 'click', selector: '[data-mol-id="report-modal-backdrop"]' },
      ],
    },

    // ── Theme, viewport, pointer ────────────────────────────────────────────
    {
      name: 'the dark theme draws light field borders',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      context: { theme: 'dark' },
    },
    {
      name: 'a narrow viewport grows the fields to 16px',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      viewportWidth: 390,
    },
    {
      name: 'a coarse pointer grows the fields to 16px',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onSubmitted'],
      pointer: 'coarse',
    },
  ],
}
