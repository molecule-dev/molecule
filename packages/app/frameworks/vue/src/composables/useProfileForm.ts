/**
 * Profile editing over the app's bonded form and auth clients.
 *
 * @module
 */

import { computed, getCurrentScope, onScopeDispose, type Ref, shallowRef, watch } from 'vue'

import type { FieldRegistration, FormValuesConstraint } from '@molecule/app-forms'
import { formValuesEqual, snapshotFormValue } from '@molecule/app-forms'

import { useAuth, useAuthClient } from './useAuth.js'
import { useForm, type UseFormOptions, type UseFormReturn } from './useForms.js'

/**
 * Detaches the value snapshot the composable keeps as its baseline.
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
export interface UseProfileFormReturn<
  TUser,
  TValues extends FormValuesConstraint<TValues>,
> extends Omit<UseFormReturn<TValues>, 'register' | 'handleSubmit' | 'reset' | 'formState'> {
  /** The shared auth user's current profile. */
  user: Ref<TUser | null>
  /** A user has been loaded; disable submission until this is true. */
  ready: Ref<boolean>
  /**
   * The latest save/propagation failure. Rejected saves retain edits; a failed
   * onSaved callback can be retried by submit without repeating the mutation.
   */
  error: Ref<unknown>
  /** The form state with the save-in-progress flag merged into isSubmitting. */
  formState: UseFormReturn<TValues>['formState']
  /** Native input/textarea bindings with the field's concrete value type. */
  register: <K extends keyof TValues>(
    name: K,
    options?: Parameters<UseFormReturn<TValues>['register']>[1],
  ) => Omit<FieldRegistration, 'value'> & { value: TValues[K] }
  /** Bind to the native form, with a type="submit" button inside it. */
  formProps: { onSubmit: (event?: { preventDefault?: () => void }) => void }
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
 * controls. Session ownership comes from the auth client, independently of mutable
 * profile fields; an explicit getIdentity adds the caller's identity check.
 * Submission snapshots the registered values before asynchronous
 * validation, sends only changed fields through `toPatch`, and uses the auth
 * client's configured updateProfile transport. The saved server response becomes
 * the clean baseline; edits made while saving remain dirty. No request is made
 * for a patch with no fields. A failed request retains the edits and shared user.
 *
 * @param options - Controlled defaults, identity and wire adapters, optional cache/navigation callback.
 * @returns Form state, typed control bindings, native submit binding and save error.
 */
