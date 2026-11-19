// @vitest-environment jsdom

/**
 * Signed-in account edits through the real auth client: the configured profile
 * transport, the shared user every `useAuth` reader sees, and a profile form
 * that keeps a typed field through late hydration.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onMounted, ref } from 'vue'

import { createJWTAuthClient } from '@molecule/app-auth'

import { useAuth } from '../composables/useAuth.js'
import { useProfileForm } from '../composables/useProfileForm.js'
import { moleculePlugin } from '../plugin.js'
import type { UseAuthReturn } from '../types.js'

interface Account {
  memberKey: string
  displayName: string
  timezone: string
}
const initial: Account = { memberKey: 'employee-7', displayName: 'Before', timezone: 'UTC' }
const saved: Account = { ...initial, displayName: 'Saved name' }
const cleanups: (() => void)[] = []
const wrappers: VueWrapper[] = []

/**
 * Whether a value is the account shape the API answers with.
 *
 * @param value - The value to check.
 * @returns True for a complete account record.
 */
function isAccount(value: unknown): value is Account {
  return (
    typeof value === 'object' &&
    value !== null &&
    'memberKey' in value &&
    typeof value.memberKey === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    'timezone' in value &&
    typeof value.timezone === 'string'
  )
}

/**
 * Reads the account out of a `{ account }` response body.
 *
 * @param data - The parsed response body.
 * @returns The account it carries.
 */
function toAccount(data: unknown): Account {
  if (typeof data === 'object' && data !== null && 'account' in data && isAccount(data.account)) {
    return data.account
  }
  throw new Error('expected an account response')
}

/**
 * The text an input event carries.
 *
 * @param event - The native input event.
 * @returns Its target's value, or '' for a non-input target.
 */
function inputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
}

/**
 * Types into a native input and fires the `change` the form bindings listen to.
 *
 * @param wrapper - The mounted wrapper.
 * @param label - The input's aria-label.
 * @param value - The text to type.
 */
async function typeInto(wrapper: VueWrapper, label: string, value: string): Promise<void> {
  const input = wrapper.get(`input[aria-label="${label}"]`)
  if (input.element instanceof HTMLInputElement) input.element.value = value
  await input.trigger('change')
}

function setup() {
  let server: Account = { ...initial }
  const writes: unknown[] = []
  const items = new Map<string, string>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        const body = JSON.parse(String(options.body)) as { account: Partial<Account> }
        writes.push(body)
        server = { ...server, ...body.account }
      }
      return Response.json({ account: server })
    }),
  )
  const client = createJWTAuthClient<Account>({
    autoRefresh: false,
    currentUserEndpoint: '/employees/current',
    profileEndpoint: '/employees/current',
    profileUpdateMethod: 'PUT',
    profileRequestBody: (account) => ({ account }),
    mapAuthResponse: (data) => ({ user: toAccount(data) }),
    storage: {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        items.set(key, value)
      },
      removeItem: (key) => {
        items.delete(key)
      },
    },
  })
  client.setSession({ accessToken: 'employee-token', user: initial })
  cleanups.push(() => client.destroy())
  return { client, writes, items }
}

/**
 * Mounts a component with the auth client provided, as the plugin wires it.
 *
 * @param client - The auth client.
 * @param component - The component to mount.
 * @returns The mounted wrapper.
 */
