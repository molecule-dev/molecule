// @vitest-environment jsdom
/**
 * Form submission error defaults — Vue port of
 * `@molecule/app-ui-react/src/__tests__/form-submit-errors.test.tsx`. A
 * rejected `onFormSubmit` (or the real `useForm` handler) renders an
 * accessible error list by default, the fieldset is disabled while the
 * handler is pending, a controlled `submitError` overrides and clears the
 * captured rejection, and native action/method forms are left alone.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    formError: 'error',
    formFieldsetContents: 'contents',
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
  }),
}))

import { type BoundFunctions, type queries, waitFor, within } from '@testing-library/dom'
import {
  type App,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  shallowRef,
  type VNodeChild,
} from 'vue'

import { createFetchClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { useForm } = await import('@molecule/app-vue')
const { Form } = await import('../components/Form.js')

setProvider(createSimpleI18nProvider())

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  vi.unstubAllGlobals()
})

const body = (): BoundFunctions<typeof queries> => within(document.body)

/**
 * Mounts a render function into a fresh host.
 *
 * @param render - The component render.
 */
function mount(render: () => VNodeChild): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
}

/**
 * The mounted form element.
 *
 * @returns The `<form>`.
 */
function formEl(): HTMLFormElement {
  const el = document.querySelector<HTMLFormElement>('form')
  if (!el) throw new Error('no form element')
  return el
}

/**
 * The mounted fieldset.
 *
 * @returns The `<fieldset>`.
 */
function fieldsetEl(): HTMLFieldSetElement {
  const el = document.querySelector<HTMLFieldSetElement>('fieldset')
  if (!el) throw new Error('no fieldset element')
  return el
}

/**
 * Dispatches a submit event on the mounted form, the way a browser (and
 * React's `fireEvent.submit`) does.
 */
