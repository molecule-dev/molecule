/**
 * `ShareLinkManager` cases.
 *
 * The component reflects a project's CURRENT public-link state: it lists the
 * project's links on mount, shows an existing link as a click-to-copy field
 * with a Revoke control, and offers Create (at the roles the host grants) only
 * when none exists. Every branch is exercised here: the loading state, both
 * list response shapes, a failed listing (falling back to the create offer),
 * create (pending, success, failure), revoke (pending, success, failure), a
 * link keyed by id vs. slug, backend-supplied URLs, revoked links being hidden,
 * the three permission gates (`canManage`, `canCreate`, `canRevoke`), the role
 * picker (offered, fallback, empty), a refresh signal, light theme, a narrow
 * viewport, a coarse pointer and a locale switch.
 *
 * The failure cases record cleanly: the component logs each failure through a
 * module-scope `getLogger`, and `@molecule/app-logger`'s loggers resolve the
 * provider bonded when they log, so the kit's recording logger receives each
 * one and records it as a `logger.warn` call — no console warning reaches React.
 *
 * The clipboard needs no branch: a copy click copies through
 * `copyTextWithFallback()` (`@molecule/app-clipboard`), which in jsdom (no
 * provider, no Clipboard API) resolves `false`, so the link row is unchanged —
 * the case below pins exactly that.
 *
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** A link the backend lists. */
const LINK = { id: 'l1', slug: 'abc123', role: 'viewer' as const }

/** A second link, so a list can hold more than one. */
const SECOND = { id: 'l2', slug: 'def456', role: 'editor' as const }

/** `ShareLinkManager`. */
export const shareLinkManagerCases: FeatureComponentCases = {
  component: 'ShareLinkManager',
  cases: [
    {
      name: 'loading, then no link yet',
      props: { projectId: 'p1' },
      context: {
        http: [{ method: 'GET', url: '/projects/p1/shares', data: [], defer: true }],
      },
      interactions: [{ type: 'http', method: 'GET', url: '/projects/p1/shares', data: [] }],
    },
    {
      name: 'no link yet, then create at the default role',
      props: { projectId: 'p1' },
      callbacks: ['onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'POST', url: '/projects/p1/shares', data: LINK },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-create"]' }],
    },
    {
      name: 'creating a link',
      props: { projectId: 'p1' },
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
    {
      name: 'a failed create shows the error message',
      props: { projectId: 'p1' },
      callbacks: ['onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          {
            method: 'POST',
            url: '/projects/p1/shares',
            networkError: 'the network is unreachable',
          },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-create"]' }],
    },
    {
      name: 'an existing link in the data envelope',
      props: { projectId: 'p1' },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: { data: [LINK] } }] },
    },
    {
      name: 'an existing link from a plain array, with the backend URL',
      props: { projectId: 'p1' },
      context: {
        http: [
          {
            method: 'GET',
            url: '/projects/p1/shares',
            data: [{ ...SECOND, url: 'https://share.example/def456' }],
          },
        ],
      },
    },
    {
      name: 'a revoked link is not listed',
      props: { projectId: 'p1' },
      context: {
        http: [
          {
            method: 'GET',
            url: '/projects/p1/shares',
            data: [LINK, { ...SECOND, revokedAt: '2026-01-02T03:04:05.000Z' }],
          },
        ],
      },
    },
    {
      name: 'a failed listing falls back to the create offer',
      props: { projectId: 'p1' },
      context: {
        http: [{ method: 'GET', url: '/projects/p1/shares', status: 500, data: { error: 'no' } }],
      },
    },
    {
      name: 'revoking a link',
      props: { projectId: 'p1' },
      callbacks: ['onRevoked'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [LINK] },
          { method: 'DELETE', url: '/projects/p1/shares/l1', data: {}, defer: true },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="share-link-revoke-l1"]' },
        { type: 'http', method: 'DELETE', url: '/projects/p1/shares/l1', data: {} },
      ],
    },
    {
      name: 'a failed revoke keeps the link and shows the error message',
      props: { projectId: 'p1' },
      callbacks: ['onRevoked'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [LINK] },
          { method: 'DELETE', url: '/projects/p1/shares/l1', status: 500, data: { error: 'no' } },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-link-revoke-l1"]' }],
    },
    {
      name: 'a read-only caller still sees and copies an existing link',
      props: { projectId: 'p1', canManage: false },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
    },
    {
      name: 'a copy click without a clipboard leaves the link row unchanged',
      props: { projectId: 'p1' },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-link-copy"]' }],
    },
    {
      name: 'a read-only caller is told there is no link',
      props: { projectId: 'p1', canManage: false },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'a caller who may create but not revoke, with no link',
      props: { projectId: 'p1', canManage: false, canCreate: true },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'a caller who may create but not revoke, with a link',
      props: { projectId: 'p1', canManage: false, canCreate: true },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
    },
    {
      name: 'a caller who may revoke but not create, with a link',
      props: { projectId: 'p1', canManage: false, canRevoke: true, canCreate: false },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
    },
    {
      name: 'a caller who may revoke but not create, without a link',
      props: { projectId: 'p1', canManage: false, canRevoke: true, canCreate: false },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'several roles, the initial one offered, then another picked',
      props: { projectId: 'p1', roles: ['viewer', 'editor'], initialRole: 'editor' },
      callbacks: ['onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'POST', url: '/projects/p1/shares', data: LINK },
        ],
      },
      interactions: [
        { type: 'input', selector: '[data-mol-id="share-role"]', value: 'viewer' },
        { type: 'click', selector: '[data-mol-id="share-create"]' },
      ],
    },
    {
      name: 'an initial role the host does not offer falls back to the first',
      props: { projectId: 'p1', roles: ['commenter', 'owner'], initialRole: 'editor' },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'an empty role list falls back to the default role',
      props: { projectId: 'p1', roles: [] },
      callbacks: ['onCreated'],
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'POST', url: '/projects/p1/shares', data: LINK },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="share-create"]' }],
    },
    {
      name: 'a refresh signal reloads the list',
      props: { projectId: 'p1' },
      context: {
        http: [
          { method: 'GET', url: '/projects/p1/shares', data: [] },
          { method: 'GET', url: '/projects/p1/shares', data: [LINK] },
        ],
      },
      interactions: [{ type: 'props', props: { refreshSignal: 1 } }],
    },
    {
      name: 'a link without an id is keyed by its slug and cannot be revoked',
      props: { projectId: 'p1' },
      context: {
        http: [
          {
            method: 'GET',
            url: '/projects/p1/shares',
            data: [{ slug: 'abc123', role: 'viewer' }],
          },
        ],
      },
    },
    {
      name: 'light theme',
      props: { projectId: 'p1' },
      context: {
        theme: 'light',
        http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }],
      },
    },
    {
      name: 'narrow viewport',
      props: { projectId: 'p1' },
      viewportWidth: 390,
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [LINK] }] },
    },
    {
      name: 'coarse pointer',
      props: { projectId: 'p1', roles: ['viewer', 'editor'] },
      pointer: 'coarse',
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
    {
      name: 'no link, then a locale switch',
      props: { projectId: 'p1' },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
      interactions: [{ type: 'locale', locale: 'en-XA' }],
    },
  ],
}
