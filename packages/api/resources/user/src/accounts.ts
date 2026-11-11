/**
 * Plain account and session functions for routes an app writes itself.
 *
 * `handlers.*` answer HTTP (`{ statusCode, body }`) in this package's own wire shape. An API with
 * its own contract — its own paths, envelopes, status codes or error bodies — needs the same work
 * as values it can map: {@link createAccount}, {@link signIn}, {@link checkPassword} and
 * {@link issueSession}. They run the SAME code the mounted routes run (validation, the bonded
 * password hasher and its constant-time comparison, two-factor, the device-bound session signed
 * through the bonded JWT provider), so an app never hashes a password, compares one, or signs a
 * token itself.
 *
 * @module
 */

import { get, getLogger } from '@molecule/api-bond'
import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { compare, hash } from '@molecule/api-password'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import type { DeviceService } from '@molecule/api-resource-device'

import * as authorization from './authorization.js'
import { create, type CreateRequest } from './handlers/create.js'
import { logIn, type LogInRequest } from './handlers/logIn.js'
import type * as types from './types.js'

const logger = getLogger()

/** The users table the functions use unless told otherwise — the one this package's routes use. */
const USERS: types.HandlerResource = { name: 'User', tableName: 'users' }

/** Why an account call did not sign anyone in. */
export type AccountFailureReason =
  | 'username-invalid'
  | 'username-taken'
  | 'email-invalid'
  | 'email-taken'
  | 'password-required'
  | 'password-too-short'
  | 'password-too-long'
  | 'invalid-credentials'
  | 'two-factor-required'
  | 'two-factor-invalid'
  | 'invalid'
  | 'unavailable'

/**
 * The request a session is being issued in. The session's `Authorization` response header (and
 * its cookie, where the mount allows one) is set on `res`.
 */
export interface SessionContext {
  req: MoleculeRequest
  res: MoleculeResponse
}

/** A signed-in account: the safe user row and its session token. */
export interface AccountSession {
  ok: true
  /** The user's row with every secret column stripped — safe to send to the client. */
  user: types.Props
  /**
   * The session token, signed by the bonded JWT provider and bound to a device row. The client
   * sends it back as `Authorization: <scheme> <token>`; `verifyMiddleware` accepts it.
   */
  token: string
}

/** An account call that signed no one in, as values an app maps to its own error body. */
export interface AccountFailure {
  ok: false
  /** The cause, for a `switch`. */
  reason: AccountFailureReason
  /** The input field the cause is about, or null when it is not about one field. */
  field: 'username' | 'email' | 'password' | 'twoFactorToken' | null
  /** A sentence for the person, in the request's locale. */
  message: string
  /** The status this package's own route answers with, as a starting point. */
  statusCode: number
  /** This package's stable error key (`user.error.usernameUnavailable`). */
  errorKey: string
}

/** What {@link createAccount} and {@link signIn} resolve to. */
export type AccountResult = AccountSession | AccountFailure

/** The fields a person may choose when signing up. Anything else is ignored, never stored. */
export interface CreateAccountInput {
  username?: string
  email?: string
  name?: string
  password: string
  /** A label for the session's device row ("Chrome on macOS"). */
  deviceName?: string
}

/** What a person signs in with: a username or an email, and the password. */
export interface SignInInput {
  username?: string
  email?: string
  password: string
  /** The current code, when the account has two-factor on. */
  twoFactorToken?: string
  /** A label for the session's device row. */
  deviceName?: string
}

const FAILURES: Record<string, Pick<AccountFailure, 'reason' | 'field'>> = {
  'user.error.usernameInvalid': { reason: 'username-invalid', field: 'username' },
  'user.error.usernameUnavailable': { reason: 'username-taken', field: 'username' },
  'user.error.emailInvalid': { reason: 'email-invalid', field: 'email' },
  'user.error.emailAlreadyRegistered': { reason: 'email-taken', field: 'email' },
  'user.error.passwordRequired': { reason: 'password-required', field: 'password' },
  'user.error.passwordTooShort': { reason: 'password-too-short', field: 'password' },
  'user.error.passwordTooLong': { reason: 'password-too-long', field: 'password' },
  'user.error.invalidCredentials': { reason: 'invalid-credentials', field: null },
  'user.error.invalidTwoFactorToken': { reason: 'two-factor-invalid', field: 'twoFactorToken' },
}