function submit(): void {
  formEl().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('Form submission error defaults', () => {
  it('warns when flattening duplicates and preserves arbitrary field names as own keys', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const save = vi.fn()
    try {
      mount(() =>
        h(Form, { onFormSubmit: save }, () => [
          h('input', { name: 'repeated', value: 'first' }),
          h('input', { name: '__proto__', value: 'ordinary input' }),
          h('input', { name: 'repeated', value: 'last' }),
        ]),
      )
      submit()
      await nextTick()
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
    mount(() =>
      h(
        Form,
        { onFormSubmit: save },
        () =>
          [
            h('input', { name: 'name', value: 'Luke' }),
            h('button', { type: 'submit' }, 'Save'),
          ] as VNodeChild[],
      ),
    )
    submit()
    await waitFor(() => expect(body().queryByRole('alert')).toBeTruthy())
    expect(body().getByRole('alert').textContent).toBe('name is unavailable')
    expect(save).toHaveBeenCalledWith({ name: 'Luke' })
    expect(fieldsetEl().disabled).toBe(false)
    submit()
    await waitFor(() => expect(body().queryByRole('alert')).toBeNull())
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('calls the submit handlers the parent passed most recently', async () => {
    const first = { submit: vi.fn(), data: vi.fn() }
    const second = { submit: vi.fn(), data: vi.fn() }
    const handlers = shallowRef(first)
    mount(() =>
      h(
        Form,
        { onSubmit: handlers.value.submit, onFormSubmit: handlers.value.data },
        () => [h('input', { name: 'name', value: 'Luke' })] as VNodeChild[],
      ),
    )
    handlers.value = second
    await nextTick()
    submit()
    await nextTick()
    expect(first.submit).not.toHaveBeenCalled()
    expect(first.data).not.toHaveBeenCalled()
    expect(second.submit).toHaveBeenCalledTimes(1)
    expect(second.data).toHaveBeenCalledWith({ name: 'Luke' })
  })

  it('uses the real useForm submit handler without an app-owned error catch', async () => {
    const ProfileForm = defineComponent({
      setup() {
        const form = useForm({ defaultValues: { bio: 'Draft bio' } })
        const submitHandler = form.handleSubmit(async () => {
          throw new Error('Save rejected')
        })
        // Form's onSubmit receives the submit event (typed as the kits' shared
        // KitEvent), while useForm's handler takes the event it is given —
        // invoke the real handler and keep the native submission prevented
        // (jsdom would navigate).
        return () =>
          h(
            Form,
            {
              onSubmit: (event) => {
                event.preventDefault()
                return submitHandler()
              },
              // The slot children are rebuilt per render.
            },
            () =>
              [
                h('input', { name: 'bio', value: 'Draft bio' }),
                h('button', { type: 'submit' }, 'Save profile'),
              ] as VNodeChild[],
          )
      },
    })
    mount(() => h(ProfileForm))
    submit()
    await waitFor(() => expect(body().queryByRole('alert')).toBeTruthy())
    expect(body().getByRole('alert').textContent).toBe('Save rejected')
    expect((body().getByRole('textbox') as HTMLInputElement).value).toBe('Draft bio')
  })

  it('disables the fieldset until the async handler settles', async () => {
    let resolve: () => void = () => {}
    const pending = new Promise<void>((done) => {
      resolve = done
    })
    mount(() => h(Form, { onFormSubmit: () => pending }, () => h('button', 'Save')))
    submit()
    // Vue flushes the pending render on the next tick (React's is synchronous).
    await nextTick()
    expect(fieldsetEl().disabled).toBe(true)
    resolve()
    await waitFor(() => expect(fieldsetEl().disabled).toBe(false))
    expect(body().queryByRole('alert')).toBeNull()
  })

  it('keeps native action/method forms and successful forms free of error UI', () => {
    mount(() => h(Form, { action: '/search', method: 'get' }, () => h('input', { name: 'q' })))
    const element = formEl()
    expect(element.action).toMatch(/\/search$/)
    expect(element.method).toBe('get')
    expect(element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(
      true,
    )
    expect(body().queryByRole('alert')).toBeNull()
  })

  it('lets a controlled error clear an internally captured rejection', async () => {
    const save = async (): Promise<void> => {
      throw new Error('Rejected')
    }
    const controlled = ref(false)
    mount(() =>
      h(
        Form,
        controlled.value ? { onFormSubmit: save, submitError: undefined } : { onFormSubmit: save },
      ),
    )
    submit()
    await waitFor(() => expect(body().queryByRole('alert')).toBeTruthy())
    controlled.value = true
    await nextTick()
    expect(body().queryByRole('alert')).toBeNull()
  })

  it('handles an async data-handler rejection even when the native handler throws too', async () => {
    mount(() =>
      h(Form, {
        onFormSubmit: async () => {
          throw new Error('Data rejected')
        },
        onSubmit: () => {
          throw new Error('Native rejected')
        },
      }),
    )
    submit()
    await waitFor(() => expect(body().queryByRole('alert')).toBeTruthy())
    expect(body().getByRole('alert').textContent).toBe('Data rejected')
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
    mount(() =>
      h(
        Form,
        {
          onFormSubmit: async (data: Record<string, unknown>) => {
            await http.post('/registrations', data)
          },
        },
        () =>
          [
            h('input', { name: 'email', value: 'reader@example.test' }),
            h('button', { type: 'submit' }, 'Register'),
          ] as VNodeChild[],
      ),
    )
    submit()
    await waitFor(() => expect(body().queryByRole('alert')).toBeTruthy())
    expect(body().getByRole('alert').textContent).toContain('email is already taken')
    expect(
      body()
        .getAllByRole('listitem')
        .map((node: HTMLElement) => node.textContent),
    ).toEqual(['email is already taken', 'displayName is too short'])
    expect(request).toHaveBeenCalledOnce()
    await waitFor(() => expect(fieldsetEl().disabled).toBe(false))
  })
})
