/**
 * Cases for the form hooks.
 *
 * `useForm` creates its controller internally, so its cases drive everything
 * through the hook's own methods. `useWatch` and `useFieldState` take the
 * controller as their first argument, which a case cannot write as data: they
 * pass `{ $ref: 'async.form' }` (the area fakes' controller, built by the same
 * bonded `createForm`) and edit the form through `async.*` control steps.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/**
 * `useForm(options)`: the form state plus every field and form method. The
 * methods snapshot as `'[method]'`; the state fields carry the behavior.
 */
export const useFormCases: HookCases = {
  hook: 'useForm',
  cases: [
    { name: 'starts empty with no options' },
    {
      name: 'default values are the clean baseline',
      args: [{ defaultValues: { email: '', name: 'Ada' } }],
    },
    {
      // The core controller announces a default that register() fills in, once,
      // in a microtask, so formState shows it without another change.
      name: "register's default reaches formState without another change",
      args: [{}],
      steps: [
        { type: 'call', method: 'register', args: ['name', { defaultValue: 'Ada' }] },
        { type: 'call', method: 'register', args: ['email', { required: 'Email is required' }] },
      ],
    },
    {
      name: "register's onChange takes an event or a plain value; onBlur touches",
      args: [{ defaultValues: { email: '' } }],
      steps: [
        { type: 'call', method: 'register', args: ['email'], as: 'email' },
        { type: 'call', on: 'email', method: 'onBlur' },
        {
          type: 'call',
          on: 'email',
          method: 'onChange',
          args: [{ target: { value: 'a@b.c', name: 'email' } }],
        },
        { type: 'call', on: 'email', method: 'onChange', args: ['plain@x.y'] },
      ],
    },
    {
      name: 'a registered transform is applied to each change',
      args: [{}],
      steps: [
        {
          type: 'call',
          method: 'register',
          args: ['email', { transform: { $fn: 'upper', returns: 'A@B.C' } }],
          as: 'email',
        },
        { type: 'call', on: 'email', method: 'onChange', args: ['a@b.c'] },
      ],
    },
    {
      name: 'setValue updates the value, marks the field touched and the form dirty',
      args: [{ defaultValues: { email: '', name: 'Ada' } }],
      steps: [
        { type: 'call', method: 'setValue', args: ['email', 'a@b.c'] },
        { type: 'call', method: 'getValue', args: ['email'] },
      ],
    },
    {
      name: 'setError, getError and clearErrors manage field errors',
      args: [{ defaultValues: { email: '' } }],
      steps: [
        { type: 'call', method: 'setError', args: ['email', 'Taken'] },
        { type: 'call', method: 'getError', args: ['email'] },
        { type: 'call', method: 'setError', args: ['email', undefined] },
        { type: 'call', method: 'getError', args: ['email'] },
        { type: 'call', method: 'clearErrors' },
      ],
    },
    {
      name: 'reset restores the baseline and clears touched, errors and submit state',
      args: [{ defaultValues: { email: '' } }],
      steps: [
        { type: 'call', method: 'setValue', args: ['email', 'a@b.c'] },
        { type: 'call', method: 'setError', args: ['email', 'Taken'] },
        { type: 'call', method: 'reset' },
      ],
    },
    {
      name: 'reset with values makes them the new baseline',
      args: [{ defaultValues: { email: '' } }],
      steps: [
        { type: 'call', method: 'reset', args: [{ email: 'x@y.z' }] },
        { type: 'call', method: 'setValue', args: ['email', 'other@x.z'] },
        { type: 'call', method: 'reset' },
      ],
    },
    {
      name: 'validate runs the registered rules and publishes field errors',
      args: [{}],
      steps: [
        { type: 'call', method: 'register', args: ['email', { required: 'Email is required' }] },
        { type: 'call', method: 'validate' },
      ],
    },
    {
      name: 'validate awaits a deferred validator before publishing',
      // The value must be non-empty: the core skips every rule but `required`
      // for an empty field, so the deferred validator would never run.
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [
        {
          type: 'call',
          method: 'register',
          args: ['email', { validate: { $fn: 'checkEmail', defer: true } }],
        },
        { type: 'call', method: 'validate' },
        { type: 'settle', fn: 'checkEmail', value: 'Taken' },
      ],
    },
    {
      name: 'a passing validation clears a stale error',
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [
        { type: 'call', method: 'register', args: ['email', { email: 'Not an email' }] },
        { type: 'call', method: 'setError', args: ['email', 'Stale'] },
        { type: 'call', method: 'validate' },
      ],
    },
    {
      name: 'a form-level validate option adds cross-field errors',
      args: [
        {
          defaultValues: { password: 'a', confirm: 'b' },
          validate: { $fn: 'formCheck', returns: { confirm: 'Passwords differ' } },
        },
      ],
      steps: [{ type: 'call', method: 'validate' }],
    },
    {
      name: 'asState returns the field tuple and the whole-form tuple',
      args: [{ defaultValues: { email: 'a@b.c', name: 'Ada' } }],
      steps: [
        { type: 'call', method: 'asState', args: ['email'] },
        { type: 'call', method: 'asState' },
      ],
    },
    {
      name: 'the field tuple: the fill element loads a pristine field, the edit element touches it',
      args: [{ defaultValues: { email: 'a@b.c', name: 'Ada' } }],
      steps: [
        { type: 'call', method: 'setValue', args: ['name', 'Bob'] },
        { type: 'call', method: 'asState', args: ['email'], as: 'emailState' },
        { type: 'call', on: 'emailState', method: '2', args: ['srv@x.y'] },
        { type: 'call', on: 'emailState', method: '1', args: ['edit@x.y'] },
      ],
    },
    {
      name: 'the whole-form edit changes only differing fields; the form fill keeps edits',
      args: [{ defaultValues: { email: 'a@b.c', name: 'Ada' } }],
      steps: [
        { type: 'call', method: 'asState', as: 'whole' },
        { type: 'call', on: 'whole', method: '1', args: [{ email: 'z@z.z', name: 'Ada' }] },
        { type: 'call', on: 'whole', method: '2', args: [{ email: 'loaded@x.y' }] },
      ],
    },
    {
      name: 'updateValues keeps dirty fields when asked',
      args: [{ defaultValues: { email: '', name: 'Ada' } }],
      steps: [
        { type: 'call', method: 'setValue', args: ['name', 'Bob'] },
        {
          type: 'call',
          method: 'updateValues',
          args: [{ name: 'Server', email: 'srv@x.y' }, { keepDirtyValues: true }],
        },
      ],
    },
    {
      name: 'updateValues without keepDirtyValues replaces edits',
      args: [{ defaultValues: { email: '', name: 'Ada' } }],
      steps: [
        { type: 'call', method: 'setValue', args: ['name', 'Bob'] },
        {
          type: 'call',
          method: 'updateValues',
          args: [{ name: 'Server', email: 'srv@x.y' }],
        },
      ],
    },
    {
      name: 'a changed values option keeps dirty fields by default',
      // Depends on React keeping the controller across the argument change; a
      // binding that re-mounts on `args` loses the edited name.
      args: [{ defaultValues: { email: '', name: 'Ada' }, values: { email: 'one@x.y' } }],
      steps: [
        { type: 'call', method: 'setValue', args: ['name', 'Bob'] },
        {
          type: 'args',
          args: [{ defaultValues: { email: '', name: 'Ada' }, values: { email: 'two@x.y' } }],
        },
      ],
    },
    {
      name: 'a changed values option with keepDirtyValues false replaces edits',
      args: [
        {
          defaultValues: { email: '', name: 'Ada' },
          values: { email: 'one@x.y' },
          resetOptions: { keepDirtyValues: false },
        },
      ],
      steps: [
        { type: 'call', method: 'setValue', args: ['name', 'Bob'] },
        {
          type: 'args',
          args: [
            {
              defaultValues: { email: '', name: 'Ada' },
              values: { email: 'two@x.y' },
              resetOptions: { keepDirtyValues: false },
            },
          ],
        },
      ],
    },
    {
      name: 'a changed resetKey starts a fresh form',
      args: [{ defaultValues: { email: 'a@b.c' }, resetKey: 'record-1' }],
      steps: [
        { type: 'call', method: 'setValue', args: ['email', 'edited@x.y'] },
        { type: 'call', method: 'setError', args: ['email', 'Taken'] },
        {
          type: 'args',
          args: [{ defaultValues: { email: 'a@b.c' }, resetKey: 'record-2' }],
        },
      ],
    },
    {
      name: 'new defaultValues without a resetKey leave the form alone',
      // Pins the documented contract that a fresh options object on re-render
      // must not reset the drafts; depends on React keeping the controller
      // across the argument change.
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [
        { type: 'call', method: 'setValue', args: ['email', 'edited@x.y'] },
        { type: 'args', args: [{ defaultValues: { email: 'fresh@x.y' } }] },
      ],
    },
    {
      name: 'handleSubmit returns the runner without running it',
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [{ type: 'call', method: 'handleSubmit', args: [{ $fn: 'onSubmit' }] }],
    },
    {
      name: 'running the returned runner validates and calls the handler with the values',
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [
        { type: 'call', method: 'handleSubmit', args: [{ $fn: 'onSubmit' }], as: 'submit' },
        { type: 'call', on: 'submit' },
      ],
    },
    {
      name: 'a submit over invalid values publishes the errors and never calls the handler',
      args: [{ defaultValues: { email: '' } }],
      steps: [
        { type: 'call', method: 'register', args: ['email', { required: 'Email is required' }] },
        { type: 'call', method: 'handleSubmit', args: [{ $fn: 'onSubmit' }], as: 'submit' },
        { type: 'call', on: 'submit' },
      ],
    },
    {
      name: 'a throwing handler records submitError, rejects the runner and clearErrors drops it',
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [
        {
          type: 'call',
          method: 'handleSubmit',
          args: [{ $fn: 'onSubmit', reject: 'boom' }],
          as: 'submit',
        },
        { type: 'call', on: 'submit' },
        { type: 'call', method: 'clearErrors' },
      ],
    },
    {
      name: 'a submit held by a deferred validator reports isSubmitting until it settles',
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [
        {
          type: 'call',
          method: 'register',
          args: ['email', { validate: { $fn: 'check', defer: true } }],
        },
        { type: 'call', method: 'handleSubmit', args: [{ $fn: 'onSubmit' }], as: 'submit' },
        { type: 'call', on: 'submit' },
        { type: 'settle', fn: 'check', value: true },
      ],
    },
    {
      name: 'unmount with a pending deferred validator: no warning',
      // Non-empty value for the same reason as the deferred-validation case.
      args: [{ defaultValues: { email: 'a@b.c' } }],
      steps: [
        {
          type: 'call',
          method: 'register',
          args: ['email', { validate: { $fn: 'check', defer: true } }],
        },
        { type: 'call', method: 'validate' },
        { type: 'unmount' },
        { type: 'settle', fn: 'check', value: 'Taken' },
      ],
    },
  ],
}

