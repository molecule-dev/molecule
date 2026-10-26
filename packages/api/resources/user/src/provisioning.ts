/**
 * Programmatic user provisioning for trusted server code.
 *
 * `provisionUser(resource, input)` writes the `users` row AND its same-id `usersSecrets` row
 * through the bonded database and password providers, so a seed script, a migration, or a
 * service-account bootstrap never hand-writes the two-table credential plumbing:
 *
 * - **One id keys BOTH rows.** `usersSecrets.id` IS the user's id. A credential row written
 *   under another id inserts fine and is then never found again — login answers "invalid
 *   credentials" while `GET /users/me` still answers 200.
 * - **Props are validated ONCE, before the identity lookup.** The resource schema does the
 *   parsing, including any `transform`/`default` a caller's schema adds
 *   (`createSchema().extend({ username: z.string().toLowerCase() })`). The account is looked up
 *   by the value the schema actually produces, and that same value is what gets stored — so two
 *   `EDITOR` provisioning calls find one `editor` account instead of inserting a second row.
 * - **No session.** No device row, no JWT, no `authorization.set`: provisioning an account
 *   never signs anyone in, and the caller keeps whatever auth flow it already has.
 * - **No password unless you supply one.** Omit `password` for a content author or service
 *   account that must not be able to log in — the credential row is written WITHOUT a
 *   `passwordHash` (the OAuth-only shape `logIn` refuses a password for). Nothing is generated,
 *   nothing is returned, and there is no default password.
 * - **Idempotent by username or email.** An account that already exists is answered
 *   `{ status: 'existing' }` and nothing is written — credentials included: a supplied password
 *   is applied only to the row THIS call creates, never to an existing account. (A seed whose
 *   email matches a real user's must never hand over that account.)
 * - **Atomic where the database supports it.** The two writes run inside
 *   `withTransaction()`, so a bond with interactive transactions (SQLite, PostgreSQL, MySQL)
 *   commits both rows or neither. On a bond without them (Cloudflare D1, where
 *   `pool.transaction` is absent) the writes are sequential and a failed second write leaves the
 *   user row in place; that case is answered by a distinct `{ status: 'partial', id, recovery }`
 *   result, and `provisionUser(resource, { props, password, completeId: id })` completes it. A
 *   retry WITHOUT `completeId` answers `existing` and does NOT repair anything (password reset
 *   cannot either: it updates the `usersSecrets` row, which does not exist).
 *
 * TRUSTED SERVER CALLERS ONLY. This is not a request handler: it takes props directly and
 * validates them against the resource schema, so mounting it on a route would be a
 * mass-assignment hole. Create accounts from a seed or migration on the server — never from a
 * public endpoint.
 *
 * @example
 * ```ts
 * import { provisionUser } from '@molecule/api-resource-user'
 *
 * // A content-only author: no password is stored and no login is possible.
 * const author = await provisionUser(
 *   { name: 'User', tableName: 'users' },
 *   { props: { username: 'editor', name: 'Editorial Team' } },
 * )
 * if (author.status === 'failed') throw new Error(author.error)
 * if (author.status === 'partial') {
 *   // The id is the proof of ownership; the props identify the same account.
 *   await provisionUser(
 *     { name: 'User', tableName: 'users' },
 *     { props: { username: 'editor' }, completeId: author.id },
 *   )
 * }
 * const authorId = author.id // stable across re-runs: the second call says 'existing'
 *
 * // A service account that may actually sign in (password from the environment, never a literal).
 * await provisionUser(
 *   { name: 'User', tableName: 'users' },
 *   { props: { username: 'sync-service', email: 'sync@example.com' }, password: process.env.SYNC_PASSWORD },
 * )
 * ```
 *
 * @module
 */

import { v4 as uuid } from 'uuid'
import type { ZodSchema } from 'zod'

