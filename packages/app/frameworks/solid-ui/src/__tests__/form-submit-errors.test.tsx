// @vitest-environment jsdom
/**
 * Form submission error defaults: an async handler's rejection renders an
 * accessible server-error list, the fieldset is disabled while a submission
 * settles, native action/method forms stay untouched, a controlled
 * `submitError` clears an internally captured failure, and a real HTTP client
 * 400 response renders without an app-owned adapter. Solid counterpart of
 * `@molecule/app-ui-react`'s `form-submit-errors.test.tsx`.
 *
 * @module
 */
import { fireEvent, waitFor, within } from '@testing-library/dom'
import { createComponent, createSignal, type JSX, mergeProps } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '@molecule/app-http'
import { useForm } from '@molecule/app-solid'
import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Form } from '../components/Form.jsx'

beforeEach(() => {
  setClassMap({ formError: 'error', formFieldsetContents: 'contents' } as UIClassMap)
})

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

/** Mounts a Solid view into a fresh container and returns that container. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('Form submission error defaults', () => {
  it('warns when flattening duplicates and preserves arbitrary field names as own keys', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const save = vi.fn()
    try {
      const container = mount(() => (
        <Form onFormSubmit={save}>
          <input name="repeated" value="first" />
          <input name="__proto__" value="ordinary input" />
          <input name="repeated" value="last" />
        </Form>
      ))
      const form = container.querySelector('form')
      if (!form) throw new Error('Expected the form')
      fireEvent.submit(form)
      expect(save).toHaveBeenCalledExactlyOnceWith({
        ['__proto__']: 'ordinary input',
        repeated: 'last',
      })
      const values: unknown = save.mock.calls[0]?.[0]
      if (typeof values !== 'object' || values === null) {
        throw new TypeError('expected the submitted values')
      }
      expect(Object.hasOwn(values, '__proto__')).toBe(true)
      expect(Object.getPrototypeOf(values)).toBe(Object.prototype)
      expect(diagnostic).toHaveBeenCalledTimes(1)
      expect(diagnostic).toHaveBeenCalledWith(expect.stringContaining('repeated field names'))
    } finally {
      diagnostic.mockRestore()
    }
  })

  it('catches an async onFormSubmit failure, renders it, and allows a successful retry', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce({ data: { errors: { name: ['is unavailable'] } } })
      .mockResolvedValueOnce(undefined)
    const container = mount(() => (
      <Form onFormSubmit={save}>
        <input name="name" value="Luke" />
        <button>Save</button>
      </Form>
    ))
    const form = container.querySelector('form') as HTMLFormElement
    const view = within(document.body)
    fireEvent.submit(form)
    await waitFor(() => expect(view.queryByRole('alert')).not.toBeNull())
    expect(view.getByRole('alert').textContent).toBe('name is unavailable')
    expect(save).toHaveBeenCalledWith({ name: 'Luke' })
    expect(container.querySelector('fieldset')!.disabled).toBe(false)
    fireEvent.submit(form)
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull())
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('calls the submit handlers the parent passed most recently', async () => {
    const first = { submit: vi.fn(), data: vi.fn() }
    const second = { submit: vi.fn(), data: vi.fn() }
    const [handlers, setHandlers] = createSignal(first)
    const container = mount(() => (
      <Form onSubmit={handlers().submit} onFormSubmit={handlers().data}>
        <input name="name" value="Luke" />
      </Form>
    ))
    setHandlers(second)
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(second.submit).toHaveBeenCalledTimes(1))
    expect(first.submit).not.toHaveBeenCalled()
    expect(first.data).not.toHaveBeenCalled()
    expect(second.data).toHaveBeenCalledWith({ name: 'Luke' })
  })

  it('uses the real useForm submit handler without an app-owned error catch', async () => {
    function ProfileForm(): JSX.Element {
      const form = useForm({ defaultValues: { bio: 'Draft bio' } })
      const submit = form.handleSubmit(async () => {
        throw new Error('Save rejected')
      })
      // Form's framework-agnostic onSubmit receives a DOM Event, while useForm's
      // handler takes the event its own form sends — its argument is optional,
      // so invoke the real handler directly and keep the form's native
      // submission prevented (jsdom would navigate).
      return (
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            return submit()
          }}
        >
          <input name="bio" value="Draft bio" />
          <button>Save profile</button>
        </Form>
      )
    }
    const container = mount(() => <ProfileForm />)
    fireEvent.submit(container.querySelector('form')!)
    const view = within(document.body)
    await waitFor(() => expect(view.queryByRole('alert')).not.toBeNull())
    expect(view.getByRole('alert').textContent).toBe('Save rejected')
    expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('Draft bio')
  })

  it('disables the fieldset until the async handler settles', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((done) => {
      resolve = done
    })
    const container = mount(() => (
      <Form onFormSubmit={() => pending}>
        <button>Save</button>
      </Form>
    ))
    fireEvent.submit(container.querySelector('form')!)
    expect(container.querySelector('fieldset')!.disabled).toBe(true)
    resolve()
    await waitFor(() => expect(container.querySelector('fieldset')!.disabled).toBe(false))
    expect(within(document.body).queryByRole('alert')).toBeNull()
  })

  it('keeps native action/method forms and successful forms free of error UI', () => {
    const container = mount(() => (
      <Form action="/search" method="get">
        <input name="q" />
      </Form>
    ))
    const element = container.querySelector('form') as HTMLFormElement
    expect(element.action).toMatch(/\/search$/)
    expect(element.method).toBe('get')
    expect(fireEvent.submit(element)).toBe(true)
    expect(within(document.body).queryByRole('alert')).toBeNull()
  })

  it('lets a controlled error clear an internally captured rejection', async () => {
    const save = async (): Promise<void> => {
      throw new Error('Rejected')
    }
    const [controlled, setControlled] = createSignal(false)
    // The owner passes `submitError` only after the first render — the reactive
    // spread is how a Solid owner changes the props a mounted child receives.
    const extra = (): { submitError?: undefined } =>
      controlled() ? { submitError: undefined } : {}
    const container = mount(() => createComponent(Form, mergeProps({ onFormSubmit: save }, extra)))
    fireEvent.submit(container.querySelector('form')!)
    const view = within(document.body)
    await waitFor(() => expect(view.queryByRole('alert')).not.toBeNull())
    setControlled(true)
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull())
  })

  it('handles an async data-handler rejection even when the native handler throws too', async () => {
    const container = mount(() => (
      <Form
        onFormSubmit={async () => {
          throw new Error('Data rejected')
        }}
        onSubmit={() => {
          throw new Error('Native rejected')
        }}
      />
    ))
    fireEvent.submit(container.querySelector('form')!)
    const view = within(document.body)
    await waitFor(() => expect(view.queryByRole('alert')).not.toBeNull())
    expect(view.getByRole('alert').textContent).toBe('Data rejected')
  })

  it('renders a real HTTP client 400 response without a caller-owned error adapter', async () => {
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            errors: { email: ['is already taken'], displayName: ['is too short'] },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', request)
    const http = createFetchClient({ baseURL: 'https://accounts.example/api' })
    const container = mount(() => (
      <Form
        onFormSubmit={async (data) => {
          await http.post('/registrations', data)
        }}
      >
        <input name="email" value="reader@example.test" />
        <button>Register</button>
      </Form>
    ))
    fireEvent.submit(container.querySelector('form')!)
    const view = within(document.body)
    await waitFor(() => expect(view.queryByRole('alert')).not.toBeNull())
    expect(view.getByRole('alert').textContent).toContain('email is already taken')
    expect(view.getAllByRole('listitem').map((node) => node.textContent)).toEqual([
      'email is already taken',
      'displayName is too short',
    ])
    expect(request).toHaveBeenCalledOnce()
    expect(container.querySelector('fieldset')!.disabled).toBe(false)
  })
})