/** The request the handler reads, with only the fields this call names as its body. */
function withBody<T extends MoleculeRequest>(req: MoleculeRequest, body: object): T {
  // The prototype chain is kept: the session writer reads the real request.
  return Object.create(req, {
    body: { value: body, enumerable: true, writable: true, configurable: true },
  }) as T
}

/** A handler's answer as an {@link AccountResult}. */
function asResult(answer: { statusCode: number; body: unknown }): AccountResult {
  const body = (answer.body ?? {}) as Record<string, unknown>
  if (typeof body.accessToken === 'string' && body.props && typeof body.props === 'object')
    return { ok: true, user: body.props as types.Props, token: body.accessToken }
  if (answer.statusCode === 206 || body.twoFactorRequired === true)
    return {
      ok: false,
      reason: 'two-factor-required',
      field: 'twoFactorToken',
      message: t('user.error.twoFactorRequired', undefined, {
        defaultValue: 'A two-factor code is required.',
      }),
      statusCode: 206,
      errorKey: 'user.twoFactorRequired',
    }
  const errorKey = typeof body.errorKey === 'string' ? body.errorKey : ''
  const known = FAILURES[errorKey]
  return {
    ok: false,
    reason: known?.reason ?? (answer.statusCode >= 500 ? 'unavailable' : 'invalid'),
    field: known?.field ?? null,
    message: typeof body.error === 'string' ? body.error : '',
    statusCode: answer.statusCode,
    errorKey,
  }
}

/**
 * Creates an account from a sign-up form and signs it in.
 *
 * Call it from a route of your own when the API's contract is not this package's
 * (`POST /users` with a `{ user: … }` envelope, say), and map the result:
 *
 * ```typescript
 * import { createAccount } from '@molecule/api-resource-user'
 *
 * router.post('/users', async (req, res) => {
 *   const { username, email, password } = req.body.user ?? {}
 *   const account = await createAccount({ username, email, password }, { req, res })
 *   if (!account.ok)
 *     return res.status(422).json({ errors: { [account.field ?? 'account']: [account.message] } })
 *   res.status(201).json({ user: { ...account.user, token: account.token } })
 * })
 * ```
 *
 * It is `handlers.create` as a function: only `username`, `email` and `name` are taken from the
 * input (nothing a caller adds is stored), the password is length-checked and hashed by the bonded
 * `@molecule/api-password` provider into `usersSecrets`, a device row is created and the token is
 * signed by the bonded `@molecule/api-jwt` provider — so it is a session `verifyMiddleware`
 * accepts. The `Authorization` response header (and the session cookie, where the mount allows
 * one) is set on `res` as the mounted route sets it.
 *
 * @param input - What the person entered.
 * @param context - The current `{ req, res }`; the session header is set on `res`.
 * @param resource - The users resource, when the app renamed the table. Defaults to `users`.
 * @returns The signed-in account, or why none was created.
 */
export async function createAccount(
  input: CreateAccountInput,
  context: SessionContext,
  resource: types.HandlerResource = USERS,
): Promise<AccountResult> {
  const { req, res } = context
  const body = {
    ...(input.username === undefined ? {} : { username: input.username }),
    ...(input.email === undefined ? {} : { email: input.email }),
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.deviceName === undefined ? {} : { deviceName: input.deviceName }),
    password: input.password,
  }
  return asResult(await create(resource)(withBody<CreateRequest>(req, body), res))
}