function mountWith(
  client: ReturnType<typeof setup>['client'],
  component: ReturnType<typeof defineComponent>,
) {
  const wrapper = mount(component, {
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

const AccountEditor = defineComponent({
  setup() {
    const { user } = useAuth<Account>()
    const name = ref(user.value?.displayName ?? '')
    return () =>
      h('input', {
        'aria-label': 'Account name',
        value: name.value,
        onInput: (event: Event) => {
          name.value = inputValue(event)
        },
      })
  },
})

const ManagedAccountEditor = defineComponent({
  setup() {
    const form = useProfileForm<Account, { displayName: string; timezone: string }>({
      defaultValues: { displayName: '', timezone: '' },
      toValues: (user) => ({ displayName: user.displayName, timezone: user.timezone }),
      toPatch: (changes) => changes,
    })
    // A template binding reads the reactive form state; `register()`'s snapshot
    // alone does not re-render when a load or a save changes the values. The
    // element ref setter is left out: Vue's own `ref` prop owns that slot.
    const bind = <K extends 'displayName' | 'timezone'>(name: K) => {
      const registration = form.register(name)
      return {
        name: registration.name,
        onChange: registration.onChange,
        onBlur: registration.onBlur,
        value: form.formState.value.values[name],
      }
    }
    return () =>
      h('form', { 'aria-label': 'Account', onSubmit: form.formProps.onSubmit }, [
        h('input', { 'aria-label': 'Account name', ...bind('displayName') }),
        h('input', { 'aria-label': 'Timezone', ...bind('timezone') }),
        h(
          'button',
          { type: 'submit', disabled: !form.ready.value || form.isSubmitting.value },
          'Save',
        ),
      ])
  },
})

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

describe('signed-in account edits', () => {
  it('useAuth saves through the configured profile transport before a form remount', async () => {
    const { client, writes, items } = setup()
    let auth!: UseAuthReturn<Account>
    const Probe = defineComponent({
      setup() {
        auth = useAuth<Account>()
        return () => h('div')
      },
    })
    mountWith(client, Probe)
    expect(auth.updateProfile).toBeTypeOf('function')
    const action = auth.updateProfile
    const answer = await action({ displayName: saved.displayName })
    await nextTick()

    expect(answer).toEqual(saved)
    expect(auth.user.value).toEqual(saved)
    expect(client.getUser()).toEqual(saved)
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    expect(JSON.parse(items.get('molecule:auth:user') ?? 'null')).toEqual(saved)
    expect(auth.updateProfile).toBe(action)
    const wrapper = mountWith(client, AccountEditor)
    expect(wrapper.get('input[aria-label="Account name"]').element).toHaveProperty(
      'value',
      saved.displayName,
    )
  })

  it('a rejected useAuth profile save keeps the previous shared user', async () => {
    const { client } = setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Invalid name' }, { status: 422 })),
    )
    let auth!: UseAuthReturn<Account>
    const Probe = defineComponent({
      setup() {
        auth = useAuth<Account>()
        return () => h('div')
      },
    })
    mountWith(client, Probe)
    expect(auth.updateProfile).toBeTypeOf('function')
    await expect(auth.updateProfile({ displayName: '' })).rejects.toHaveProperty('status', 422)
    expect(auth.user.value).toEqual(initial)
  })

  it('counterexample: a custom save followed by setUser keeps the next form correct', async () => {
    const { client } = setup()
    let auth!: UseAuthReturn<Account>
    const Probe = defineComponent({
      setup() {
        auth = useAuth<Account>()
        return () => h('div')
      },
    })
    const probe = mountWith(client, Probe)
    const response = await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    auth.setUser(toAccount(await response.json()))
    probe.unmount()
    const wrapper = mountWith(client, AccountEditor)
    expect(wrapper.get('input[aria-label="Account name"]').element).toHaveProperty(
      'value',
      saved.displayName,
    )
  })

  it('counterexample: a form that loads the server on each visit can own its values', async () => {
    const { client } = setup()
    await fetch('/employees/current', {
      method: 'PUT',
      body: JSON.stringify({ account: { displayName: saved.displayName } }),
    })
    const ServerAccountEditor = defineComponent({
      setup() {
        const name = ref('')
        onMounted(() => {
          void fetch('/employees/current')
            .then((response) => response.json())
            .then((body: unknown) => {
              name.value = toAccount(body).displayName
            })
        })
        return () =>
          h('input', {
            'aria-label': 'Account name',
            value: name.value,
            onInput: (event: Event) => {
              name.value = inputValue(event)
            },
          })
      },
    })
    const wrapper = mountWith(client, ServerAccountEditor)
    await vi.waitFor(() =>
      expect(wrapper.get('input[aria-label="Account name"]').element).toHaveProperty(
        'value',
        saved.displayName,
      ),
    )
    expect(client.getUser()).toEqual(initial)
  })

  it('useProfileForm preserves a typed field through late account hydration and saves it for the next visit', async () => {
    const { client, writes } = setup()
    client.setUser({ ...initial, timezone: '' })
    const view = mountWith(client, ManagedAccountEditor)
    await typeInto(view, 'Account name', saved.displayName)
    client.setUser(initial)
    await nextTick()
    expect(view.get('input[aria-label="Account name"]').element).toHaveProperty(
      'value',
      saved.displayName,
    )
    expect(view.get('input[aria-label="Timezone"]').element).toHaveProperty('value', 'UTC')
    await view.get('form').trigger('submit')
    await vi.waitFor(() => expect(client.getUser()).toEqual(saved))
    expect(writes).toEqual([{ account: { displayName: saved.displayName } }])
    view.unmount()
    const next = mountWith(client, ManagedAccountEditor)
    expect(next.get('input[aria-label="Account name"]').element).toHaveProperty(
      'value',
      saved.displayName,
    )
  })
})
