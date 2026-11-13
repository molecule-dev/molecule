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

  it('uses the real useForm submit handler without an app-owned error catch', async () => {
    function ProfileForm() {
      const form = useForm({ defaultValues: { bio: 'Draft bio' } })
      return (
        <Form
          onSubmit={form.handleSubmit(async () => {
            throw new Error('Save rejected')
          })}
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
})