import { getLogger } from '@molecule/api-bond'
import type { WhereCondition } from '@molecule/api-database'
import {
  create as storeCreate,
  findById,
  findOne,
  getPool,
  hasPool,
  updateMany,
  withTransaction,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { hash } from '@molecule/api-password'
import { utilities } from '@molecule/api-resource'

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, propsSchema } from './schema.js'
import type * as types from './types.js'
import { normalizeEmail } from './utilities/normalizeEmail.js'
import { stripSensitiveUserColumns } from './utilities/stripSensitiveUserColumns.js'
import { USERNAME_RE } from './utilities/username.js'

const logger = getLogger()

/** Longest username `provisionUser` will store, matching the signup handler's cap. */
const MAX_USERNAME_LENGTH = 255

/** Longest email `provisionUser` will store, matching the signup handler's cap. */
const MAX_EMAIL_LENGTH = 1023

/** A row as the bonded DataStore returns it. */
type Row = Record<string, unknown> & { id: string }

/** The sanitized user props a result carries (secret columns removed). */
type SafeProps = types.Props & Record<string, unknown>

/**
 * Safe user props accepted by {@link provisionUser} — the `users` table's columns without the
 * server-controlled `id` / `createdAt` / `updatedAt` (this call sets those).
 *
 * The index signature lets an app pass the extra columns of its OWN resource schema
 * (`handlerResource.schema`); the schema still decides what is kept.
 */
export type ProvisionUserProps = Omit<types.Props, 'createdAt' | 'id' | 'updatedAt'> &
  Record<string, unknown>

/**
 * Input accepted by {@link provisionUser}.
 */
export interface ProvisionUserInput {
  /**
   * The account's SAFE props (`username`, `name`, `email`, `bio`, …). Validated by the
   * resource schema; never a secret column. At least one of `username` / `email` is required —
   * that pair is what makes repeated provisioning find the account it created.
   */
  props: ProvisionUserProps
  /**
   * Optional plaintext password for an account that must be able to sign in. OMIT it for a
   * content author or service account that must not log in: no hash is written, and `logIn`
   * refuses password authentication for the account. The value is hashed through the bonded
   * password provider and never stored, logged, or returned.
   */
  password?: string
  /**
   * Completes a provisioning that returned `{ status: 'partial' }`: the exact `id` from that
   * result, which is the proof that this caller created the account. The supplied `props` must
   * identify that same account, it must not be OAuth-linked, and it must not already carry a
   * stored password (an existing password is never overwritten). A concurrent completion or a
   * password reset that already wrote a hash is reported as `existing`, never replaced. Omit this
   * for a normal call.
   */
  completeId?: string
}

/**
 * Why {@link provisionUser} could not complete.
 */
export type ProvisionUserFailureReason =
  /** Neither `props.username` nor `props.email` was supplied, so no account can be found on a re-run. */
  | 'identityRequired'
  /** `props.username` breaks the signup rule (letters, digits, dots, hyphens, underscores). */
  | 'invalidUsername'
  /** `password` is outside the signup bounds (8–1024 characters). */
  | 'invalidPassword'
  /** The datastore could not answer "does this account already exist" (or could not read its credentials). */
  | 'lookupFailed'
  /** `username` and `email` resolve to two DIFFERENT existing accounts. */
  | 'conflict'
  /** The props failed the resource schema, so nothing was written. */
  | 'invalidProps'
  /** The `users` insert reported no affected row and no racing account was found. */
  | 'userNotCreated'
  /** The user row was written but its `usersSecrets` row (or the password hash) failed. */
  | 'credentialsFailed'
  /** `completeId` names no account in this resource's table. */
  | 'completeTargetMissing'
  /** The supplied username/email does not identify the account named by `completeId`. */
  | 'completeIdentityMismatch'
  /** The account named by `completeId` has an OAuth identity, so its credentials are not ours to add. */
  | 'completeNotOwned'

/**
 * The outcome of a {@link provisionUser} call.
 *
 * `created`, `completed` and `existing` carry the account's id (the value of `usersSecrets.id`)
 * and its sanitized `users` row. `partial` says the user row was written and its credential row
 * was not; `failed` says the call did not complete (and carries `id` only when a user row it
 * wrote may still exist).
 */
