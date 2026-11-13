/**
 * Vue OptimisticToggleButton UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type Ref, ref, watch } from 'vue'

import type { ButtonProps, ButtonSize, ButtonVariant, ColorVariant } from '@molecule/app-ui'

import { restAttrs } from '../utilities/attrs.js'
import { Button } from './Button.js'

/** What the optimistic toggle exposes for rendering. */
interface OptimisticToggleState {
  /** The value to render: the newest choice, or the server's value when idle. */
  value: boolean
  /** Whether a save is running or waiting to run. */
  pending: boolean
  /** The failure of the newest change, after the value went back; `null` otherwise. */
  error: unknown
}

/**
 * A boolean-only local port of `@molecule/app-state`'s `createOptimisticValue`
 * (React reaches it through `useOptimisticValue`); local so this package adds
 * no `@molecule/app-state` dependency. Saves run one at a time in the order
 * they were made; a tap during a save updates the desired value and is saved
 * after the running one settles; only a failure of the newest change rolls
 * back to the server's value. The component's `commit` resolves with the
 * server's boolean, so the `confirm` progress hook of the shared
 * implementation is unreachable here and is not carried over.
 *
 * @param value - The loaded server value.
 * @param hooks - The saver and the failure callback of the newest change.
 * @returns The controller: state snapshot, `set`/`update`, `sync`, `subscribe`.
 */
function createOptimisticToggle(
  value: boolean,
  hooks: {
    commit: (desired: boolean) => Promise<boolean | void>
    onError?: (error: unknown) => void
  },
): {
  getState(): OptimisticToggleState
  set(next: boolean): void
  update(change: (current: boolean) => boolean): void
  sync(value: boolean): void
  subscribe(listener: (state: OptimisticToggleState) => void): () => void
} {
  const listeners = new Set<(state: OptimisticToggleState) => void>()
  let confirmed = value
  let desired = value
  let intent = 0
  let running = false
  let state: OptimisticToggleState = { value, pending: false, error: null }

  const publish = (next: OptimisticToggleState): void => {
    if (
      Object.is(next.value, state.value) &&
      next.pending === state.pending &&
      Object.is(next.error, state.error)
    )
      return
    state = next
    for (const listener of [...listeners]) {
      try {
        listener(state)
      } catch (error) {
        // This package cannot depend on @molecule/app-logger; the state
        // listener contract still requires the failure to be visible.
        console.error('optimistic toggle: a state listener threw', { error })
      }
    }
  }

  const run = async (): Promise<void> => {
    running = true
    let failure: { error: unknown } | null = null
    for (;;) {
      const sent = desired
      const sentIntent = intent
      // Claim the run and capture this change before notifying listeners: a
      // listener may synchronously set a newer intent or sync a server value.
      publish({ value: sent, pending: true, error: null })
      try {
        const result = await hooks.commit(sent)
        confirmed = result === undefined ? sent : result
        if (sentIntent === intent || Object.is(desired, confirmed)) {
          desired = confirmed
          break
        }
      } catch (error) {
        if (sentIntent === intent) {
          desired = confirmed
          failure = { error }
          break
        }
        // A newer change replaced this one; only its own outcome is shown.
        if (Object.is(desired, confirmed)) {
          desired = confirmed
          break
        }
      }
    }
    running = false
    publish({ value: desired, pending: false, error: failure ? failure.error : null })
    if (failure) {
      try {
        hooks.onError?.(failure.error)
      } catch (error) {
        console.error('optimistic toggle: onError threw', { error })
      }
    }
  }

  const set = (next: boolean): void => {
    intent += 1
    desired = next
    if (!running && Object.is(next, confirmed)) {
      desired = confirmed
      publish({ value: confirmed, pending: false, error: null })
      return
    }
    if (running) publish({ value: next, pending: true, error: null })
    else void run()
  }

  return {
    getState: () => state,
    set,
    update: (change) => set(change(desired)),
    sync(next) {
      confirmed = next
      if (running) return
      desired = next
      publish({ value: next, pending: false, error: state.error })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Vue OptimisticToggleButton UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s OptimisticToggleButton: an
 * optimistic server-backed toggle. The first tap changes its label and pressed
 * state immediately, including while a previous save is pending; saves run in
 * order using the latest desired boolean; the newest failure rolls back and
 * emits `error` (React's `onError`). Renders the `@molecule/app-ui-vue`
 * Button with `data-mol-id="optimistic-toggle"`.
 */
export const OptimisticToggleButton = defineComponent({
  name: 'MOptimisticToggleButton',
  inheritAttrs: false,
  props: {
    /** The loaded server value. Mount the button only after its record exists. */
    value: {
      type: Boolean,
      required: true,
    },
    /** Saves the desired boolean; resolves with the server-confirmed boolean, rejects on failure. */
    commit: {
      type: Function as PropType<(desired: boolean) => Promise<boolean>>,
      default: undefined,
    },
    /** Label when the displayed value is true (VNode prop or same-named slot). */
    activeLabel: null,
    /** Label when the displayed value is false (VNode prop or same-named slot). */
    inactiveLabel: null,
    variant: {
      type: String as PropType<ButtonVariant>,
      default: 'solid',
    },
    color: {
      type: String as PropType<ColorVariant>,
      default: 'primary',
    },
    size: {
      type: String as PropType<ButtonSize>,
      default: 'md',
    },
    fullWidth: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    leftIcon: null,
    rightIcon: null,
    className: String,
    style: [String, Object] as PropType<ButtonProps['style']>,
    testId: String,
  },
  emits: ['error'],
  setup(props, { attrs, slots, emit }) {
    const state: Ref<OptimisticToggleState> = ref({
      value: props.value,
      pending: false,
      error: null,
    })
    const toggle = createOptimisticToggle(props.value, {
      commit: (desired) => Promise.resolve(props.commit?.(desired)),
      onError: (error) => emit('error', error),
    })
    toggle.subscribe((next) => {
      state.value = next
    })

    // A newer server value (new props after a refetch) is taken while nothing
    // is being saved; `sync` stores it as the server's value during a save.
    watch(
      () => props.value,
      (value) => toggle.sync(value),
    )

    return () => {
      const activeLabel = props.activeLabel ?? slots.activeLabel?.()
      const inactiveLabel = props.inactiveLabel ?? slots.inactiveLabel?.()
      const label = state.value.value ? activeLabel : inactiveLabel

      return h(
        Button,
        {
          'data-mol-id': 'optimistic-toggle',
          ...restAttrs(attrs),
          variant: props.variant,
          color: props.color,
          size: props.size,
          fullWidth: props.fullWidth,
          disabled: props.disabled,
          leftIcon: props.leftIcon ?? slots.leftIcon?.(),
          rightIcon: props.rightIcon ?? slots.rightIcon?.(),
          className: props.className,
          style: props.style,
          testId: props.testId,
          type: 'button',
          'aria-pressed': state.value.value,
          'aria-busy': state.value.pending,
          onClick: () => toggle.update((current) => !current),
        },
        { default: () => label },
      )
    }
  },
})