export function useProfileForm<TUser, TValues extends FormValuesConstraint<TValues>>(
  options: UseProfileFormOptions<TUser, TValues>,
): UseProfileFormReturn<TUser, TValues> {
  const { defaultValues, getIdentity, toValues, toPatch, onSaved, ...formOptions } = options
  const form = useForm<TValues>({ ...formOptions, defaultValues })
  const client = useAuthClient<TUser>()
  const { user } = useAuth<TUser>()
  const error = shallowRef<unknown>(undefined)
  const isSaving = shallowRef(false)
  let baseline = copyValues(defaultValues)
  // A late same-account record must not undo fields the person edited, even
  // after those edits became the clean baseline of a completed save.
  const editedFields = new Set<keyof TValues>()
  let owner: {
    revision: number | undefined
    identity: string | undefined
  } | null = null
  let activeSave: Promise<TUser | undefined> | null = null
  let pendingPropagation: TUser | undefined = undefined
  let mounted = true

  if (getCurrentScope()) {
    onScopeDispose(() => {
      mounted = false
    })
  }

  const readValues = (): TValues => {
    const values = copyValues(baseline)
    for (const key of Object.keys(values) as (keyof TValues)[]) values[key] = form.getValue(key)
    return values
  }

  const rebase = (next: TValues, preserveAgainst?: TValues): void => {
    const current = readValues()
    baseline = copyValues(next)
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

  // Hydrate from the shared user, like React's layout effect on [user, client].
  watch(
    user,
    (current) => {
      if (!current) {
        if (owner) {
          owner = null
          pendingPropagation = undefined
          editedFields.clear()
          rebase(copyValues(defaultValues))
          error.value = undefined
        }
        return
      }
      const revision = client.getSessionRevision?.()
      const identity = getIdentity?.(current)
      if (revision === undefined && !getIdentity) {
        throw new Error(
          'useProfileForm: provide getIdentity when the auth client has no session revision',
        )
      }
      const previous = owner
      const sameAccount =
        !previous || (previous.revision === revision && previous.identity === identity)
      const previousBaseline = baseline
      // Keep this token across same-account hydration, but replace it when the
      // account/client changes. A pending validation belongs to that exact owner.
      if (!previous || !sameAccount) {
        owner = { revision, identity }
        editedFields.clear()
      }
      rebase(toValues(current), sameAccount ? previousBaseline : undefined)
      if (!sameAccount) {
        pendingPropagation = undefined
        error.value = undefined
      }
    },
    { immediate: true },
  )

  const submit = (): Promise<TUser | undefined> => {
    if (activeSave) return activeSave
    const currentUser = client.getUser()
    if (!mounted || !currentUser) return Promise.resolve(undefined)
    const revision = client.getSessionRevision?.()
    const identity = getIdentity?.(currentUser)
    const submissionOwner = owner
    const ownsProfile = (): boolean => {
      const current = client.getUser()
      return (
        mounted &&
        owner === submissionOwner &&
        current !== null &&
        client.getSessionRevision?.() === revision &&
        getIdentity?.(current) === identity
      )
    }
    const snapshot = readValues()
    const before = copyValues(baseline)
    const changes: Partial<TValues> = {}
    for (const key of Object.keys(snapshot) as (keyof TValues)[]) {
      if (!formValuesEqual(snapshot[key], before[key])) changes[key] = snapshot[key]
    }
    error.value = undefined
    isSaving.value = true
    let saved: TUser | undefined
    const run = async (): Promise<TUser | undefined> => {
      try {
        await form.handleSubmit(async () => {
          // Validation can await arbitrary app work. Check BEFORE toPatch and
          // again immediately before the mutation: its credentials are read by
          // updateProfile now, not when the reader originally clicked Save.
          if (!ownsProfile()) return
          const patch = toPatch(changes, snapshot)
          if (Object.keys(patch).length > 0) {
            if (!ownsProfile()) return
            saved = await client.updateProfile(patch)
            if (!ownsProfile()) {
              saved = undefined
              return
            }
            if (mounted) {
              const savedValues = toValues(saved)
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
            pendingPropagation = saved
          }
          if (pendingPropagation !== undefined) {
            if (!ownsProfile()) {
              saved = undefined
              return
            }
            const propagated = pendingPropagation
            await onSaved?.(propagated)
            pendingPropagation = undefined
            saved = propagated
          }
        })()
        return saved
      } catch (failure) {
        if (mounted) error.value = failure
        return undefined
      } finally {
        activeSave = null
        if (mounted) isSaving.value = false
      }
    }
    activeSave = run()
    return activeSave
  }

  const register = <K extends keyof TValues>(
    name: K,
    registerOptions?: Parameters<UseFormReturn<TValues>['register']>[1],
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
    form.reset(baseline)
    error.value = undefined
  }

  const onSubmit = (event?: { preventDefault?: () => void }): void => {
    event?.preventDefault?.()
    void submit()
  }

  const isSubmitting = computed(() => isSaving.value || form.isSubmitting.value)

  return {
    ...form,
    formState: computed(() => ({ ...form.formState.value, isSubmitting: isSubmitting.value })),
    isSubmitting,
    user: user as Ref<TUser | null>,
    ready: computed(() => user.value !== null),
    error,
    register,
    setValue,
    reset,
    submit,
    formProps: { onSubmit },
  }
}
