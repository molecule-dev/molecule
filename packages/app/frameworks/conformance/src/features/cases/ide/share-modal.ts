/**
 * `ShareModal` cases.
 *
 * The `/share` dialog: a centered modal around {@link ShareLinkManager} that
 * offers only the roles the host grants, hosts the app's own sections below
 * the links (`children`) and closes on Escape, the backdrop and the Done
 * button. Every prop and branch the kit can drive is exercised here: the
 * defaults, the single- vs. multi-role subheading, `initialRole` (offered and
 * not), an empty `roles` list, the three permission gates (`canManage`,
 * `canCreate`, `canRevoke`) forwarded to the manager, `showLinks: false`, host
 * children, a bumped `refreshSignal`, creating a link through the manager
 * (`onCreated`), the loading and creating states, the manager's three failure
 * branches (a failed list falls back to offering create; a failed create and a
 * failed revoke each show their retry message — every failure logs a warning,
 * which the recording logger captures as a `logger.warn` call in the case's
 * calls), and closing through each of the three paths.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** A link the backend lists. */
const LINK = { id: 'l1', slug: 'abc123', role: 'viewer' as const }

/** `ShareModal`. */
export const shareModalCases: FeatureComponentCases = {
  component: 'ShareModal',
  cases: [
    // ── Defaults (the kit derives the pseudo-locale case from the first) ────
    {
      name: 'the share dialog',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'the loading state, then no link yet',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: {
        http: [{ method: 'GET', url: '/projects/p1/shares', data: [], defer: true }],
      },
      interactions: [{ type: 'http', method: 'GET', url: '/projects/p1/shares', data: [] }],
    },

    // ── The links section's states ──────────────────────────────────────────
    {
      name: 'an existing link shows its URL and revoke, not create',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
    },
    {
      name: 'creating a link hands it back to the host',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'POST', url: '/projects/p1/shares', data: LINK },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-create"]' }],
    },
    {
      name: 'the creating state before the mint answers',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'POST', url: '/projects/p1/shares', data: LINK, defer: true },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="share-create"]' },
        { type: 'http', method: 'POST', url: '/projects/p1/shares', data: LINK },
      ],
    },

    // ── The failure branches (each logs a warning the recording logger captures) ──
    {
      name: 'a failed list falls back to offering create',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: {
        http: [
          {
            method: 'GET',
            url: '/projects/p1/shares',
            networkError: 'the sandbox is unreachable',
          },
        ],
      },
    },
    {
      name: 'a failed create says so and offers create again',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'POST', url: '/projects/p1/shares', status: 500 },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-create"]' }],
    },
    {
      name: 'a failed revoke says so and keeps the link',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [LINK] },
          { method: 'DELETE', url: '/projects/p1/shares/l1', status: 500 },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-link-revoke-l1"]' }],
    },

    // ── Roles ───────────────────────────────────────────────────────────────
    {
      name: 'several granted roles are offered, the initial one picked',
      props: { projectId: 'p1', roles: ['viewer', 'editor'], initialRole: 'editor' },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'one granted role says what a link grants instead of implying a choice',
      props: { projectId: 'p1', roles: ['commenter'] },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'an initial role the host does not grant falls back to the first',
      props: { projectId: 'p1', roles: ['viewer', 'editor'], initialRole: 'owner' },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'an empty role list falls back to the default role',
      props: { projectId: 'p1', roles: [] },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },

    // ── The permission gates ────────────────────────────────────────────────
    {
      name: 'a read-only caller is told there is no link and cannot create one',
      props: { projectId: 'p1', canManage: false },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'a read-only caller sees an existing link but cannot revoke it',
      props: { projectId: 'p1', canManage: false },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
    },
    {
      name: 'a caller who may create but not revoke, with no link',
      props: { projectId: 'p1', canManage: false, canCreate: true },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'a caller who may revoke but not create, with a link',
      props: { projectId: 'p1', canManage: false, canCreate: false, canRevoke: true },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
    },

    // ── The links section hidden, and host content ──────────────────────────
    {
      name: 'showLinks false drops the link section and never lists links',
      props: { projectId: 'p1', showLinks: false },
      callbacks: ['onClose', 'onCreated'],
      children: [{ tag: 'div', attrs: { 'data-mol-id': 'host-section' }, children: ['extra'] }],
    },
    {
      name: 'host children render below the links',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      children: [{ tag: 'div', attrs: { 'data-mol-id': 'host-section' }, children: ['extra'] }],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },

    // ── Refresh ─────────────────────────────────────────────────────────────
    {
      name: 'a bumped refresh signal reloads the list',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'GET', url: '/projects/p1/shares', data: [LINK] },
        ],
      },
      interactions: [{ type: 'props', props: { refreshSignal: 1 } }],
    },

    // ── Closing ─────────────────────────────────────────────────────────────
    {
      name: 'the Done button closes the dialog',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-close"]' }],
    },
    {
      name: 'a click inside the dialog stays; a backdrop click closes',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="share-modal"]' },
        { type: 'click', selector: 'div[role="presentation"]:has(> [role="dialog"])' },
      ],
    },
    {
      name: 'escape closes the dialog; another key does not',
      props: { projectId: 'p1' },
      callbacks: ['onClose', 'onCreated'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
      interactions: [
        { type: 'keydown', selector: '[data-mol-id="share-modal"]', key: 'a' },
        { type: 'keydown', selector: '[data-mol-id="share-modal"]', key: 'Escape' },
      ],
    },
  ],
}
