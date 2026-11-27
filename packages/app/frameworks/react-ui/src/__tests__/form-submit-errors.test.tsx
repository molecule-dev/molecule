// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '@molecule/app-http'
import { useForm } from '@molecule/app-react'
import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Form } from '../components/Form.js'

beforeEach(() => {
  setClassMap({ formError: 'error', formFieldsetContents: 'contents' } as UIClassMap)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Form submission error defaults', () => {
  it('warns when flattening duplicates and preserves arbitrary field names as own keys', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const save = vi.fn()
    try {
      const { container } = render(
        <Form onFormSubmit={save}>
          <input name="repeated" defaultValue="first" />
          <input name="__proto__" defaultValue="ordinary input" />
          <input name="repeated" defaultValue="last" />
        </Form>,
      )
      const form = container.querySelector('form')
      if (!form) throw new Error('Expected the form')
      await act(async () => {
        fireEvent.submit(form)
      })
      expect(save).toHaveBeenCalledExactlyOnceWith({
        ['__proto__']: 'ordinary input',
        repeated: 'last',
      })
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
    const view = render(
      <Form onFormSubmit={save}>
        <input name="name" defaultValue="Luke" />
        <button>Save</button>
      </Form>,
    )
    fireEvent.submit(view.container.querySelector('form')!)
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toBe('name is unavailable')
    expect(save).toHaveBeenCalledWith({ name: 'Luke' })
    expect(view.container.querySelector('fieldset')!.disabled).toBe(false)
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('calls the submit handlers the parent passed most recently', async () => {
    const first = { submit: vi.fn(), data: vi.fn() }
    const second = { submit: vi.fn(), data: vi.fn() }
    const view = render(
      <Form onSubmit={first.submit} onFormSubmit={first.data}>
        <input name="name" defaultValue="Luke" />
      </Form>,
    )
    view.rerender(
      <Form onSubmit={second.submit} onFormSubmit={second.data}>
        <input name="name" defaultValue="Luke" />
      </Form>,
    )
    await act(async () => {
      fireEvent.submit(view.container.querySelector('form')!)
    })
    expect(first.submit).not.toHaveBeenCalled()
    expect(first.data).not.toHaveBeenCalled()
    expect(second.submit).toHaveBeenCalledTimes(1)
    expect(second.data).toHaveBeenCalledWith({ name: 'Luke' })
  })

  it('uses the real useForm submit handler without an app-owned error catch', async () => {
    function ProfileForm() {
      const form = useForm({ defaultValues: { bio: 'Draft bio' } })
      const submit = form.handleSubmit(async () => {
        throw new Error('Save rejected')
      })
      // Form's framework-agnostic onSubmit receives a DOM Event, while useForm's
      // handler takes the React FormEvent it gets from a React form — its own
      // event argument is optional, so invoke the real handler directly and
      // keep the form's native submission prevented (jsdom would navigate).
      return (
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            return submit()
          }}
        >
          <input name="bio" defaultValue="Draft bio" />
          <button>Save profile</button>
        </Form>
      )
    }
    const view = render(<ProfileForm />)
    fireEvent.submit(view.container.querySelector('form')!)
    expect((await screen.findByRole('alert')).textContent).toBe('Save rejected')
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Draft bio')
  })

  it('disables the fieldset until the async handler settles', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((done) => {
      resolve = done
    })
    const view = render(
      <Form onFormSubmit={() => pending}>
        <button>Save</button>
      </Form>,
    )
    fireEvent.submit(view.container.querySelector('form')!)
    expect(view.container.querySelector('fieldset')!.disabled).toBe(true)
    await act(async () => resolve())
    expect(view.container.querySelector('fieldset')!.disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps native action/method forms and successful forms free of error UI', () => {
    const view = render(
      <Form action="/search" method="get">
        <input name="q" />
      </Form>,
    )
    const element = view.container.querySelector('form')!
    expect(element.action).toMatch(/\/search$/)
    expect(element.method).toBe('get')
    expect(fireEvent.submit(element)).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lets a controlled error clear an internally captured rejection', async () => {
    const save = async () => {
      throw new Error('Rejected')
    }
    const view = render(<Form onFormSubmit={save} />)
    fireEvent.submit(view.container.querySelector('form')!)
    await screen.findByRole('alert')
    view.rerender(<Form onFormSubmit={save} submitError={undefined} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('handles an async data-handler rejection even when the native handler throws too', async () => {
    const view = render(
      <Form
        onFormSubmit={async () => {
          throw new Error('Data rejected')
        }}
        onSubmit={() => {
          throw new Error('Native rejected')
        }}
      />,
    )
    fireEvent.submit(view.container.querySelector('form')!)
    expect((await screen.findByRole('alert')).textContent).toBe('Data rejected')
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
    const view = render(
      <Form
        onFormSubmit={async (data) => {
          await http.post('/registrations', data)
        }}
      >
        <input name="email" defaultValue="reader@example.test" />
        <button>Register</button>
      </Form>,
    )
    fireEvent.submit(view.container.querySelector('form')!)
    expect((await screen.findByRole('alert')).textContent).toContain('email is already taken')
    expect(screen.getAllByRole('listitem').map((node) => node.textContent)).toEqual([
      'email is already taken',
      'displayName is too short',
    ])
    expect(request).toHaveBeenCalledOnce()
    expect(view.container.querySelector('fieldset')!.disabled).toBe(false)
  })

  it("shows a refused request's { error } sentence, not the transport's status line", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: 'Invalid credentials.',
              errorKey: 'user.error.invalidCredentials',
            }),
            { status: 401, headers: { 'content-type': 'application/json' } },
          ),
      ),
    )
    const http = createFetchClient({ baseURL: 'https://accounts.example/api' })
    const view = render(
      <Form
        onFormSubmit={async (data) => {
          await http.post('/users/log-in', data)
        }}
      >
        <input name="email" defaultValue="reader@example.test" />
        <button>Log in</button>
      </Form>,
    )
    fireEvent.submit(view.container.querySelector('form')!)
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid credentials.')
  })

  it("shows a plain Error's own message", async () => {
    const view = render(
      <Form
        onFormSubmit={async () => {
          throw new Error('Passwords do not match.')
        }}
      >
        <button>Save</button>
      </Form>,
    )
    fireEvent.submit(view.container.querySelector('form')!)
    expect((await screen.findByRole('alert')).textContent).toBe('Passwords do not match.')
  })
})