/**
 * `useWatch(form, name)`: one field's value, following the controller the case
 * seeded as `areas.async.form` and edits through `async.*` controls.
 */
export const useWatchCases: HookCases = {
  hook: 'useWatch',
  cases: [
    {
      name: 'reads the seeded field value',
      args: [{ $ref: 'async.form' }, 'email'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c', name: 'Ada' } } } } },
    },
    {
      name: 'an unregistered field watches as null',
      args: [{ $ref: 'async.form' }, 'phone'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c' } } } } },
    },
    {
      name: 'follows edits and a reset made through the controller',
      args: [{ $ref: 'async.form' }, 'email'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c' } } } } },
      steps: [
        { type: 'control', name: 'async.setValue', args: ['email', 'b@c.d'] },
        { type: 'control', name: 'async.reset' },
      ],
    },
    {
      name: 'follows outside values applied to its pristine field',
      args: [{ $ref: 'async.form' }, 'email'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c' } } } } },
      steps: [{ type: 'control', name: 'async.updateValues', args: [{ email: 'srv@x.y' }] }],
    },
    {
      name: 'stops following the form after unmount',
      args: [{ $ref: 'async.form' }, 'email'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c' } } } } },
      steps: [
        { type: 'control', name: 'async.setValue', args: ['email', 'x@y.z'] },
        { type: 'unmount' },
        { type: 'control', name: 'async.setValue', args: ['email', 'later@x.z'] },
      ],
    },
  ],
}

/**
 * `useFieldState(form, name)`: one field's value, error, touched, dirty, valid
 * and validating, driven through the seeded controller.
 */
export const useFieldStateCases: HookCases = {
  hook: 'useFieldState',
  cases: [
    {
      name: 'starts clean',
      args: [{ $ref: 'async.form' }, 'email'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c' } } } } },
    },
    {
      name: 'an edit marks the field touched and dirty',
      args: [{ $ref: 'async.form' }, 'email'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c' } } } } },
      steps: [{ type: 'control', name: 'async.setValue', args: ['email', 'b@c.d'] }],
    },
    {
      name: 'a failed validation shows the error and invalidates the field',
      args: [{ $ref: 'async.form' }, 'email'],
      context: {
        areas: {
          async: {
            form: {
              defaultValues: { email: '' },
              fields: { email: { required: 'Email is required' } },
            },
          },
        },
      },
      steps: [{ type: 'control', name: 'async.validate' }],
    },
    {
      name: 'an async validator holds until it is settled',
      args: [{ $ref: 'async.form' }, 'email'],
      context: {
        areas: {
          async: {
            form: { defaultValues: { email: 'a@b.c' }, fields: { email: { async: true } } },
          },
        },
      },
      steps: [
        { type: 'control', name: 'async.validate' },
        { type: 'control', name: 'async.settleField', args: ['Taken'] },
      ],
    },
    {
      name: 'a submit with invalid values reports the errors and never calls the handler',
      args: [{ $ref: 'async.form' }, 'email'],
      context: {
        areas: {
          async: {
            form: {
              defaultValues: { email: '' },
              fields: { email: { required: 'Email is required' } },
            },
          },
        },
      },
      steps: [{ type: 'control', name: 'async.submit' }],
    },
    {
      name: 'a valid submit calls the handler with the values',
      args: [{ $ref: 'async.form' }, 'email'],
      context: {
        areas: {
          async: {
            form: {
              defaultValues: { email: 'a@b.c' },
              fields: { email: { required: 'Email is required' } },
            },
          },
        },
      },
      steps: [{ type: 'control', name: 'async.submit' }],
    },
    {
      name: 'a submit held by a deferred validator completes when it passes',
      args: [{ $ref: 'async.form' }, 'email'],
      context: {
        areas: {
          async: {
            form: { defaultValues: { email: 'a@b.c' }, fields: { email: { async: true } } },
          },
        },
      },
      steps: [
        { type: 'control', name: 'async.submit' },
        { type: 'control', name: 'async.settleField', args: [true] },
      ],
    },
    {
      name: 'reset clears the field state',
      args: [{ $ref: 'async.form' }, 'email'],
      context: { areas: { async: { form: { defaultValues: { email: 'a@b.c' } } } } },
      steps: [
        { type: 'control', name: 'async.setValue', args: ['email', 'b@c.d'] },
        { type: 'control', name: 'async.setError', args: ['email', 'Taken'] },
        { type: 'control', name: 'async.reset' },
      ],
    },
  ],
}
