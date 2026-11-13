/**
 * Solid hooks over the bonded forms provider, under React's hook names.
 *
 * `useForm` creates its controller through the bonded forms provider
 * (`createForm` from `@molecule/app-forms`); `useWatch` and `useFieldState`
 * take a controller as their argument; `useProfileForm` owns
 * load → edit → submit → publish for the signed-in user's profile.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createSignal, onCleanup } from 'solid-js'

import type {
  FieldRegistration,
  FieldState,
  FormController,
  FormOptions,
  FormResetOptions,
  FormState,
  FormValuesConstraint,
  RegisterOptions,
} from '@molecule/app-forms'
import {
  createForm as createBondedForm,
  formValuesEqual,
  snapshotFormValue,
} from '@molecule/app-forms'

import { useAuth, useAuthClient } from './auth.js'

/** The replaced host's form, one microtask long: an adopting mount reuses it. */
interface FormHandoff<T extends FormValuesConstraint<T>> {
  /** Set by the adopting mount; the disposal microtask then disarms. */
  adopted: boolean
  /** The controller created by the replaced render. */
  form: FormController<T>
  /** That render's `resetKey` (a changed one starts a fresh form). */
  resetKey: string | number | boolean | bigint | null | undefined
  /** The external `values` that controller already applied. */
  external: { values: Partial<T> } | null
}
let formHandoff: FormHandoff<never> | null = null

/**
 * Subscribes an accessor to a controller's notifications, closing the
 * render-to-subscription gap with a synchronous refresh (React's
 * `useFormSnapshot`).
 *
 * @param form - Controller that owns the subscription.
 * @param read - Reads the form state or a selected field.
 * @returns An accessor of the read value.
 */
function useFormSnapshot<T extends FormValuesConstraint<T>, S>(
  form: FormController<T>,
  read: () => S,
): Accessor<S> {
  const [snapshot, setSnapshot] = createSignal<S>(read())
  const refresh = (): void => {
    setSnapshot(() => read())
  }
  const unsubscribe = form.subscribe(refresh)
  // A controller can change after render but before the subscription settles.
  refresh()
  onCleanup(unsubscribe)
  return snapshot
}

/**
 * Options for {@link useForm}.
 *
 * Every `FormOptions` field is supported. `createForm` is only an override —
 * omit it and the hook creates the controller through the bonded forms
 * provider, which uses the built-in native provider until the app bonds its
 * own.
 *
 * @template T - The form's values type.
 */
export interface UseFormOptions<T extends FormValuesConstraint<T>> extends FormOptions<T> {
  /** External values preserve dirty fields by default. Set keepDirtyValues: false to replace them explicitly. */
  resetOptions?: FormResetOptions
  /** New record identity. Serialize composite keys; fresh objects/arrays must not reset drafts on each render. */
  resetKey?: string | number | boolean | bigint | null
  /** Explicit form factory for this one form. Defaults to the bonded forms provider. */
  createForm?: (options: FormOptions<T>) => FormController<T>
}

/**
 * What {@link useForm} returns: the form state fields as accessors and the
 * field and form methods as plain functions (the same names React returns).
 *
 * @template T - The form's values type.
 */
export interface UseFormResult<T extends FormValuesConstraint<T>> {
  /** The whole form state, as an accessor. */
  formState: Accessor<FormState<T>>
  /** Whether the form is valid, as an accessor. */
  isValid: Accessor<boolean>
  /** Whether any field is dirty, as an accessor. */
  isDirty: Accessor<boolean>
  /** Whether the form is submitting, as an accessor. */
  isSubmitting: Accessor<boolean>

  /** Registers a field, returning its bindings. */
  register: (
    name: keyof T,
    options?: Omit<RegisterOptions, 'name'> & { name?: string },
  ) => FieldRegistration
  getValue: <K extends keyof T>(name: K) => T[K]
  setValue: <K extends keyof T>(name: K, value: T[K]) => void
  getError: (name: keyof T) => string | undefined
  setError: (name: keyof T, error: string | undefined) => void
  clearErrors: () => void