export type ProvisionUserResult =
  | {
      /** The account was created by this call. */
      status: 'created'
      /** The user id — the same value stored as `usersSecrets.id`. */
      id: string
      /** The sanitized user row (`users` columns; secret columns stripped). */
      props: SafeProps
      /** Whether a password credential was stored for this new account. */
      hasPassword: boolean
    }
  | {
      /** A partial provisioning named by `completeId` was finished by this call. */
      status: 'completed'
      /** The existing account's id. */
      id: string
      /** The existing account's sanitized user row. */
      props: SafeProps
      /** Whether a password credential is stored for the account now. */
      hasPassword: boolean
    }
  | {
      /** The account already existed for the supplied username/email; nothing was written. */
      status: 'existing'
      /** The existing account's id. */
      id: string
      /** The existing account's sanitized user row. */
      props: SafeProps
      /** Whether the EXISTING account has a stored password hash (never the hash itself). */
      hasPassword: boolean
    }
  | {
      /** The user row was written; its credential row was not. */
      status: 'partial'
      /** The step that failed. */
      reason: 'credentialsFailed'
      /** A stable, translated key for the failure (switch on `reason`, not on `error`). */
      errorKey: string
      /** Diagnostic text for the server log — not a client-facing string. */
      error: string
      /** The id of the account this call created. Pass it back as `completeId` to finish it. */
      id: string
      /**
       * What completing the row needs: whether the original call supplied a password (so the
       * caller knows to supply it again — the plaintext was never stored).
       */
      recovery: { id: string; passwordRequired: boolean }
    }
  | {
      /** Provisioning did not complete and left no row this call wrote. */
      status: 'failed'
      /** Which step failed. */
      reason: ProvisionUserFailureReason
      /** A stable, translated key for the failure (switch on `reason`, not on `error`). */
      errorKey: string
      /** Diagnostic text for the server log — not a client-facing string. */
      error: string
      /**
       * Present when a user row this call wrote may still exist, or when this call was completing
       * the account named by `completeId` (so the caller can retry the same id).
       */
      id?: string
    }

/**
 * Builds a `failed` result, omitting `id` when this call wrote no user row.
 * @param reason - Which step failed.
 * @param errorKey - The stable error key.
 * @param error - The diagnostic message.
 * @param id - The id of a user row this call created, when one exists.
 * @returns The failure result.
 */
const failed = (
  reason: ProvisionUserFailureReason,
  errorKey: string,
  error: string,
  id?: string,
): ProvisionUserResult => {
  const failure = { status: 'failed' as const, reason, errorKey, error }

  return id ? { ...failure, id } : failure
}

/**
 * Turns a thrown value into the diagnostic string a result carries.
 * @param error - The thrown value.
 * @returns The message, or a stringified value.
 */
const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Whether the bonded database can run the two writes in one transaction.
 *
 * `withTransaction()` throws on Cloudflare D1, whose pool deliberately leaves `transaction`
 * undefined; the shared API documents that check. A store bonded without a pool has the same
 * sequential shape.
 * @returns `true` when `withTransaction()` will work here.
 */
const supportsTransactions = (): boolean => {
  if (!hasPool()) return false

  try {
    return typeof getPool().transaction === 'function'
  } catch (_error) {
    // `hasPool()` said a pool exists, so a throw here means the bond is unusable; refusing the
    // transaction is the safe answer and the sequential path reports the real failure.
    return false
  }
}

/**
 * Reads an existing account's credential row and answers `existing`.
 *
 * Reads only whether a `passwordHash` is present — never the hash, and never a write.
 * @param tableName - The users table name (its secrets table is `${tableName}Secrets`).
 * @param row - The existing `users` row.
 * @returns An `existing` result, or a `lookupFailed` result when the credential row cannot be read.
 */
