/**
 * Profile editing over the app's bonded form and auth clients.
 *
 * @module
 */

import { useCallback, useInsertionEffect, useLayoutEffect, useRef, useState } from 'react'

import type { FieldRegistration } from '@molecule/app-forms'

import { useAuth, useAuthClient } from './useAuth.js'
import { useForm, type UseFormOptions, type UseFormResult } from './useForm.js'

/** Configuration for a profile form; transport stays in the auth bond. */
export interface UseProfileFormOptions<TUser, TValues extends Record<string, unknown>> extends Omit<
  UseFormOptions<TValues>,
  'defaultValues'
> {
  /** Complete controlled-field defaults, including blank write-only fields. */
  defaultValues: TValues
  /** Stable account identity; changing accounts discards the previous account's edits. */
  getIdentity: (user: TUser) => string
  /** Maps the current/saved user into controlled values, e.g. nullable text to ''. */
  toValues: (user: TUser) => TValues
  /**
   * Maps ONLY changed fields into an API patch. Omit blank optional credentials
   * here; preserve undefined/absent fields rather than turning them into null.
   * The second argument is the complete value snapshot taken at submit time.
   */
  toPatch: (changes: Partial<TValues>, values: Readonly<TValues>) => Partial<TUser>
  /**
   * Propagates the server's saved user to other caches, then navigates if needed.
   * Awaited before submission finishes. The auth client already persists and
   * publishes the saved user; never seed caches from the submitted patch.
   */
  onSaved?: (user: TUser) => void | Promise<void>
}

/** Controlled profile form state and native form bindings. */
export interface UseProfileFormResult<TUser, TValues extends Record<string, unknown>> extends Omit<
  UseFormResult<TValues>,
  'register' | 'handleSubmit' | 'reset'
> {
  /** The shared auth user's current profile. */
  user: TUser | null
  /** A user has been loaded; disable submission until this is true. */
  ready: boolean
  /**
   * The latest save/propagation failure. Rejected saves retain edits; a failed
   * onSaved callback can be retried by submit without repeating the mutation.
   */
  error: unknown
  /** Native input/textarea bindings with the field's concrete value type. */
  register: <K extends keyof TValues>(
    name: K,
    options?: Parameters<UseFormResult<TValues>['register']>[1],
  ) => Omit<FieldRegistration, 'value'> & { value: TValues[K] }
  /** Bind to the native form, with a type="submit" button inside it. */
  formProps: { onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }
  /**
   * Validates and saves one submit-time snapshot. Concurrent submits share the
   * same promise. Resolves undefined on validation, save or propagation failure.
   */
  submit: () => Promise<TUser | undefined>
  /** Discards edits and restores the newest loaded/saved profile baseline. */
  reset: () => void
}

/**
 * Owns load → edit → submit → publish for the signed-in user's profile.
 *
 * Same-account background updates refresh untouched fields but preserve dirty
 * controls. Submission snapshots the registered values before asynchronous
 * validation, sends only changed fields through `toPatch`, and uses the auth
 * client's configured updateProfile transport. The saved server response becomes
 * the clean baseline; edits made while saving remain dirty. No request is made
 * for a patch with no fields. A failed request retains the edits and shared user.
 *
 * @param options - Controlled defaults, identity and wire adapters, optional cache/navigation callback.
 * @returns Form state, typed control bindings, native submit binding and save error.
 */
