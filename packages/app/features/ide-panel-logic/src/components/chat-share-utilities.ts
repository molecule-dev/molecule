/**
 * Pure helpers backing the `/share <role>` command and the header share button.
 *
 * `/share` creates a public share link for the current project by POSTing
 * `{ role }` to `POST /projects/:projectId/shares`. The backend (wired in the
 * host app) mints a slug-bearing link row and returns it; anyone who opens
 * `GET /share/:slug` is granted that role — a `viewer` link is an
 * unauthenticated read. Roles, least- to most-privileged: viewer, commenter,
 * editor, owner. The default — and the safest — role is `viewer`.
 *
 * These helpers parse the command, validate the role against the shared
 * contract, build the exact POST body, and resolve the copyable public URL from
 * the response. They are deterministic and side-effect free so they can be unit
 * tested without rendering or a backend. The role labels are English defaults
 * the component wraps in `t()` at render.
 *
 * @module
 */

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * Share roles, ordered least- to most-privileged. Mirrors the
 * `@molecule/api-resource-share` `SHARE_ROLES` contract; duplicated here (rather
 * than imported) because an `app-*` package may not import an `api-*` package
 * across the stack boundary.
 */
export const SHARE_ROLES = ['viewer', 'commenter', 'editor', 'owner'] as const

/** A role granted by a share link. */
export type ShareRole = (typeof SHARE_ROLES)[number]

/** The default (and safest) role when `/share` is run with no argument. */
export const DEFAULT_SHARE_ROLE: ShareRole = 'viewer'

/** Short English labels per role (the component wraps these in `t()` at render). */
export const SHARE_ROLE_LABELS: Record<ShareRole, string> = {
  viewer: 'Viewer — view only',
  commenter: 'Commenter — view & comment',
  editor: 'Editor — view & edit',
  owner: 'Owner — full access',
}

/** The `POST /projects/:projectId/shares` request body. */
export interface SharePayload {
  /** Role granted to anyone who opens the link. */
  role: ShareRole
}

/**
 * The `POST /projects/:projectId/shares` response — the created public link.
 * Mirrors the relevant fields of the `@molecule/api-resource-share` `ShareLink`.
 */
export interface ShareLinkResult {
  /** The link's unique id (used by the revoke route). */
  id?: string
  /** Opaque slug embedded in the public URL. */
  slug: string
  /** The role this link grants. */
  role: ShareRole
  /**
   * A fully-qualified share URL, when the backend supplies one. Preferred over
   * client-side construction so the canonical origin (e.g. a custom domain)
   * wins over the current page origin.
   */
  url?: string
  /** When the link expires, if ever (ISO 8601); absent/`null` = no expiry. */
  expiresAt?: string | null
  /** When the link was revoked (ISO 8601); absent/`null` = still active. */
  revokedAt?: string | null
  /** When the link was created (ISO 8601). */
  createdAt?: string
}

/**
 * The parsed result of a `/share` command:
 *
 * - `create` — POST a link at a valid role (`/share`, defaulting to `viewer`,
 *   or `/share <role>` with a recognized role).
 * - `invalid` — an unrecognized role argument was given (the caller shows usage).
 */
export type ShareCommand = { kind: 'create'; role: ShareRole } | { kind: 'invalid'; arg: string }

/**
 * Type guard for a valid {@link ShareRole} (case-insensitive callers should
 * lower-case first).
 *
 * @param value - The candidate value.
 * @returns `true` when `value` is one of the {@link SHARE_ROLES}.
 */
export function isShareRole(value: string): value is ShareRole {
  return (SHARE_ROLES as readonly string[]).includes(value)
}

/**
 * Parses a `/share [role]` command. Bare `/share` creates a link at the default
 * `viewer` role; `/share <role>` uses the named role when valid (any case); an
 * unrecognized role is reported as invalid so the caller can show usage. Returns
 * `null` when the input is not the `/share` command.
 *
 * @param input - The raw chat input.
 * @returns The parsed {@link ShareCommand}, or `null`.
 */
export function parseShareCommand(input: string): ShareCommand | null {
  const match = input.trim().match(/^\/share(?:\s+(.*))?$/i)
  if (!match) return null
  const arg = (match[1] ?? '').trim()
  if (arg === '') return { kind: 'create', role: DEFAULT_SHARE_ROLE }
  const lower = arg.toLowerCase()
  if (isShareRole(lower)) return { kind: 'create', role: lower }
  return { kind: 'invalid', arg }
}

/**
 * Builds the `POST /projects/:projectId/shares` body for a role.
 *
 * @param role - The role to grant (defaults to {@link DEFAULT_SHARE_ROLE}).
 * @returns The normalized share payload.
 */
