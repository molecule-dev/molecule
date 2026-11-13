/**
 * Svelte hook for profile editing over the app's bonded form and auth clients,
 * porting React's `useProfileForm`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, type Readable, writable } from 'svelte/store'

import type { FieldRegistration, FormValuesConstraint } from '@molecule/app-forms'
import { formValuesEqual, snapshotFormValue } from '@molecule/app-forms'

import { useAuthClient } from '../context.js'
import { useAuth } from './useAuth.js'
import { useForm, type UseFormOptions, type UseFormResult } from './useForm.js'

/**
 * Detaches the value snapshot the hook keeps as its baseline.
 *
 * Form values are a plain string-keyed object at runtime; the caller's values
 * TYPE may be an `interface`, which has no index signature to spread from, so
 * the copy goes through the record view and comes back as `TValues`.
 *
 * @param values - The values object to snapshot.
 * @returns A detached form-value snapshot.
 */
function copyValues<T extends FormValuesConstraint<T>>(values: T): T {
  return snapshotFormValue(values as Record<string, unknown>) as T
}

/**
 * Configuration for a profile form; transport stays in the auth bond.
 *
 * `TValues` is the page's own controlled-values type, named once as an
 * `interface` or a type alias — both satisfy the shared form-values constraint.
 */
export interface UseProfileFormOptions<
  TUser,
  TValues extends FormValuesConstraint<TValues>,