  /**
   * Builds a submit runner that validates, then calls the handler with the
   * values while the form is mounted.
   */
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
  ) => (event?: unknown) => Promise<void>
  reset: (values?: Partial<T>) => void
  updateValues: (values: Partial<T>, resetOptions?: FormResetOptions) => void
  /**
   * Whole-form state tuple: edits mark only changed fields dirty; fills
   * preserve them. One field as [value, edit, fill] with a field name.
   */
  asState(): readonly [
    T,
    (value: T | ((previous: T) => T)) => void,
    (values: Partial<T> | ((previous: T) => Partial<T>)) => void,
  ]
  asState<K extends keyof T>(
    name: K,
  ): readonly [
    T[K],
    (value: T[K] | ((previous: T[K]) => T[K])) => void,
    (value: T[K] | ((previous: T[K]) => T[K])) => void,
  ]
  validate: () => Promise<boolean>
}

/**
 * Form state management over the bonded forms provider, under React's hook
 * name.
 *
 * The controller is created once per component (a `resetKey` change starts a
 * fresh one). When `values` changes by content, it becomes the new baseline;
 * `resetOptions.keepDirtyValues` retains edited fields while pristine fields
 * take the loaded values.
 *
 * @param options - Form options, forwarded to the provider.
 * @returns Form state fields as accessors and the methods.
 * @example
 * ```tsx
 * const { register, handleSubmit, formState, isSubmitting } = useForm({
 *   defaultValues: { email: '', password: '' },
 * })
 * ```
 */
