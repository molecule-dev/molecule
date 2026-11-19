// @vitest-environment jsdom
/**
 * Form submission error defaults: an async `onFormSubmit` rejection renders an
 * accessible error list and allows a retry; the real `useForm` submit handler
 * works without an app-owned catch; the fieldset disables until the handler
 * settles; native action/method and successful forms stay free of error UI; a
 * controlled error clears an internally captured rejection; a data-handler
 * rejection wins even when the native handler also throws; and a real HTTP
 * client 400 renders without a caller-owned adapter.
 *
 * Port of `@molecule/app-ui-react/src/__tests__/form-submit-errors.test.tsx`.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof AppSvelte>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
  }
})

import { fireEvent, screen, waitFor } from '@testing-library/dom'
import { type Component, createRawSnippet, flushSync, mount, unmount } from 'svelte'

import { createFetchClient } from '@molecule/app-http'
import type * as AppSvelte from '@molecule/app-svelte'
import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

const { default: Form } = await import('../components/Form.svelte')
const { default: ProfileFormHost } = await import('./ProfileFormHost.svelte')
const { default: FormControlledErrorHost } = await import('./FormControlledErrorHost.svelte')
const { default: FormHandlerSwapHost } = await import('./FormHandlerSwapHost.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

beforeEach(() => {
  setClassMap({ formError: 'error', formFieldsetContents: 'contents' } as UIClassMap)
})
afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

/**
 * A snippet rendering the given raw HTML.
 *
 * @param html - The HTML to render.
 * @returns The snippet.
 */
function snippetOf(html: string) {
  return createRawSnippet(() => ({ render: () => html }))
}

/**
 * Mounts a component into a fresh host.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The mount host and the mounted instance.
 */
function render<Props extends Record<string, unknown>, Exports extends Record<string, unknown>>(
  component: Component<Props, Exports>,
  props: Props,
): { host: HTMLElement; instance: Exports } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const instance = mount(component, { target: host, props })
  mounted.push(instance)
  flushSync()
  return { host, instance }
}

/** The first `<form>` in the document. */
const formElement = (): HTMLFormElement => document.querySelector('form') as HTMLFormElement

describe('Form submission error defaults', () => {
  it('catches an async onFormSubmit failure, renders it, and allows a successful retry', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce({ data: { errors: { name: ['is unavailable'] } } })
      .mockResolvedValueOnce(undefined)
    const { host } = render(Form, {
      onFormSubmit: save,
      children: snippetOf('<input name="name" value="Luke" /><button>Save</button>'),
    })
    fireEvent.submit(formElement())
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toBe('name is unavailable')
    expect(save).toHaveBeenCalledWith({ name: 'Luke' })
    expect(host.querySelector('fieldset')!.disabled).toBe(false)
    fireEvent.submit(formElement())
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('calls the submit handlers the parent passed most recently', async () => {
    const first = { onSubmit: vi.fn(), onFormSubmit: vi.fn() }
    const second = { onSubmit: vi.fn(), onFormSubmit: vi.fn() }
    const { instance } = render(FormHandlerSwapHost, { first, second })
    instance.swapHandlers()
    flushSync()
    fireEvent.submit(formElement())
    await waitFor(() => expect(second.onSubmit).toHaveBeenCalledTimes(1))
    expect(first.onSubmit).not.toHaveBeenCalled()
    expect(first.onFormSubmit).not.toHaveBeenCalled()
    expect(second.onFormSubmit).toHaveBeenCalledWith({ name: 'Luke' })
  })

  it('uses the real useForm submit handler without an app-owned error catch', async () => {
    render(ProfileFormHost, {})
    fireEvent.submit(formElement())
    expect((await screen.findByRole('alert')).textContent).toBe('Save rejected')
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Draft bio')
  })

  it('disables the fieldset until the async handler settles', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((done) => {
      resolve = done
    })
    const { host } = render(Form, {
      onFormSubmit: () => pending,
      children: snippetOf('<button>Save</button>'),
    })
    fireEvent.submit(formElement())
    flushSync()
    expect(host.querySelector('fieldset')!.disabled).toBe(true)
    resolve()
    await waitFor(() => expect(host.querySelector('fieldset')!.disabled).toBe(false))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps native action/method forms and successful forms free of error UI', () => {
    render(Form, {
      action: '/search',
      method: 'get',
      children: snippetOf('<input name="q" />'),
    })
    const element = formElement()
    expect(element.action).toMatch(/\/search$/)
    expect(element.method).toBe('get')
    expect(fireEvent.submit(element)).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lets a controlled error clear an internally captured rejection', async () => {
    const save = async () => {
      throw new Error('Rejected')
    }
    const { instance } = render(FormControlledErrorHost, { onFormSubmit: save })
    fireEvent.submit(formElement())
    await screen.findByRole('alert')
    instance.clearSubmitError()
    flushSync()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('handles an async data-handler rejection even when the native handler throws too', async () => {
    render(Form, {
      onFormSubmit: async () => {
        throw new Error('Data rejected')
      },
      onSubmit: () => {
        throw new Error('Native rejected')
      },
      children: snippetOf('<span></span>'),
    })
    fireEvent.submit(formElement())
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
    const { host } = render(Form, {
      onFormSubmit: async (data: Record<string, unknown>) => {
        await http.post('/registrations', data)
      },
      children: snippetOf(
        '<input name="email" value="reader@example.test" /><button>Register</button>',
      ),
    })
    fireEvent.submit(formElement())
    expect((await screen.findByRole('alert')).textContent).toContain('email is already taken')
    expect(screen.getAllByRole('listitem').map((node) => node.textContent)).toEqual([
      'email is already taken',
      'displayName is too short',
    ])
    expect(request).toHaveBeenCalledOnce()
    expect(host.querySelector('fieldset')!.disabled).toBe(false)
  })
})
