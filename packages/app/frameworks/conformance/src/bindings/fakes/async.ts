/**
 * Binding-case fakes for one area: HTTP lanes, promises and the forms bond for the async hooks (useHttp, useGet…useDelete, usePromise, useAsyncState, useOptimisticValue, useForm, useWatch, useFieldState).
 *
 * A case seeds this area through `context.areas.async`; `control` steps call
 * the controls registered here (named `async.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * Two things only this module can provide:
 *
 * - `refs['async.form']` — a form controller built by the same bonded
 *   `createForm` React's `useForm` calls, for the hooks that take a controller
 *   as an argument (`useWatch`, `useFieldState`). A case passes
 *   `{ $ref: 'async.form' }` and edits the form through the `async.*` controls.
 * - `refs['async.commit']` — a recorded commit for `useOptimisticValue` that
 *   stays pending until the `async.resolveCommit` / `async.rejectCommit`
 *   control. A `{ $fn, defer }` commit cannot call its own `confirm` argument;
 *   this one applies `commit.confirmPatch` through `confirm` before it waits.
 *
 * @module
 */

import type { FormController, FormOptions, FormState, RegisterOptions } from '@molecule/app-forms'
import { createForm } from '@molecule/app-forms'

import type { AreaFakesFactory } from '../spec.js'

/**
 * One seeded field rule (`context.areas.async.form.fields.<name>`). Every rule
 * is plain data; `async: true` adds a validator this module records
 * (`async.validateField`) and holds pending until the `async.settleField`
 * control (a `control` step's arguments are not turned into recorded
 * functions, so a scripted validator can only come from here).
 */
export interface AsyncFormFieldSeed {
  /** Whether the field is required (a string is the failure message). */
  required?: boolean | string
  /** Minimum length (a number or `{ value, message }`). */
  minLength?: number | { value: number; message: string }
  /** Maximum length (a number or `{ value, message }`). */
  maxLength?: number | { value: number; message: string }
  /** Whether the field must be an email address (a string is the failure message). */
  email?: boolean | string
  /** Add the recorded deferred validator held until `async.settleField`. */
  async?: boolean
}

/** What a case can seed for the form behind `refs['async.form']`. */
export interface AsyncFormSeed {
  /** The form's clean baseline, as `useForm`'s `defaultValues`. */
  defaultValues?: Record<string, unknown>
  /** Externally loaded values merged over the defaults, as `useForm`'s `values`. */
  values?: Record<string, unknown>
  /** Validation mode forwarded to the controller. */
  mode?: FormOptions<Record<string, unknown>>['mode']
  /** Field rules registered on the controller before the hook mounts. */
  fields?: Record<string, AsyncFormFieldSeed>
}

/** What a case can seed for `refs['async.commit']` (`useOptimisticValue`). */
export interface AsyncCommitSeed {
  /**
   * Merged over the current value through the commit's `confirm` callback
   * before the commit starts waiting, so a case can observe confirmed progress
   * surviving a later failure.
   */
  confirmPatch?: Record<string, unknown>
}

/**
 * What a case can seed for the promise refs. `useAsyncState` accepts a real
 * `Promise` instance as its setter argument, which a `{ $fn }` marker cannot
 * be (markers always become functions, and the hook would run them as
 * updaters); these refs are real promises.
 */
export interface AsyncPromiseSeed {
  /** The value `refs['async.resolved']` resolves with. */
  resolve?: unknown
  /** The message `refs['async.rejected']` rejects with. */
  reject?: string
}

/** What a case can seed for this area (`context.areas.async`). */
export interface AsyncSeed {
  /** Builds `refs['async.form']` for `useWatch` / `useFieldState` cases. */
  form?: AsyncFormSeed
  /** Configures `refs['async.commit']` for `useOptimisticValue` cases. */
  commit?: AsyncCommitSeed
  /** Configures `refs['async.resolved']` and `refs['async.rejected']`. */
  promise?: AsyncPromiseSeed
}