export function useForm<T extends FormValuesConstraint<T> = Record<string, unknown>>(
  options: UseFormOptions<T> = {},
): UseFormResult<T> {
  const { createForm = createBondedForm, resetKey, ...formOptions } = options

  // A mount in the same turn as the previous host's cleanup is React's
  // re-render (the adapter's args step), not a new component: adopt its
  // controller and external-values history, unless the resetKey changed
  // (a new record identity starts a fresh form).
  const adopted = formHandoff as FormHandoff<T> | null
  if (adopted) {
    adopted.adopted = true
    formHandoff = null
  }
  const keepController = adopted !== null && Object.is(adopted.resetKey, resetKey)

  const form: FormController<T> = keepController ? adopted.form : createForm({ ...formOptions })
  const adoptedExternal = keepController ? adopted.external : null

  let mounted = true
  const values = options.values
  const keepDirtyValues = options.resetOptions?.keepDirtyValues !== false
  let lastExternalValues: { form: FormController<T>; values: Partial<T> } | null = adoptedExternal
    ? { form, values: adoptedExternal.values }
    : null

  {
    if (values === undefined) {
      lastExternalValues = null
    } else if (
      lastExternalValues !== null &&
      lastExternalValues.form === form &&
      formValuesEqual(lastExternalValues.values, values)
    ) {
      // External content already applied; not external again.
    } else {
      lastExternalValues = { form, values: snapshotFormValue(values) }
      form.updateValues(values, { keepDirtyValues })
    }
  }

  onCleanup(() => {
    mounted = false
    const handoff: FormHandoff<T> = {
      adopted: false,
      form,
      resetKey,
      external: lastExternalValues ? { values: lastExternalValues.values } : null,
    }
    formHandoff = handoff as FormHandoff<never>
    queueMicrotask(() => {
      if (!handoff.adopted && formHandoff === (handoff as unknown)) formHandoff = null
    })
  })

  const formState = useFormSnapshot(form, () => form.getState())

  const register = (
    name: keyof T,
    registerOptions?: Omit<RegisterOptions, 'name'> & { name?: string },
  ): FieldRegistration => {
    return form.register({ ...registerOptions, name: name as string } as RegisterOptions)
  }

  const getValue = <K extends keyof T>(name: K): T[K] => form.getValue(name)

  const setValue = <K extends keyof T>(name: K, value: T[K]): void => {
    form.setValue(name as string, value as unknown)
  }

  const getError = (name: keyof T): string | undefined => form.getError(name as string)

  const setError = (name: keyof T, error: string | undefined): void => {
    if (error !== undefined) {
      form.setError(name as string, error)
    } else {
      form.clearError(name)
    }
  }

  const clearErrors = (): void => {
    form.clearErrors()
  }

  const reset = (values?: Partial<T>): void => {
    form.reset(values)
  }

  const updateValues = (newValues: Partial<T>, resetOptions?: FormResetOptions): void => {
    form.updateValues(newValues, resetOptions)
  }

  /** Per-field edit/fill tuples, cached so identity is stable per field. */
  const stateTuples = new Map<
    keyof T | undefined,
    readonly [(value: unknown) => unknown, (value: unknown) => void]
  >()

  const asState = (name?: keyof T): readonly unknown[] => {
    const read = (): T | T[keyof T] =>
      name === undefined ? form.getState().values : (form.getValue(name) as T[keyof T])
    const visible = name === undefined ? formState().values : (formState().values[name] as unknown)
    const existing = stateTuples.get(name)
    if (existing) return [visible, existing[0], existing[1]]
    const edit = (value: unknown): void => {
      const next =
        typeof value === 'function' ? (value as (previous: unknown) => unknown)(read()) : value
      if (name !== undefined) {
        form.setValue(name as string, next)
        return
      }
      const nextValues = next as Partial<T>
      for (const field of Object.keys(
        Object.assign({}, form.getState().values, nextValues),
      ) as Extract<keyof T, string>[]) {
        if (!formValuesEqual(form.getValue(field), nextValues[field])) {
          form.setValue(field, nextValues[field])
        }
      }
    }
    const fill = (value: unknown): void => {
      const next =
        typeof value === 'function' ? (value as (previous: unknown) => unknown)(read()) : value
      form.updateValues(
        name === undefined ? (next as Partial<T>) : ({ [name]: next } as Partial<T>),
        { keepDirtyValues: true },
      )
    }
    stateTuples.set(name, [edit, fill])
    return [visible, edit, fill]
  }

  const validate = (): Promise<boolean> => form.validate()

  const handleSubmit = (
    onSubmit: (values: T) => void | Promise<void>,
  ): ((event?: unknown) => Promise<void>) => {
    return form.handleSubmit((values) => {
      if (mounted && form === form) return onSubmit(values)
    }) as (event?: unknown) => Promise<void>
  }

  return {
    formState,
    isValid: () => formState().isValid,
    isDirty: () => formState().isDirty,
    isSubmitting: () => formState().isSubmitting,
    register,
    getValue,
    setValue,
    getError,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    updateValues,
    asState: asState as UseFormResult<T>['asState'],
    validate,
  }
}

/**
 * One field's current value, under React's hook name.
 *
 * @param form - Form controller.
 * @param name - Field name to watch.
 * @returns An accessor of the field value.
 */
export function useWatch<T extends FormValuesConstraint<T>, K extends keyof T>(
  form: FormController<T>,
  name: K,
): Accessor<T[K]> {
  return useFormSnapshot(form, () => form.getValue(name))
}

/**
 * One field's state (value, error, touched, dirty, valid), under React's hook
 * name.
 *
 * @param form - Form controller.
 * @param name - Field name.
 * @returns An accessor of the field state.
 */
export function useFieldState<T extends FormValuesConstraint<T>>(
  form: FormController<T>,
  name: keyof T,
): Accessor<FieldState<T[keyof T]>> {
  return useFormSnapshot(form, () => form.getFieldState(name))
}

/**
 * Detaches the value snapshot the profile form keeps as its baseline.
 *
 * Form values are a plain string-keyed object at runtime; the caller's values
 * TYPE may be an `interface`, which has no index signature to spread from, so
 * the copy goes through the record view and comes back as `TValues`.
 *
 * @param values - The values object to snapshot.
 * @returns A detached form-value snapshot.
 */
function copyProfileValues<T extends FormValuesConstraint<T>>(values: T): T {
  return snapshotFormValue(values as Record<string, unknown>) as T
}