const existingAccount = async (tableName: string, row: Row): Promise<ProvisionUserResult> => {
  let secrets: { id: string; passwordHash?: string | null } | null
  try {
    secrets = await findById<{ id: string; passwordHash?: string | null }>(
      `${tableName}Secrets`,
      row.id,
    )
  } catch (error) {
    logger.error('Failed to read a user credential row while provisioning', {
      error,
      userId: row.id,
    })
    return failed(
      'lookupFailed',
      'user.error.failedToReadUser',
      t('user.error.failedToReadUser'),
      row.id,
    )
  }

  return {
    status: 'existing',
    id: row.id,
    props: stripSensitiveUserColumns(row) as unknown as SafeProps,
    hasPassword: Boolean(secrets?.passwordHash),
  }
}

/**
 * The condition that matches ONLY the hashless credential state this call observed.
 *
 * A real bond returns `null` for a NULL column (SQLite, D1, PostgreSQL and MySQL alike), while an
 * abstract provider may omit the key entirely; both mean SQL `IS NULL`. Any other falsy value is
 * matched by equality, so an empty string is a distinct observed state rather than silently
 * treated as NULL — the conditional write then replaces exactly what was read, or nothing.
 * @param observed - The `passwordHash` value read from the credential row.
 * @returns The `passwordHash` filter for a compare-and-swap update.
 */
const observedHashlessCondition = (observed: unknown): WhereCondition =>
  observed === undefined || observed === null
    ? { field: 'passwordHash', operator: 'is_null' }
    : { field: 'passwordHash', operator: '=', value: observed }

/**
 * Finishes a provisioning this caller started: writes the credential row a `partial` result
 * could not, or adds the password the caller tried to store.
 *
 * The `id` is the ownership proof — only the call that created the row has it. The account must
 * still be identified by the supplied props and must not be OAuth-linked, and a stored password
 * is NEVER replaced (an account that already has one is answered `existing`).
 *
 * The credential write is CONDITIONAL on the state this call read (a compare-and-swap through the
 * shared `updateMany`): a concurrent completion, or a password reset, that wrote a hash while this
 * call was hashing makes the condition match no row, so that credential survives. The result then
 * reports the state that is actually stored — `completed` is only ever returned for a write THIS
 * call made.
 * @param tableName - The users table name (its secrets table is `${tableName}Secrets`).
 * @param completeId - The id from the earlier `partial` result.
 * @param username - The validated username the caller supplied, if any.
 * @param email - The normalized email the caller supplied, if any.
 * @param password - The password to store, when the account should be able to sign in.
 * @returns A `completed` result (or `existing` when there is nothing to write), else a typed failure.
 */