/** A deferred promise this module settles from a `control` step. */
interface Deferred<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/** Builds this area's fakes for one case. */
export const createAsyncFakes: AreaFakesFactory = (context, record) => {
  const seed = context.areas?.async ?? {}
  /** Deferred calls of `refs['async.commit']`, oldest first. */
  const pendingCommits: Deferred<unknown>[] = []
  /** Deferred calls of the seeded async field validator, oldest first. */
  const pendingFieldChecks: Deferred<boolean | string>[] = []
  /** The settlement of `refs['async.pending']`, when a case took it. */
  let pendingPromise: Deferred<unknown> | undefined

  let form: FormController<Record<string, unknown>> | undefined
  let subscriptions = 0

  if (seed.form) {
    const controller = createForm<Record<string, unknown>>({
      ...(seed.form.defaultValues === undefined ? {} : { defaultValues: seed.form.defaultValues }),
      ...(seed.form.values === undefined ? {} : { values: seed.form.values }),
      ...(seed.form.mode === undefined ? {} : { mode: seed.form.mode }),
    })
    for (const [name, field] of Object.entries(seed.form.fields ?? {})) {
      const { async: deferred, ...rules } = field
      const options: RegisterOptions = { name, ...rules }
      if (deferred) {
        options.validate = (value: unknown): Promise<boolean | string> => {
          record('async.validateField', [value])
          return new Promise<boolean | string>((resolve, reject) => {
            pendingFieldChecks.push({ resolve, reject })
          })
        }
      }
      controller.register(options)
    }
    form = {
      ...controller,
      subscribe: (callback: (state: FormState<Record<string, unknown>>) => void): (() => void) => {
        subscriptions++
        const off = controller.subscribe(callback)
        let active = true
        return () => {
          if (active) subscriptions--
          active = false
          off()
        }
      },
    }
  }

  const withForm = (
    action: (controller: FormController<Record<string, unknown>>) => void,
  ): void => {
    if (!form) throw new Error('conformance: seed areas.async.form to use its form controls')
    action(form)
  }

  /** Objects a case passes by name; `refs['async.form']` exists only when seeded. */
  const refs: Record<string, unknown> = {
    /**
     * A commit for `useOptimisticValue` (`{ $ref: 'async.commit' }` as the
     * `commit` option). Records `async.commit [next, previous, [function]]`,
     * applies `areas.async.commit.confirmPatch` through the commit's
     * `confirm` callback, then stays pending until `async.resolveCommit` or
     * `async.rejectCommit`.
     */
    'async.commit': (next: unknown, previous: unknown, confirm: unknown): Promise<unknown> => {
      record('async.commit', [next, previous, confirm])
      const patch = seed.commit?.confirmPatch
      if (patch) {
        ;(confirm as (change: (current: unknown) => unknown) => void)((current) => ({
          ...(current as Record<string, unknown>),
          ...patch,
        }))
      }
      return new Promise<unknown>((resolve, reject) => {
        pendingCommits.push({ resolve, reject })
      })
    },
  }
  if (form !== undefined) {
    refs['async.form'] = form
  }
  if (seed.promise?.resolve !== undefined) {
    /** A promise resolving with `areas.async.promise.resolve` (for `useAsyncState`). */
    refs['async.resolved'] = Promise.resolve(seed.promise.resolve)
  }
  if (seed.promise?.reject !== undefined) {
    const rejected = Promise.reject(new Error(seed.promise.reject))
    rejected.catch((_error) => {
      // The seeded rejection is the case's input, not a failure: handling it once
      // here keeps an eager rejected promise from being reported as unhandled
      // before the hook awaits it, and the hook still sees the rejection.
    })
    /** A promise rejecting with `areas.async.promise.reject` (for `useAsyncState`). */
    refs['async.rejected'] = rejected
  }
  /**
   * An `equals` option for `useOptimisticValue` (`{ $ref: 'async.sameStarred' }`):
   * two values are the same change when their `starred` flags match, so `stars`
   * alone never starts a save. Records both operands; a `{ $fn }` marker cannot
   * compare its two arguments (a `pick` returns one field, not a comparison).
   */
  refs['async.sameStarred'] = (a: unknown, b: unknown): boolean => {
    record('async.sameStarred', [a, b])
    return (a as { starred?: unknown }).starred === (b as { starred?: unknown }).starred
  }
  /**
   * A promise resolving with a RECORDED updater that replaces the whole state
   * (`useAsyncState`'s `setState` accepts a promise resolving an updater; a
   * `{ $fn }` marker is always a function, never a promise).
   */
  refs['async.replaceUpdater'] = Promise.resolve(
    (previous: Record<string, unknown>): Record<string, unknown> => {
      record('async.replaceUpdater', [previous])
      return { count: Number(previous.count ?? 0) + 1, name: 'replaced' }
    },
  )
  /**
   * A promise resolving with a RECORDED updater returning a partial (for
   * `useAsyncState`'s `extendState`, which merges what the updater returns).
   */
  refs['async.extendUpdater'] = Promise.resolve(
    (previous: Record<string, unknown>): Record<string, unknown> => {
      record('async.extendUpdater', [previous])
      return { name: 'extended' }
    },
  )
  /** A promise that stays pending until the `async.resolvePromise` / `async.rejectPromise` control. */
  refs['async.pending'] = new Promise<unknown>((resolve, reject) => {
    pendingPromise = { resolve, reject }
  })

  return {
    refs,
    controls: {
      /**
       * `async.setValue [name, value]`: edits one field of the seeded form
       * (marks it touched, as the controller's `setValue` does).
       */
      'async.setValue': (name: unknown, value: unknown): void => {
        withForm((controller) => controller.setValue(name as string, value))
      },
      /**
       * `async.setError [name, message]`: sets one field error of the seeded form.
       */
      'async.setError': (name: unknown, message: unknown): void => {
        withForm((controller) => controller.setError(name as string, message as string))
      },
      /**
       * `async.reset [values?]`: resets the seeded form, with optional values
       * that become the new baseline.
       */
      'async.reset': (...values: unknown[]): void => {
        withForm((controller) => controller.reset(values[0] as Record<string, unknown> | undefined))
      },
      /**
       * `async.updateValues [values, resetOptions?]`: applies outside values to
       * the seeded form (`keepDirtyValues` decides whether edits survive).
       */
      'async.updateValues': (values: unknown, ...resetOptions: unknown[]): void => {
        withForm((controller) =>
          controller.updateValues(
            values as Record<string, unknown>,
            resetOptions[0] as { keepDirtyValues?: boolean } | undefined,
          ),
        )
      },
      /**
       * `async.validate`: runs the seeded form's whole validation. Not awaited:
       * a deferred field validator would otherwise deadlock the step; the
       * promise's own failure is recorded (`async.validateThrown`), never
       * dropped silently.
       */
      'async.validate': (): void => {
        withForm((controller) => {
          void controller.validate().catch((error: unknown) => {
            record('async.validateThrown', [(error as Error)?.message ?? String(error)])
          })
        })
      },
      /**
       * `async.submit`: submits the seeded form through its real `handleSubmit`
       * path. The submitted values are recorded as `async.submitValues`, a
       * rejected validation as `async.submitErrors`, and a throwing submit as
       * `async.submitThrown`. Not awaited: a deferred field validator holds the
       * submit until `async.settleField`.
       */
      'async.submit': (): void => {
        withForm((controller) => {
          const run = controller.handleSubmit(
            (values) => {
              record('async.submitValues', [values])
            },
            (errors) => {
              record('async.submitErrors', [errors])
            },
          )
          void run().catch((error: unknown) => {
            record('async.submitThrown', [(error as Error)?.message ?? String(error)])
          })
        })
      },
      /**
       * `async.settleField [result]`: settles the oldest pending call of the
       * seeded async field validator with `result` (`true` or a message
       * string; anything else passes).
       */
      'async.settleField': (result?: unknown): void => {
        const next = pendingFieldChecks.shift()
        if (!next) throw new Error('conformance: no async field validation is pending')
        next.resolve(result as boolean | string)
      },
      /**
       * `async.resolveCommit [value?]`: settles the oldest pending
       * `refs['async.commit']` call; a value replaces the saved value, no
       * argument keeps the value that was set.
       */
      'async.resolveCommit': (value?: unknown): void => {
        const next = pendingCommits.shift()
        if (!next) throw new Error('conformance: no async commit is pending')
        next.resolve(value)
      },
      /**
       * `async.rejectCommit [message]`: rejects the oldest pending
       * `refs['async.commit']` call with `new Error(message)`.
       */
      'async.rejectCommit': (message: unknown): void => {
        const next = pendingCommits.shift()
        if (!next) throw new Error('conformance: no async commit is pending')
        next.reject(new Error(message as string))
      },
      /**
       * `async.resolvePromise [value?]`: settles `refs['async.pending']` with
       * `value`.
       */
      'async.resolvePromise': (value?: unknown): void => {
        if (!pendingPromise) throw new Error('conformance: the case did not take async.pending')
        const next = pendingPromise
        pendingPromise = undefined
        next.resolve(value)
      },
      /**
       * `async.rejectPromise [message]`: rejects `refs['async.pending']` with
       * `new Error(message)`.
       */
      'async.rejectPromise': (message: unknown): void => {
        if (!pendingPromise) throw new Error('conformance: the case did not take async.pending')
        const next = pendingPromise
        pendingPromise = undefined
        next.reject(new Error(message as string))
      },
    },
    listeners: (): Record<string, number> =>
      form === undefined ? {} : { 'async.forms': subscriptions },
  }
}