/**
 * Configuration for a profile form; transport stays in the auth bond.
 *
 * `TValues` is the page's own controlled-values type, named once as an
 * `interface` or a type alias — both satisfy the shared form-values constraint.
 *
 * @template TUser - The auth user record type.
 * @template TValues - The page's controlled form values.
 */
export interface UseProfileFormOptions<
  TUser,
  TValues extends FormValuesConstraint<TValues>,
> extends Omit<UseFormOptions<TValues>, 'defaultValues'> {
  /** Complete controlled-field defaults, including blank write-only fields. */
  defaultValues: TValues
  /**
   * Optional additional account identity check; changing it discards prior
   * edits. By default ownership follows the auth client's session revision, so
   * editable fields can change during a save. Providers without
   * `getSessionRevision` must supply this callback with an identity that stays
   * stable across profile edits.
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
   * Propagates the server's saved user to other caches, then navigates if
   * needed. Awaited before submission finishes. The auth client already
   * persists and publishes the saved user; never seed caches from the
   * submitted patch.
   */
  onSaved?: (user: TUser) => void | Promise<void>
}

/** Controlled profile form state and native form bindings. */
export interface UseProfileFormResult<
  TUser,
  TValues extends FormValuesConstraint<TValues>,
> extends Omit<UseFormResult<TValues>, 'register' | 'handleSubmit' | 'reset'> {
  /** The shared auth user's current profile, as an accessor. */
  user: Accessor<TUser | null>
  /** A user has been loaded; disable submission until this is true. */
  ready: Accessor<boolean>
  /**
   * The latest save/propagation failure. Rejected saves retain edits; a failed
   * `onSaved` callback can be retried by submit without repeating the mutation.
   */
  error: Accessor<unknown>
  /** Native input/textarea bindings with the field's concrete value type. */
  register: <K extends keyof TValues>(
    name: K,
    options?: Parameters<UseFormResult<TValues>['register']>[1],
  ) => Omit<FieldRegistration, 'value'> & { value: TValues[K] }
  /** Bind to the native form, with a type="submit" button inside it. */
  formProps: { onSubmit: (event: Event) => void }
  /**
   * Validates and saves one submit-time snapshot. Concurrent submits share the
   * same promise. Resolves undefined on validation, save or propagation failure.
   */
  submit: () => Promise<TUser | undefined>
  /** Discards edits and restores the newest loaded/saved profile baseline. */
  reset: () => void
}

/**
 * Owns load → edit → submit → publish for the signed-in user's profile, under
 * React's hook name.
 *
 * Same-account background updates refresh untouched fields but preserve dirty
 * controls. Session ownership comes from the auth client, independently of
 * mutable profile fields; an explicit `getIdentity` adds the caller's identity
 * check. Submission snapshots the registered values before asynchronous
 * validation, sends only changed fields through `toPatch`, and uses the auth
 * client's configured `updateProfile` transport. The saved server response
 * becomes the clean baseline; edits made while saving remain dirty. No request
 * is made for a patch with no fields. A failed request retains the edits and
 * the shared user.
 *
 * @param options - Controlled defaults, identity and wire adapters, optional cache/navigation callback.
 * @returns Form state, typed control bindings, native submit binding and save error.
 * @example
 * ```tsx
 * const profile = useProfileForm({
 *   defaultValues: { name: '', bio: '' },
 *   toValues: (user) => ({ name: user.name ?? '', bio: user.bio ?? '' }),
 *   toPatch: (changes) => changes,
 * })
 * ```
 */