> extends Omit<UseFormOptions<TValues>, 'defaultValues'> {
  /** Complete controlled-field defaults, including blank write-only fields. */
  defaultValues: TValues
  /**
   * Optional additional account identity check; changing it discards prior edits.
   * By default ownership follows the auth client's session revision, so editable
   * fields can change during a save. Providers without getSessionRevision must
   * supply this callback with an identity that remains stable across profile edits.
   */
  getIdentity?: (user: TUser) => string
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
export interface UseProfileFormResult<
  TUser,
  TValues extends FormValuesConstraint<TValues>,
> extends Omit<UseFormResult<TValues>, 'register' | 'handleSubmit' | 'reset'> {
  /** The shared auth user's current profile, as a readable store. */
  user: Readable<TUser | null>
  /** A user has been loaded; disable submission until this is true. */
  ready: Readable<boolean>
  /**
   * The latest save/propagation failure. Rejected saves retain edits; a failed
   * onSaved callback can be retried by submit without repeating the mutation.
   */
  error: Readable<unknown>
  /** Native input/textarea bindings with the field's concrete value type. */
  register: <K extends keyof TValues>(
    name: K,
    options?: Parameters<UseFormResult<TValues>['register']>[1],
  ) => Omit<FieldRegistration, 'value'> & { value: TValues[K] }
  /** Bind to the native form, with a type="submit" button inside it. */
  formProps: { onSubmit: (event: { preventDefault: () => void }) => void }
  /**
   * Validates and saves one submit-time snapshot. Concurrent submits share the
   * same promise. Resolves undefined on validation, save or propagation failure.
   */
  submit: () => Promise<TUser | undefined>
  /** Discards edits and restores the newest loaded/saved profile baseline. */
  reset: () => void
}

/**
 * Owns load → edit → submit → publish for the signed-in user's profile,
 * React's `useProfileForm` in Svelte's idiom: call it during component init
 * under `setMoleculeContext({ auth })`.
 *
 * Same-account background updates refresh untouched fields but preserve dirty
 * controls. Session ownership comes from the auth client, independently of
 * mutable profile fields; an explicit getIdentity adds the caller's identity
 * check. Submission snapshots the registered values before asynchronous
 * validation, sends only changed fields through `toPatch`, and uses the auth
 * client's configured updateProfile transport. The saved server response
 * becomes the clean baseline; edits made while saving remain dirty. No request
 * is made for a patch with no fields. A failed request retains the edits and
 * shared user.
 *
 * @param options - Controlled defaults, identity and wire adapters, optional cache/navigation callback.
 * @returns Form state stores, typed control bindings, native submit binding and save error store.
 * @example
 * ```svelte
 * <script>
 *   import { useProfileForm } from '@molecule/app-svelte'
 *   const profile = useProfileForm({
 *     defaultValues: { name: '', bio: '' },
 *     toValues: (user) => ({ name: user.name ?? '', bio: user.bio ?? '' }),
 *     toPatch: (changes) => changes,
 *   })
 * </script>
 * ```
 */
export function useProfileForm<TUser, TValues extends FormValuesConstraint<TValues>>(
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

  const error = writable<unknown>(undefined)
  const isSaving = writable(false)
  // Committed configuration (React's optionsRef): the actions below close over
  // this one options object, which is this mount's options.
  const config = options
  const baseline = { current: copyValues(defaultValues) }
  // A late same-account record must not undo fields the person edited, even
  // after those edits became the clean baseline of a completed save.
  const editedFields = new Set<keyof TValues>()
  const owner = {
    current: null as {
      client: typeof client
      revision: number | undefined
      identity: string | undefined
    } | null,
  }
  const activeSave = { current: null as Promise<TUser | undefined> | null }
  const pendingPropagation = { current: undefined as TUser | undefined }
  let mounted = true
  onDestroy(() => {
    mounted = false
  })

  const readValues = (): TValues => {
    const values = copyValues(baseline.current)
    for (const key of Object.keys(values) as (keyof TValues)[]) values[key] = form.getValue(key)
    return values
  }

  const rebase = (next: TValues, preserveAgainst?: TValues): void => {
    const current = readValues()
    baseline.current = copyValues(next)
    if (preserveAgainst) {
      form.updateValues(next, { keepDirtyValues: true })
      for (const key of Object.keys(current) as (keyof TValues)[]) {
        if (editedFields.has(key) || !formValuesEqual(current[key], preserveAgainst[key])) {
          form.setValue(key, current[key])
        }
      }
    } else {
      form.reset(next)
    }
  }

  // React's user layout effect, as a store subscription: it runs at init (the
  // way the effect runs after mount) and on every user change.
  let rebasedFor: TUser | null | undefined = undefined
  const applyUser = (currentUser: TUser | null): void => {
    if (rebasedFor === currentUser) return
    rebasedFor = currentUser
    if (!currentUser) {
      if (owner.current) {
        owner.current = null
        pendingPropagation.current = undefined
        editedFields.clear()
        rebase(copyValues(config.defaultValues))
        error.set(undefined)
      }
      return
    }
    const revision = client.getSessionRevision?.()
    const identity = config.getIdentity?.(currentUser)
    if (revision === undefined && !config.getIdentity) {
      throw new Error(
        'useProfileForm: provide getIdentity when the auth client has no session revision',
      )
    }
    const previous = owner.current
    const sameAccount =
      !previous ||
      (previous.client === client &&
        previous.revision === revision &&
        previous.identity === identity)
    const previousBaseline = baseline.current
    // Keep this token across same-account hydration, but replace it when the
    // account/client changes. A pending validation belongs to that exact owner.
    if (!previous || !sameAccount) {
      owner.current = { client, revision, identity }
      editedFields.clear()
    }
    rebase(config.toValues(currentUser), sameAccount ? previousBaseline : undefined)
    if (!sameAccount) {
      pendingPropagation.current = undefined
      error.set(undefined)
    }
  }
  const stopUser = user.subscribe(applyUser)
  onDestroy(stopUser)

  const submit = (): Promise<TUser | undefined> => {
    if (activeSave.current) return activeSave.current
    const currentUser = client.getUser()
    if (!mounted || !currentUser) return Promise.resolve(undefined)
    const revision = client.getSessionRevision?.()
    const identity = config.getIdentity?.(currentUser)
    const submissionOwner = owner.current
    const ownsProfile = (): boolean => {
      const current = client.getUser()
      return (
        mounted &&
        owner.current === submissionOwner &&
        current !== null &&
        client.getSessionRevision?.() === revision &&
        config.getIdentity?.(current) === identity
      )
    }
    const snapshot = readValues()
    const before = copyValues(baseline.current)
    const changes: Partial<TValues> = {}
    for (const key of Object.keys(snapshot) as (keyof TValues)[]) {
      if (!formValuesEqual(snapshot[key], before[key])) changes[key] = snapshot[key]
    }
    error.set(undefined)
    isSaving.set(true)
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
            if (mounted) {
              const savedValues = config.toValues(saved)
              const current = readValues()
              for (const key of editedFields) {
                if (
                  formValuesEqual(current[key], snapshot[key]) &&
                  !formValuesEqual(savedValues[key], snapshot[key])
                ) {
                  // The accepted response intentionally transformed or cleared
                  // this field (for example, a write-only password).
                  editedFields.delete(key)
                  form.setValue(key, savedValues[key])
                }
              }
              rebase(savedValues, snapshot)
            }
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
        if (mounted) error.set(failure)
        return undefined
      } finally {
        activeSave.current = null
        if (mounted) isSaving.set(false)
      }
    }
    activeSave.current = run()
    return activeSave.current
  }

  const register = <K extends keyof TValues>(
    name: K,
    registerOptions?: Parameters<UseFormResult<TValues>['register']>[1],
  ): Omit<FieldRegistration, 'value'> & { value: TValues[K] } => {
    const registration = form.register(name, registerOptions)
    return {
      ...registration,
      onChange: (event: Parameters<FieldRegistration['onChange']>[0]) => {
        editedFields.add(name)
        registration.onChange(event)
      },
    } as Omit<FieldRegistration, 'value'> & { value: TValues[K] }
  }
  const setValue = <K extends keyof TValues>(name: K, value: TValues[K]): void => {
    editedFields.add(name)
    form.setValue(name, value)
  }
  const reset = (): void => {
    editedFields.clear()
    form.reset(baseline.current)
    error.set(undefined)
  }
  const onSubmit = (event: { preventDefault: () => void }): void => {
    event.preventDefault()
    void submit()
  }

  return {
    ...form,
    formState: derived([form.formState, isSaving], ([formValues, saving]) => ({
      ...formValues,
      isSubmitting: saving || formValues.isSubmitting,
    })),
    isSubmitting: derived(
      [isSaving, form.isSubmitting],
      ([saving, formSaving]) => saving || formSaving,
    ),
    user,
    ready: derived(user, (currentUser) => currentUser !== null),
    error: { subscribe: error.subscribe },
    register,
    setValue,
    reset,
    submit,
    formProps: { onSubmit },
  }
}