export function buildSharePayload(role: ShareRole = DEFAULT_SHARE_ROLE): SharePayload {
  return { role }
}

/**
 * Resolves the copyable public URL for a created share link. Prefers the
 * backend-supplied `url` (canonical origin / custom domain); otherwise builds
 * `<origin>/share/<slug>` from the given origin, tolerating a trailing slash.
 *
 * @param result - The created link from the share endpoint.
 * @param origin - The current page origin (e.g. `window.location.origin`).
 * @returns The absolute, copyable share URL.
 */
export function buildShareUrl(result: ShareLinkResult, origin: string): string {
  if (result.url) return result.url
  const trimmedOrigin = origin.replace(/\/+$/, '')
  return `${trimmedOrigin}/share/${result.slug}`
}

/**
 * The localized picker label for a share role (the `ide.chat.share.role.<role>`
 * keys), through the CALLER's translate function so a framework port and a
 * live locale switch both get their own text. One literal `t()` call per
 * {@link ShareRole}, chosen by a switch exhaustive over the role union: a new
 * role in {@link SHARE_ROLES} fails to compile until it has a label. Each
 * `defaultValue` equals that role's {@link SHARE_ROLE_LABELS} entry, so the
 * English output is unchanged.
 *
 * @param t - The caller's translate function (React passes `useTranslation()`'s `t`).
 * @param role - The share role.
 * @returns The localized role label.
 */
export function shareRoleLabel(t: TranslateFunction, role: ShareRole): string {
  switch (role) {
    case 'viewer':
      return t('ide.chat.share.role.viewer', undefined, { defaultValue: 'Viewer — view only' })
    case 'commenter':
      return t('ide.chat.share.role.commenter', undefined, {
        defaultValue: 'Commenter — view & comment',
      })
    case 'editor':
      return t('ide.chat.share.role.editor', undefined, {
        defaultValue: 'Editor — view & edit',
      })
    case 'owner':
      return t('ide.chat.share.role.owner', undefined, { defaultValue: 'Owner — full access' })
  }
}

/**
 * The localized sentence saying what a link of the given role grants (the
 * `ide.chat.share.grants.<role>` keys), through the CALLER's translate
 * function. One literal `t()` call per {@link ShareRole}, exhaustive (see
 * {@link shareRoleLabel}); the role itself interpolates through `{{role}}`.
 *
 * @param t - The caller's translate function.
 * @param role - The role the link grants.
 * @returns The localized grants sentence.
 */
export function shareGrantsText(t: TranslateFunction, role: ShareRole): string {
  switch (role) {
    case 'viewer':
      return t(
        'ide.chat.share.grants.viewer',
        { role },
        {
          defaultValue: 'Anyone with this link can act as {{role}}.',
        },
      )
    case 'commenter':
      return t(
        'ide.chat.share.grants.commenter',
        { role },
        {
          defaultValue: 'Anyone with this link can act as {{role}}.',
        },
      )
    case 'editor':
      return t(
        'ide.chat.share.grants.editor',
        { role },
        {
          defaultValue: 'Anyone with this link can act as {{role}}.',
        },
      )
    case 'owner':
      return t(
        'ide.chat.share.grants.owner',
        { role },
        {
          defaultValue: 'Anyone with this link can act as {{role}}.',
        },
      )
  }
}

/**
 * The localized subheading shown under the share dialog's heading for a host
 * offering a single role (the `ide.chat.share.subheading.<role>` keys), through
 * the CALLER's translate function. One literal `t()` call per
 * {@link ShareRole}, exhaustive (see {@link shareRoleLabel}); the role
 * interpolates through `{{role}}`. The multi-role variant is the plain
 * `ide.chat.share.subheading` key the caller uses directly.
 *
 * @param t - The caller's translate function.
 * @param role - The single role the host grants.
 * @returns The localized subheading.
 */
export function shareSubheading(t: TranslateFunction, role: ShareRole): string {
  switch (role) {
    case 'viewer':
      return t(
        'ide.chat.share.subheading.viewer',
        { role },
        {
          defaultValue: 'Create a public link. Anyone with the link can act as {{role}}.',
        },
      )
    case 'commenter':
      return t(
        'ide.chat.share.subheading.commenter',
        { role },
        {
          defaultValue: 'Create a public link. Anyone with the link can act as {{role}}.',
        },
      )
    case 'editor':
      return t(
        'ide.chat.share.subheading.editor',
        { role },
        {
          defaultValue: 'Create a public link. Anyone with the link can act as {{role}}.',
        },
      )
    case 'owner':
      return t(
        'ide.chat.share.subheading.owner',
        { role },
        {
          defaultValue: 'Create a public link. Anyone with the link can act as {{role}}.',
        },
      )
  }
}
