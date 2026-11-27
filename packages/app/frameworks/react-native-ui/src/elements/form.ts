/**
 * Form registration and default actions for native elements.
 *
 * @module
 */

import { createContext, useCallback, useLayoutEffect, useRef, useState } from 'react'

import type { FormAreaProps, FormEntries, PressableProps } from '@molecule/app-ui'

import { kitEvent } from './events.js'

/** A mounted control, read when the form is submitted or reset. */
export interface FormField {
  entries(): FormEntries
  valid(): boolean
  reset(): void
  focus(): void
  singleLine?: boolean
  /** The name of the radio group this checked control belongs to. */
  checkedRadio?(): string | undefined
}

/** A mounted button that can be used to submit the form. */
export interface FormButton {
  type: PressableProps['type']
  disabled: boolean
  activate(): void
}

interface FormControls {
  fields: Set<() => FormField>
  buttons: Set<() => FormButton>
  submit(): void
  hasCheckedRadio(name: string): boolean
  reset(): void
  submitImplicitly(): void
}

/** A native form's mounted fields, buttons and default actions. */
export function createFormScope(
  readProps: () => Pick<FormAreaProps, 'onSubmit' | 'onReset' | 'noValidate'>,
): FormControls {
  const fields = new Set<() => FormField>()
  const buttons = new Set<() => FormButton>()

  const submit = (): void => {
    const { onSubmit, noValidate } = readProps()
    const controls = Array.from(fields, (read) => read())
    if (!noValidate) {
      const invalid = controls.find((field) => !field.valid())
      if (invalid) {
        invalid.focus()
        return
      }
    }
    if (onSubmit) {
      const entries = controls.flatMap((field) => field.entries())
      onSubmit(kitEvent(), entries)
    }
  }

  return {
    fields,
    buttons,
    submit,
    hasCheckedRadio(name: string): boolean {
      return Array.from(fields).some((read) => read().checkedRadio?.() === name)
    },
    reset(): void {
      const event = kitEvent()
      readProps().onReset?.(event)
      if (!event.defaultPrevented) fields.forEach((read) => read().reset())
    },
    submitImplicitly(): void {
      for (const read of buttons) {
        const button = read()
        if (button.type === undefined || button.type === 'submit') {
          if (!button.disabled) button.activate()
          return
        }
      }
      if (Array.from(fields).filter((read) => read().singleLine).length === 1) submit()
    },
  }
}

/** The form nearest a control. Registrations are in native mount order. */
export const FormScope = createContext<ReturnType<typeof createFormScope> | null>(null)

/** Whether a fieldset above the control has disabled it. */
export const DisabledScope = createContext(false)

/** Keeps a mounted registration in place while its props change. */
export function useFormRegistration<T>(registry: Set<() => T> | undefined, registration: T): void {
  const latest = useRef(registration)
  useLayoutEffect(() => {
    latest.current = registration
  }, [registration])
  useLayoutEffect(() => {
    if (!registry) return
    const read = (): T => latest.current
    registry.add(read)
    return () => {
      registry.delete(read)
    }
  }, [registry])
}

interface FieldValue<T> {
  displayed: T
  read(): T
  change(next: T, notify: () => void): void
  reset(): void
}

/** Tracks the value a form can read immediately, including during a change handler. */
export function useFieldValue<T>(value: T | undefined, defaultValue: T): FieldValue<T> {
  const [uncontrolled, setUncontrolled] = useState(() => defaultValue)
  const displayed = value === undefined ? uncontrolled : value
  const controlled = useRef(value)
  const current = useRef(displayed)
  const proposal = useRef<{ value: T } | null>(null)
  const read = useCallback(() => (proposal.current ? proposal.current.value : current.current), [])
  useLayoutEffect(() => {
    controlled.current = value
    current.current = displayed
  }, [displayed, value])
  return {
    displayed,
    read,
    change(next: T, notify: () => void): void {
      const previous = proposal.current
      // A callback can synchronously render new controlled props before submitting the proposal.
      proposal.current = { value: next }
      current.current = next
      if (value === undefined) setUncontrolled(() => next)
      try {
        notify()
      } finally {
        proposal.current = previous
        if (controlled.current !== undefined) current.current = controlled.current
      }
    },
    reset(): void {
      if (value !== undefined) return
      current.current = defaultValue
      setUncontrolled(() => defaultValue)
    },
  }
}
