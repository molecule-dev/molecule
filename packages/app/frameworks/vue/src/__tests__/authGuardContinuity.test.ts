// @vitest-environment jsdom

/**
 * The auth route guard keeps one form through a failed sign-in and swaps only
 * when the session decision changes.
 *
 * @module
 */

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import { createJWTAuthClient } from '@molecule/app-auth'

import { useAuth } from '../composables/useAuth.js'
import { moleculePlugin } from '../plugin.js'

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
 * The API's structured validation errors on a failed sign-in, read without a
 * cast: `{ errors: { field: [message, …] } }` inside the error's `body`.
 *
 * @param error - The rejection reason.
 * @returns The field messages, or undefined when the error carries none.
 */
function apiErrors(error: unknown): Record<string, string[]> | undefined {
  if (typeof error !== 'object' || error === null || !('body' in error)) return undefined
  const body: unknown = error.body
  if (typeof body !== 'object' || body === null || !('errors' in body)) return undefined
  const errors: unknown = body.errors
  if (typeof errors !== 'object' || errors === null) return undefined
  const messages: Record<string, string[]> = {}
  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value)) messages[field] = value.map(String)
  }
  return messages
}

/** A form whose local draft and failure must survive an unsuccessful sign-in. */
const LoginPage = defineComponent({
  setup() {
    const { login, isLoading } = useAuth()
    const email = ref('')
    const failure = ref('')
    const submit = async (): Promise<void> => {
      failure.value = ''
      try {
        await login({ email: email.value, password: 'test-password' })
      } catch (error) {
        failure.value = Object.entries(apiErrors(error) ?? {})
          .map(([field, messages]) => `${field} ${messages.join(', ')}`)
          .join('; ')
      }
    }
    return () =>
      h(
        'form',
        {
          'aria-label': 'Sign in',
          onSubmit: (event: { preventDefault: () => void }) => {
            event.preventDefault()
            void submit()
          },
        },
        [
          h('input', {
            'aria-label': 'Email',
            value: email.value,
            onInput: (event: Event) => {
              email.value = inputValue(event)
            },
          }),
          h('button', { type: 'submit' }, 'Sign in'),
          isLoading.value ? h('span', { role: 'status' }, 'Signing in') : null,
          failure.value ? h('p', { role: 'alert' }, failure.value) : null,
        ],
      )
  },
})

/** A route shell waits only while the initial session decision is unknown. */
const GuardedShell = defineComponent({
  setup() {
    const { status, user } = useAuth<{ id: string; email: string }>()
    return () => {
      if (status.value === 'loading') return h('p', { role: 'status' }, 'Restoring session')
      if (status.value === 'authenticated') {
        return h('h1', `Signed in as ${user.value?.email ?? ''}`)
      }
      return h(LoginPage)
    }
  },
})

/** Use the browser response parsing path, including the API's structured error. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('auth route guard continuity', () => {
  it('keeps the same form through a failed login, renders its API errors, and transitions on success', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createJWTAuthClient({
      baseURL: 'https://api.example.test',
      storage: 'memory',
      autoRefresh: false,
    })
    await client.initialize()
    expect(client.getState()).toMatchObject({ initialized: true, status: 'unauthenticated' })
    expect(fetchBoundary).not.toHaveBeenCalled()

    const wrapper = mount(GuardedShell, {
      global: { plugins: [[moleculePlugin, { auth: client }]] },
    })
    const form = wrapper.get('form[aria-label="Sign in"]')
    const email = wrapper.get('input[aria-label="Email"]')
    await email.setValue('reader@example.test')

    let rejectLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise((resolve) => {
        rejectLogin = resolve
      }),
    )
    await form.trigger('submit')
    expect(fetchBoundary).toHaveBeenCalledTimes(1)
    expect(wrapper.get('form[aria-label="Sign in"]').element).toBe(form.element)
    expect(wrapper.get('input[aria-label="Email"]').element).toBe(email.element)
    expect(wrapper.get('input[aria-label="Email"]').element).toHaveProperty(
      'value',
      'reader@example.test',
    )
    expect(wrapper.get('[role="status"]').text()).toBe('Signing in')

    rejectLogin(jsonResponse({ errors: { credentials: ['is invalid'] } }, 401))
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[role="alert"]').text()).toBe('credentials is invalid')
    expect(wrapper.get('form[aria-label="Sign in"]').element).toBe(form.element)
    expect(wrapper.get('input[aria-label="Email"]').element).toBe(email.element)
    expect(wrapper.get('input[aria-label="Email"]').element).toHaveProperty(
      'value',
      'reader@example.test',
    )
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    let acceptLogin!: (response: Response) => void
    fetchBoundary.mockReturnValueOnce(
      new Promise((resolve) => {
        acceptLogin = resolve
      }),
    )
    await form.trigger('submit')
    expect(wrapper.get('form[aria-label="Sign in"]').element).toBe(form.element)
    expect(wrapper.get('[role="status"]').text()).toBe('Signing in')
    acceptLogin(
      jsonResponse({
        user: { id: 'reader', email: 'reader@example.test' },
        accessToken: 'test-access-token',
      }),
    )
    await flushPromises()
    await nextTick()
    expect(fetchBoundary).toHaveBeenCalledTimes(2)
    expect(wrapper.get('h1').text()).toBe('Signed in as reader@example.test')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(client.getState().status).toBe('authenticated')
    wrapper.unmount()
  })
})