/**
 * Checks a username or email and password, and signs the person in.
 *
 * ```typescript
 * import { signIn } from '@molecule/api-resource-user'
 *
 * router.post('/users/login', async (req, res) => {
 *   const { email, password } = req.body.user ?? {}
 *   const account = await signIn({ email, password }, { req, res })
 *   if (!account.ok) return res.status(401).json({ errors: { credentials: ['invalid'] } })
 *   res.json({ user: { ...account.user, token: account.token } })
 * })
 * ```
 *
 * It is `handlers.logIn` as a function, with nothing weakened: an unknown account and a wrong
 * password take the same time and give the same `invalid-credentials`, the comparison is the
 * bonded hasher's, an account with two-factor on answers `two-factor-required` until
 * `twoFactorToken` is sent, and the session is device-bound, so sign-out and a password change
 * revoke it. A password-reset token is not accepted here; use the reset routes for that.
 *
 * @param input - The credentials.
 * @param context - The current `{ req, res }`; the session header is set on `res`.
 * @param resource - The users resource, when the app renamed the table. Defaults to `users`.
 * @returns The signed-in account, or why no one was signed in.
 */
export async function signIn(
  input: SignInInput,
  context: SessionContext,
  resource: types.HandlerResource = USERS,
): Promise<AccountResult> {
  const { req, res } = context
  const body = {
    ...(input.username === undefined ? {} : { username: input.username }),
    ...(input.email === undefined ? {} : { email: input.email }),
    ...(input.twoFactorToken === undefined ? {} : { twoFactorToken: input.twoFactorToken }),
    ...(input.deviceName === undefined ? {} : { deviceName: input.deviceName }),
    password: input.password,
  }
  return asResult(await logIn(resource)(withBody<LogInRequest>(req, body), res))
}

let dummyHash: Promise<string> | undefined

/**
 * Whether `password` is the account's current password — for a step that re-asks for it
 * (confirming a deletion, changing an email in a route of your own).
 *
 * The comparison is the bonded `@molecule/api-password` provider's, against the hash in
 * `usersSecrets`. An account with no password (OAuth-only) and an unknown id answer `false` after
 * a comparison against a throwaway hash, so the answer's timing does not say which it was.
 * Never compare hashes or passwords yourself.
 *
 * @param userId - The account's id (`users.id`, which is also its `usersSecrets.id`).
 * @param password - The password the person entered.
 * @param resource - The users resource, when the app renamed the table. Defaults to `users`.
 * @returns True only when the password matches.
 */
export async function checkPassword(
  userId: string,
  password: string,
  resource: types.HandlerResource = USERS,
): Promise<boolean> {
  if (typeof password !== 'string' || password === '') return false
  let stored: string | null = null
  try {
    const secrets = await findById<types.SecretProps>(`${resource.tableName}Secrets`, userId)
    stored = typeof secrets?.passwordHash === 'string' ? secrets.passwordHash : null
  } catch (error) {
    logger.error('checkPassword: the credential row could not be read', error)
  }
  if (stored !== null) return compare(password, stored)
  try {
    dummyHash ??= hash('molecule-dummy-password')
    await compare(password, await dummyHash)
  } catch (_error) {
    // The throwaway comparison only equalises timing; its failure changes no answer.
    dummyHash = undefined
  }
  return false
}

/**
 * Signs in an account you have ALREADY authenticated some other way (a verified invite link, a
 * single sign-on callback) and returns its session token.
 *
 * It creates the device row and has the bonded JWT provider sign a token bound to it — the two
 * steps a session is. A token signed any other way names no device and is answered 401 by
 * `verifyMiddleware` on every request. For a username or email and password use {@link signIn},
 * which checks them first; this function checks nothing.
 *
 * @param userId - The authenticated account's id.
 * @param context - The current `{ req, res }`; the session header is set on `res`.
 * @param options - An optional label for the session's device row.
 * @returns The session token.
 * @throws {Error} When no device service is bonded or the device row cannot be written.
 */
export async function issueSession(
  userId: string,
  context: SessionContext,
  options?: { deviceName?: string },
): Promise<string> {
  const { req, res } = context
  const deviceId = await get<DeviceService>('device')?.createOrUpdate(
    userId,
    options?.deviceName || 'Unknown',
  )
  if (!deviceId)
    throw new Error(
      'issueSession: the session device could not be created (is the device service bonded?)',
    )
  const token = authorization.set(req, res, { userId, deviceId })
  if (!token) throw new Error('issueSession: the bonded JWT provider signed no token')
  return token
}