const completeProvisioning = async ({
  tableName,
  completeId,
  username,
  email,
  password,
}: {
  tableName: string
  completeId: string
  username: string | undefined
  email: string | undefined
  password: string | undefined
}): Promise<ProvisionUserResult> => {
  let row: Row | null
  try {
    row = await findById<Row>(tableName, completeId)
  } catch (error) {
    logger.error('Failed to read the account named by completeId', { error, userId: completeId })
    return failed('lookupFailed', 'user.error.failedToReadUser', t('user.error.failedToReadUser'))
  }

  if (!row) {
    return failed(
      'completeTargetMissing',
      'user.error.badRequest',
      t('user.error.badRequest', undefined, {
        defaultValue: 'No account exists with the id supplied as completeId.',
      }),
    )
  }

  const storedUsername = typeof row.username === 'string' ? row.username : undefined
  const storedEmail = normalizeEmail(typeof row.email === 'string' ? row.email : undefined)
  if (
    (username !== undefined && storedUsername !== username) ||
    (email !== undefined && storedEmail !== email)
  ) {
    return failed(
      'completeIdentityMismatch',
      'user.error.badRequest',
      t('user.error.badRequest', undefined, {
        defaultValue: 'The supplied username or email does not identify the completeId account.',
      }),
    )
  }

  if (row.oauthServer) {
    return failed(
      'completeNotOwned',
      'user.error.badRequest',
      t('user.error.badRequest', undefined, {
        defaultValue:
          'The completeId account signs in through OAuth; its credentials are not provisioned here.',
      }),
    )
  }

  let secrets: Row | null
  try {
    secrets = await findById<Row>(`${tableName}Secrets`, completeId)
  } catch (error) {
    logger.error('Failed to read a credential row while completing provisioning', {
      error,
      userId: completeId,
    })
    return failed(
      'lookupFailed',
      'user.error.failedToReadUser',
      t('user.error.failedToReadUser'),
      completeId,
    )
  }

  const props = stripSensitiveUserColumns(row) as unknown as SafeProps

  // The credential state this call OBSERVED, captured before hashing. The conditional write below
  // must match what was read here, never a value re-read off the row later — a provider is free to
  // hand back a live row object, and another writer may have changed it in between.
  const observedPasswordHash: unknown = secrets?.passwordHash

  // A stored password is authoritative: never overwrite it, even with the completeId token.
  if (observedPasswordHash) {
    return { status: 'existing', id: completeId, props, hasPassword: true }
  }

  // A credential row with no hash is the complete shape for a content-only author.
  if (secrets && password === undefined) {
    return { status: 'existing', id: completeId, props, hasPassword: false }
  }

  let passwordHash: string | undefined
  if (password !== undefined) {
    try {
      passwordHash = await hash(password)
    } catch (error) {
      logger.error('Failed to hash a provisioned user password', { error, userId: completeId })
      return failed(
        'credentialsFailed',
        'user.error.failedToHashPassword',
        t('user.error.failedToHashPassword'),
        completeId,
      )
    }
  }

  const secretsTable = `${tableName}Secrets`
  const credentialRow =
    passwordHash === undefined ? { id: completeId } : { id: completeId, passwordHash }

  /**
   * Reads the credential row back and answers with the state that is ACTUALLY committed.
   *
   * Reached only when a write lost: a concurrent completion or a password reset wrote first, so
   * this call installed nothing. `completed` is never returned here — it would claim a write that
   * did not happen — and the winning credential is never touched.
   * @returns The honest outcome for the stored state.
   */
  const reportCommittedCredential = async (): Promise<ProvisionUserResult> => {
    let current: Row | null
    try {
      current = await findById<Row>(secretsTable, completeId)
    } catch (error) {
      logger.error('Failed to re-read a credential row after a concurrent write', {
        error,
        userId: completeId,
      })
      return failed(
        'lookupFailed',
        'user.error.failedToReadUser',
        t('user.error.failedToReadUser'),
        completeId,
      )
    }

    if (!current) {
      // The row is gone: the account's credential row is still missing and this call did not
      // write it, so a partial result with its recovery pointer remains the honest answer.
      return {
        status: 'partial',
        reason: 'credentialsFailed',
        errorKey: 'user.error.failedToCreateUser',
        error: `The ${secretsTable} row changed while this call was completing it.`,
        id: completeId,
        recovery: { id: completeId, passwordRequired: password !== undefined },
      }
    }

    logger.warn('A concurrent write changed the credential row while completing provisioning', {
      userId: completeId,
      hasPassword: Boolean(current.passwordHash),
    })

    return {
      status: 'existing',
      id: completeId,
      props,
      hasPassword: Boolean(current.passwordHash),
    }
  }

  if (secrets) {
    // Compare-and-swap: replace ONLY the hashless state this call read. A completion or a reset
    // that wrote a hash while this call was hashing makes the condition match no row, so the
    // credential that won survives — an unconditional update would overwrite it.
    let swapped: { affected?: number } | null
    try {
      swapped = await updateMany(
        secretsTable,
        [
          { field: 'id', operator: '=', value: completeId },
          observedHashlessCondition(observedPasswordHash),
        ],
        { passwordHash },
      )
    } catch (error) {
      logger.error('Failed to complete a provisioned user credential row', {
        error,
        userId: completeId,
      })
      return failed(
        'credentialsFailed',
        password === undefined
          ? 'user.error.failedToCreateUser'
          : 'user.error.failedToHashPassword',
        messageOf(error),
        completeId,
      )
    }

    if (swapped?.affected !== 1) return await reportCommittedCredential()

    return { status: 'completed', id: completeId, props, hasPassword: passwordHash !== undefined }
  }

  // No credential row was observed. Two completions can both read that, so the credential table's
  // primary key decides the winner; the loser reports the committed state instead of claiming a
  // write it did not make, and never replaces the winner's hash.
  try {
    const stored = await storeCreate(secretsTable, credentialRow)
    if (!stored?.affected) throw new Error(`Failed to write the ${secretsTable} row.`)
  } catch (error) {
    logger.error('Failed to complete a provisioned user credential row', {
      error,
      userId: completeId,
    })
    return await reportCommittedCredential()
  }

  return { status: 'completed', id: completeId, props, hasPassword: passwordHash !== undefined }
}

