// @vitest-environment jsdom
/**
 * Controlled `Form` error rendering: the shared error reader renders
 * non-X1 invoice error bodies as text and ignores malformed field entries.
 *
 * Port of `@molecule/app-ui-react/src/__tests__/form-submit-error-rendering.test.tsx`.
 *
 * @module
 */
import { createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

const { default: Form } = await import('../components/Form.svelte')

const { within } = await import('@testing-library/dom')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

beforeEach(() => {
  setClassMap({ formError: 'error', formFieldsetContents: 'contents' } as UIClassMap)
})
afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

/**
 * Mounts a Form with the given props.
 *
 * @param props - The Form props.
 * @param childrenHtml - The markup the form's children render.
 * @returns The mount host.
 */
function mountForm(props: Record<string, unknown>, childrenHtml = '<span></span>'): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(
    mount(Form, {
      target: host,
      props: {
        ...props,
        children: createRawSnippet(() => ({ render: () => childrenHtml })),
      },
    }),
  )
  flushSync()
  return host
}

describe('controlled Form error rendering', () => {
  it.each([
    { status: 400, data: { errors: { email: ['is already taken'], name: ['is too short'] } } },
    {
      status: 422,
      response: { data: { errors: { email: ['is already taken'], name: ['is too short'] } } },
    },
    { status: 400, body: { errors: { email: ['is already taken'], name: ['is too short'] } } },
  ])(
    'renders controlled P342-shaped field errors from each supported error body: %#',
    (submitError) => {
      const host = mountForm({ submitError }, '<input name="email" value="taken@example.test" />')
      const query = within(document.body)
      expect(query.queryByRole('alert')?.textContent).toContain('email is already taken')
      expect(query.queryAllByRole('listitem').map((node) => node.textContent)).toEqual([
        'email is already taken',
        'name is too short',
      ])
      const textbox = query.getByRole('textbox')
      expect(textbox instanceof HTMLInputElement ? textbox.value : null).toBe('taken@example.test')
      expect(host.querySelector('form')?.hasAttribute('submitError')).toBe(false)
    },
  )

  it('renders controlled non-X1 invoice errors as text and ignores malformed fields', () => {
    mountForm({
      submitError: {
        response: {
          data: {
            errors: { total: 'must be positive', ref: ['<script>bad()</script>', null, {}] },
          },
        },
      },
    })
    expect(
      within(document.body)
        .queryAllByRole('listitem')
        .map((node) => node.textContent),
    ).toEqual(['total must be positive', 'ref <script>bad()</script>'])
    expect(document.querySelector('script')).toBeNull()
  })

  it.each([new Error('Offline'), { data: { errors: { field: [null, {}] } } }, null])(
    'renders a controlled ordinary or malformed failure instead of an empty error list: %#',
    (error) => {
      mountForm({ submitError: error })
      expect(within(document.body).queryByRole('alert')?.textContent).toBe(
        error instanceof Error ? 'Offline' : 'Unable to submit. Please try again.',
      )
    },
  )
})
