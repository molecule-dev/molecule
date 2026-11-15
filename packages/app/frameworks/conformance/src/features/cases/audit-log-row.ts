/**
 * `@molecule/app-audit-log-row-react` cases: one audit / activity log row —
 * actor + action + target · timestamp, optional old→new delta and
 * environment / trace metadata, clickable with button keyboard semantics.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The plain, all-text entry every absent-branch case starts from. */
const base = {
  id: 'evt-001',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
}

/** `@molecule/app-audit-log-row-react`. */
export const auditLogRowFeature: FeatureCases = {
  package: '@molecule/app-audit-log-row-react',
  families: [
    {
      component: 'AuditLogRow',
      cases: [
        { name: 'actor, action and timestamp', props: { entry: { ...base } } },
        {
          name: 'target renders when present',
          props: { entry: { ...base, target: 'Invoice #1042' } },
        },
        {
          name: 'environment badge',
          props: { entry: { ...base, environment: 'prod' } },
        },
        {
          name: 'trace id',
          props: { entry: { ...base, traceId: 'trace-abc' } },
        },
        {
          name: 'old and new value delta',
          props: { entry: { ...base, oldValue: 'Draft', newValue: 'Sent' } },
        },
        {
          name: 'old value only',
          props: { entry: { ...base, oldValue: 'Draft' } },
        },
        {
          name: 'new value only',
          props: { entry: { ...base, newValue: 'Sent' } },
        },
        {
          name: 'full row with className',
          props: {
            entry: {
              id: 'evt-002',
              actor: 'bob',
              action: 'deleted',
              target: 'Payment #7',
              timestamp: '2 min ago',
              oldValue: 'pending',
              newValue: 'failed',
              environment: 'staging',
              traceId: 'tr-42',
            },
            className: 'parity-token',
          },
          callbacks: ['onClick'],
        },
        {
          name: 'node entry fields',
          props: {
            entry: {
              id: 'evt-003',
              actor: { $nodes: [{ tag: 'strong', children: ['carol'] }] },
              action: 'assigned',
              target: { $nodes: [{ tag: 'em', children: ['Ticket #5'] }] },
              timestamp: '11:45',
              oldValue: { $nodes: [{ tag: 's', children: ['dan'] }] },
              newValue: { $nodes: [{ tag: 'strong', children: ['erin'] }] },
              environment: { $nodes: [{ tag: 'span', children: ['dev'] }] },
              traceId: { $nodes: [{ tag: 'code', children: ['tr-7'] }] },
            },
          },
        },
        {
          name: 'click calls onClick',
          props: { entry: { ...base } },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="audit-log-row"]' }],
        },
        {
          name: 'enter key activates the row',
          props: { entry: { ...base } },
          callbacks: ['onClick'],
          interactions: [
            { type: 'keydown', selector: '[data-mol-id="audit-log-row"]', key: 'Enter' },
          ],
        },
        {
          name: 'space key activates the row',
          props: { entry: { ...base } },
          callbacks: ['onClick'],
          interactions: [{ type: 'keydown', selector: '[data-mol-id="audit-log-row"]', key: ' ' }],
        },
        {
          name: 'other keys are ignored',
          props: { entry: { ...base } },
          callbacks: ['onClick'],
          interactions: [
            { type: 'keydown', selector: '[data-mol-id="audit-log-row"]', key: 'a' },
            { type: 'keydown', selector: '[data-mol-id="audit-log-row"]', key: 'Tab' },
          ],
        },
        {
          name: 'not clickable without onClick',
          props: { entry: { ...base } },
          interactions: [
            { type: 'click', selector: '[data-mol-id="audit-log-row"]' },
            { type: 'keydown', selector: '[data-mol-id="audit-log-row"]', key: 'Enter' },
          ],
        },
        {
          name: 'entry replaced on a props change',
          props: { entry: { ...base } },
          interactions: [
            {
              type: 'props',
              props: {
                entry: { ...base, oldValue: 'queued', newValue: 'running', traceId: 'tr-9' },
              },
            },
          ],
        },
      ],
    },
  ],
}