/**
 * Creates a user record and its same-id credential record for a trusted server caller, without
 * creating a session.
 *
 * The props are validated ONCE by the resource schema — this package's `propsSchema` unless
 * `schema` is supplied — before the existing-account lookup, so any `transform`/`default` in a
 * caller's schema decides the stored and the looked-up username/email. The user row and its
 * `usersSecrets` row are then written under ONE freshly minted id, inside a transaction when the
 * bonded database supports one. With no `password`, the credential row carries no `passwordHash`
 * at all — the account cannot log in, and there is no default, generated, or returned password.
 *
 * Existing accounts are found by `username` or `email` and returned unchanged (`status:
 * 'existing'`), which makes re-running a seed safe; a supplied password is never applied to an
 * existing account. Where the bond has no interactive transactions and the credential write
 * fails, the result is `{ status: 'partial', id, recovery }` — pass that id back as `completeId`
 * (with the same identity props and the same password) to finish it.
 *
 * Use {@link createResource} when the app constrains or extends user props; omit it otherwise.
 * The `tableName` convention is the one every handler in this package uses: the credential table
 * is `${tableName}Secrets`.
 *
 * @param resource - The user resource configuration: `{ name, tableName, schema? }`.
 * @param resource.name - The resource name used in error messages.
 * @param resource.tableName - The database table for users.
 * @param resource.schema - Optional schema validated before the write. Defaults to `propsSchema`.
 * @param input - The account to provision.
 * @param input.props - The SAFE user props to store (never a secret column).
 * @param input.password - Optional plaintext password to hash into the credential row. Omit it
 * for a content-only author, which then has no password and cannot log in.
 * @param input.completeId - The id from an earlier `partial` result; finishes that provisioning.
 * @returns `{ status: 'created' | 'completed' | 'existing', id, props, hasPassword }` on success,
 * `{ status: 'partial', reason, errorKey, error, id, recovery }` when a user row was written but
 * its credentials were not, or `{ status: 'failed', reason, errorKey, error, id? }` otherwise.
 * @example
 * ```ts
 * const author = await provisionUser({ name: 'User', tableName: 'users' }, {
 *   props: { username: 'editor', name: 'Editorial Team' },
 * })
 * if (author.status === 'failed') throw new Error(author.error)
 * await create('articles', { id: articleId, authorId: author.id, title, body })
 * ```
 */