export function useProfileForm<TUser, TValues extends Record<string, unknown>>(
  options: UseProfileFormOptions<TUser, TValues>,
): UseProfileFormResult<TUser, TValues> {
  const {
    defaultValues,
    getIdentity: _identity,
    toValues: _values,
    toPatch: _patch,
    onSaved: _saved,
    ...formOptions
  } = options
  const form = useForm<TValues>({ ...formOptions, defaultValues })
  const client = useAuthClient<TUser>()
  const { user } = useAuth<TUser>()
  const [error, setError] = useState<unknown>()
  const [isSaving, setIsSaving] = useState(false)
  const optionsRef = useRef(options)
  const committedClient = useRef(client)
  const baseline = useRef({ ...defaultValues })
  const owner = useRef<{ client: typeof client; identity: string } | null>(null)
  const activeSave = useRef<Promise<TUser | undefined> | null>(null)
  const pendingPropagation = useRef<TUser | undefined>(undefined)
  const mounted = useRef(false)

  // Actions use committed configuration, never an abandoned concurrent render.
  useInsertionEffect(() => {
    optionsRef.current = options
    committedClient.current = client
  }, [options, client])
  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const readValues = useCallback((): TValues => {
    const values = { ...baseline.current }
    for (const key of Object.keys(values) as (keyof TValues)[]) values[key] = form.getValue(key)
    return values
  }, [form.getValue])

  const rebase = useCallback(
    (next: TValues, preserveAgainst?: TValues): void => {
      const current = readValues()
      baseline.current = { ...next }
      form.reset(next)
      if (preserveAgainst) {
        for (const key of Object.keys(current) as (keyof TValues)[]) {
          if (!Object.is(current[key], preserveAgainst[key])) form.setValue(key, current[key])
        }
      }
    },
    [readValues, form.reset, form.setValue],
  )

  useLayoutEffect(() => {
    const config = optionsRef.current
    if (!user) {
      if (owner.current) {
        owner.current = null
        pendingPropagation.current = undefined
        rebase({ ...config.defaultValues })
        setError(undefined)
      }
      return
    }
    const identity = config.getIdentity(user)
    const previous = owner.current
    const sameAccount = !previous || (previous.client === client && previous.identity === identity)
    const previousBaseline = baseline.current
    // Keep this token across same-account hydration, but replace it when the
    // account/client changes. A pending validation belongs to that exact owner.
    if (!previous || !sameAccount) owner.current = { client, identity }
    rebase(config.toValues(user), sameAccount ? previousBaseline : undefined)
    if (!sameAccount) {
      pendingPropagation.current = undefined
      setError(undefined)
    }
  }, [user, client, rebase])

  const submit = useCallback((): Promise<TUser | undefined> => {
    if (activeSave.current) return activeSave.current
    const currentUser = client.getUser()
    if (!mounted.current || !currentUser) return Promise.resolve(undefined)
    const config = optionsRef.current
    const identity = config.getIdentity(currentUser)
    const submissionOwner = owner.current
    const ownsProfile = (): boolean => {
      const current = client.getUser()
      return (
        mounted.current &&
        committedClient.current === client &&
        owner.current === submissionOwner &&
        current !== null &&
        config.getIdentity(current) === identity
      )
    }
    const snapshot = readValues()
    const before = { ...baseline.current }
    const changes: Partial<TValues> = {}
    for (const key of Object.keys(snapshot) as (keyof TValues)[]) {
      if (!Object.is(snapshot[key], before[key])) changes[key] = snapshot[key]
    }
    setError(undefined)
    setIsSaving(true)
    let saved: TUser | undefined
    const run = async (): Promise<TUser | undefined> => {
      try {
        await form.handleSubmit(async () => {
          // Validation can await arbitrary app work. Check BEFORE toPatch and
          // again immediately before the mutation: its credentials are read by
          // updateProfile now, not when the reader originally clicked Save.
          if (!ownsProfile()) return
          const patch = config.toPatch(changes, snapshot)
          if (Object.keys(patch).length > 0) {
            if (!ownsProfile()) return
            saved = await client.updateProfile(patch)
            if (!ownsProfile()) {
              saved = undefined
              return
            }
            if (mounted.current) rebase(config.toValues(saved), snapshot)
            pendingPropagation.current = saved
          }
          if (pendingPropagation.current !== undefined) {
            if (!ownsProfile()) {
              saved = undefined
              return
            }
            const propagated = pendingPropagation.current
            await config.onSaved?.(propagated)
            pendingPropagation.current = undefined
            saved = propagated
          }
        })()
        return saved
      } catch (failure) {
        if (mounted.current) setError(failure)
        return undefined
      } finally {
        activeSave.current = null
        if (mounted.current) setIsSaving(false)
      }
    }
    activeSave.current = run()
    return activeSave.current
  }, [client, readValues, form.handleSubmit, rebase])

  const register = useCallback(
    <K extends keyof TValues>(
      name: K,
      registerOptions?: Parameters<UseFormResult<TValues>['register']>[1],
    ): Omit<FieldRegistration, 'value'> & { value: TValues[K] } => {
      return form.register(name, registerOptions) as Omit<FieldRegistration, 'value'> & {
        value: TValues[K]
      }
    },
    [form.register],
  )
  const reset = useCallback(() => {
    form.reset(baseline.current)
    setError(undefined)
  }, [form.reset])
  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault()
      void submit()
    },
    [submit],
  )

  return {
    ...form,
    formState: { ...form.formState, isSubmitting: isSaving || form.isSubmitting },
    isSubmitting: isSaving || form.isSubmitting,
    user,
    ready: user !== null,
    error,
    register,
    reset,
    submit,
    formProps: { onSubmit },
  }
}