export function useProfileForm<TUser, TValues extends FormValuesConstraint<TValues>>(
  options: UseProfileFormOptions<TUser, TValues>,
): UseProfileFormResult<TUser, TValues> {
  const { defaultValues, getIdentity, toValues, toPatch, onSaved, ...formOptions } = options
  const form = useForm<TValues>({ ...formOptions, defaultValues })
  const client = useAuthClient<TUser>()
  const { user } = useAuth<TUser>()
  const [error, setError] = createSignal<unknown>(undefined)
  const [isSaving, setIsSaving] = createSignal(false)
  // A Solid component body runs once, so the client and the options captured
  // here are the ones every action of this mount uses.
  const committedClient = client
  let baseline = copyProfileValues(defaultValues)
  // A late same-account record must not undo fields the person edited, even
  // after those edits became the clean baseline of a completed save.
  const editedFields = new Set<keyof TValues>()
  let owner: {
    client: typeof client
    revision: number | undefined
    identity: string | undefined
  } | null = null
  let activeSave: Promise<TUser | undefined> | null = null
  let pendingPropagation: TUser | undefined
  let mounted = true
  onCleanup(() => {
    mounted = false
  })

  /** The controlled values: the baseline's shape, filled from the controller. */
  const readValues = (): TValues => {
    const values = copyProfileValues(baseline)
    for (const key of Object.keys(values) as (keyof TValues)[]) values[key] = form.getValue(key)
    return values
  }

  /**
   * Makes `next` the new clean baseline. With `preserveAgainst`, fields the
   * person edited (or that differ from the previous baseline) keep their value.
   *
   * @param next - The new baseline values.
   * @param preserveAgainst - The previous baseline, when fields must be kept.
   */
  const rebase = (next: TValues, preserveAgainst?: TValues): void => {
    const current = readValues()
    baseline = copyProfileValues(next)
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
        committedClient === client &&
        owner === submissionOwner &&
        current !== null &&
        client.getSessionRevision?.() === revision &&
        getIdentity?.(current) === identity
      )
    }
    const snapshot = readValues()
    const before = copyProfileValues(baseline)
    const changes: Partial<TValues> = {}
    for (const key of Object.keys(snapshot) as (keyof TValues)[]) {
      if (!formValuesEqual(snapshot[key], before[key])) changes[key] = snapshot[key]
    }
    setError(undefined)
    setIsSaving(true)
    let saved: TUser | undefined
    const run = async (): Promise<TUser | undefined> => {
      try {
        await form.handleSubmit(async () => {
          // Validation can await arbitrary app work. Check BEFORE toPatch and
          // again immediately before the mutation: its credentials are read by
          // updateProfile now, not when the person originally clicked Save.
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
        if (mounted) setError(failure)
        return undefined
      } finally {
        activeSave = null
        if (mounted) setIsSaving(false)
      }
    }
    activeSave = run()
    return activeSave
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
    form.reset(baseline)
    setError(undefined)
  }

  const onSubmit = (event: Event): void => {
    event.preventDefault()
    void submit()
  }

  // Hydrate from the shared user: a same-account update preserves dirty
  // fields against the previous baseline; a different account (or the first
  // load) replaces them. `user()` is the reactive input; everything else the
  // effect reads is plain controller state.
  createEffect(() => {
    const currentUser = user()
    if (!currentUser) {
      if (owner) {
        owner = null
        pendingPropagation = undefined
        editedFields.clear()
        rebase(copyProfileValues(defaultValues))
        setError(undefined)
      }
      return
    }
    const revision = client.getSessionRevision?.()
    const identity = getIdentity?.(currentUser)
    if (revision === undefined && !getIdentity) {
      throw new Error(
        'useProfileForm: provide getIdentity when the auth client has no session revision',
      )
    }
    const previous = owner
    const sameAccount =
      !previous ||
      (previous.client === client &&
        previous.revision === revision &&
        previous.identity === identity)
    const previousBaseline = baseline
    // Keep this token across same-account hydration, but replace it when the
    // account/client changes. A pending validation belongs to that exact owner.
    if (!previous || !sameAccount) {
      owner = { client, revision, identity }
      editedFields.clear()
    }
    rebase(toValues(currentUser), sameAccount ? previousBaseline : undefined)
    if (!sameAccount) {
      pendingPropagation = undefined
      setError(undefined)
    }
  })

  return {
    ...form,
    formState: (): FormState<TValues> => ({
      ...form.formState(),
      isSubmitting: isSaving() || form.formState().isSubmitting,
    }),
    isSubmitting: () => isSaving() || form.formState().isSubmitting,
    user,
    ready: () => user() !== null,
    error,
    register,
    setValue,
    reset,
    submit,
    formProps: { onSubmit },
  }
}