export const provisionUser = async (
  { name, tableName, schema = propsSchema }: types.HandlerResource,
  { props, password, completeId }: ProvisionUserInput,
): Promise<ProvisionUserResult> => {
  // Password policy FIRST: the same bounds signup enforces, checked before any write so a
  // refused password leaves no half-provisioned account behind.
  if (password !== undefined) {
    if (typeof password !== 'string') {
      return failed(
        'invalidPassword',
        'user.error.passwordRequired',
        t('user.error.passwordRequired'),
      )
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return failed(
        'invalidPassword',
        'user.error.passwordTooLong',
        t('user.error.passwordTooLong', undefined, {
          defaultValue: `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
        }),
      )
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return failed(
        'invalidPassword',
        'user.error.passwordTooShort',
        t('user.error.passwordTooShort', undefined, {
          defaultValue: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        }),
      )
    }
  }

  // The identity is normalized the way signup stores it BEFORE validation, so the schema both
  // sees the same value signup would and decides any further transform (a caller's
  // `z.string().toLowerCase()`, say). Copying this pre-step keeps the stored column and every
  // later lookup on the same value; the schema's own parsing is never re-implemented here.
  const candidateProps: Record<string, unknown> = { ...props }
  if (candidateProps.username === undefined || candidateProps.username === null) {
    delete candidateProps.username
  } else {
    const trimmed = String(candidateProps.username).trim().substring(0, MAX_USERNAME_LENGTH)
    if (trimmed) candidateProps.username = trimmed
    else delete candidateProps.username
  }
  if (
    candidateProps.email === undefined ||
    candidateProps.email === null ||
    candidateProps.email === ''
  ) {
    delete candidateProps.email
  } else {
    candidateProps.email = normalizeEmail(String(candidateProps.email))?.substring(
      0,
      MAX_EMAIL_LENGTH,
    )
  }

  // The server controls id and timestamps: the caller cannot smuggle its own. They are set
  // BEFORE validation because the resource schema (`basePropsSchema`) requires them.
  const id = uuid()
  const now = new Date().toISOString()
  let validated: Record<string, unknown>
  try {
    validated = utilities.getValidProps<Record<string, unknown>>({
      name,
      schema: schema as ZodSchema<Record<string, unknown>>,
      props: { ...candidateProps, id, createdAt: now, updatedAt: now },
    })
  } catch (error) {
    return failed('invalidProps', 'resource.error.unknownError', messageOf(error))
  }

  // The identity is read from the VALIDATED props — the exact values the schema produced and the
  // values this call will store.
  const username =
    typeof validated.username === 'string' && validated.username.length > 0
      ? validated.username
      : undefined
  const email = normalizeEmail(typeof validated.email === 'string' ? validated.email : undefined)
  if (!username && !email) {
    return failed(
      'identityRequired',
      'user.error.badRequest',
      t('user.error.badRequest', undefined, {
        defaultValue: 'Provisioning needs a username or an email to identify the account.',
      }),
    )
  }

  if (username && !USERNAME_RE.test(username)) {
    return failed('invalidUsername', 'user.error.usernameInvalid', t('user.error.usernameInvalid'))
  }

  if (completeId !== undefined) {
    return await completeProvisioning({ tableName, completeId, username, email, password })
  }

  // Look for an existing account BEFORE writing — a re-run returns it instead of creating a
  // second one, and an existing account's credentials are never touched.
  let byUsername: Row | null = null
  let byEmail: Row | null = null
  try {
    if (username) {
      byUsername = await findOne<Row>(tableName, [
        { field: 'username', operator: '=', value: username },
      ])
    }
    if (email) {
      byEmail = await findOne<Row>(tableName, [{ field: 'email', operator: '=', value: email }])
    }
  } catch (error) {
    logger.error('Failed to look up an existing user while provisioning', { error })
    return failed('lookupFailed', 'user.error.failedToReadUser', t('user.error.failedToReadUser'))
  }

  if (byUsername && byEmail && byUsername.id !== byEmail.id) {
    return failed(
      'conflict',
      'user.error.badRequest',
      t('user.error.badRequest', undefined, {
        defaultValue: 'The username and the email belong to two different existing accounts.',
      }),
    )
  }

  const existing = byUsername ?? byEmail
  if (existing) {
    return await existingAccount(tableName, existing)
  }

  // A concurrent provision may have won the insert (the email column is UNIQUE). Resolve that to
  // the row that now exists rather than reporting a failure a retry would not reproduce.
  const resolveEmailRace = async (): Promise<ProvisionUserResult | null> => {
    if (!email) return null

    try {
      const raced = await findOne<Row>(tableName, [{ field: 'email', operator: '=', value: email }])
      if (raced) return await existingAccount(tableName, raced)
    } catch (error) {
      logger.warn('Failed to re-check an email after a refused user insert', { error })
    }

    return null
  }

  // Hash BEFORE the write: a hashing failure must leave no row behind, and the hash is what the
  // credential row stores (the plaintext is never persisted or returned).
  let passwordHash: string | undefined
  if (password !== undefined) {
    try {
      passwordHash = await hash(password)
    } catch (error) {
      logger.error('Failed to hash a provisioned user password', { error })
      return failed(
        'credentialsFailed',
        'user.error.failedToHashPassword',
        t('user.error.failedToHashPassword'),
      )
    }
  }

  const userRow: Record<string, unknown> = { ...validated, id, createdAt: now, updatedAt: now }
  if (username === undefined) delete userRow.username
  else userRow.username = username
  if (email === undefined) delete userRow.email
  else userRow.email = email

  const secretRow: Record<string, unknown> =
    passwordHash === undefined ? { id } : { id, passwordHash }
  const secretsTable = `${tableName}Secrets`

  if (supportsTransactions()) {
    // Both rows or neither: a credential failure rolls the user row back, so no partial account
    // is left for the caller to repair.
    // A mutable holder: the stage is written inside the transaction callback, and TypeScript's
    // control-flow analysis narrows a plain `let` to its initializer at the catch below.
    const state: { stage: 'user' | 'credentials' } = { stage: 'user' }
    try {
      await withTransaction(async () => {
        state.stage = 'user'
        const userResult = await storeCreate(tableName, userRow)
        if (!userResult?.affected) throw new Error(`Failed to insert data into ${tableName}.`)
        state.stage = 'credentials'
        const secretResult = await storeCreate(secretsTable, secretRow)
        if (!secretResult?.affected) throw new Error(`Failed to insert the ${secretsTable} row.`)
      })
    } catch (error) {
      if (state.stage === 'credentials') {
        logger.error('Failed to store a provisioned user credential row', { error, userId: id })
        // The hash (when one was supplied) is already computed: what failed is the row write.
        return failed('credentialsFailed', 'user.error.failedToCreateUser', messageOf(error))
      }

      const raced = await resolveEmailRace()
      if (raced) return raced
      logger.error('Failed to insert a provisioned user row', { error, userId: id })
      return failed('userNotCreated', 'resource.error.unableToCreate', messageOf(error))
    }
  } else {
    // No interactive transactions on this bond (D1). The user row commits on its own, so a
    // credential failure is reported as `partial` with the id that repairs it — never as
    // success, and never as a plain failure that hides the row.
    let userResult: { affected?: number } | null
    try {
      userResult = await storeCreate(tableName, userRow)
    } catch (error) {
      const raced = await resolveEmailRace()
      if (raced) return raced
      logger.error('Failed to insert a provisioned user row', { error, userId: id })
      return failed('userNotCreated', 'resource.error.unableToCreate', messageOf(error))
    }
    if (!userResult?.affected) {
      const raced = await resolveEmailRace()
      if (raced) return raced
      // No affected row means no user row exists: there is nothing to repair.
      return failed(
        'userNotCreated',
        'resource.error.unableToCreate',
        t('resource.error.unableToCreate', { name }, { defaultValue: `Unable to create ${name}.` }),
      )
    }

    try {
      const secretResult = await storeCreate(secretsTable, secretRow)
      if (!secretResult?.affected) throw new Error(`Failed to insert the ${secretsTable} row.`)
    } catch (error) {
      logger.error('Failed to store a provisioned user credential row', { error, userId: id })
      return {
        status: 'partial',
        reason: 'credentialsFailed',
        errorKey: 'user.error.failedToCreateUser',
        error: messageOf(error),
        id,
        recovery: { id, passwordRequired: password !== undefined },
      }
    }
  }

  return {
    status: 'created',
    id,
    props: stripSensitiveUserColumns(userRow) as unknown as SafeProps,
    hasPassword: passwordHash !== undefined,
  }
}
