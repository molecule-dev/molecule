// @vitest-environment jsdom
/**
 * Render tests for `Form`'s controlled `submitError` path: the error list is
 * rendered as text from each supported server envelope, malformed field
 * entries are ignored, and the failure never leaks onto the `<form>` element.
 * Solid counterpart of `@molecule/app-ui-react`'s
 * `form-submit-error-rendering.test.tsx`.
 *
 * @module
 */
import { within } from '@testing-library/dom'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
})

/** Mounts a Solid view into a fresh container and returns that container. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
      mount(() => (
        <Form submitError={submitError}>
          <input name="email" value="taken@example.test" />
        </Form>
      ))
      const view = within(document.body)
      expect(view.queryByRole('alert')?.textContent).toContain('email is already taken')
      expect(view.queryAllByRole('listitem').map((node) => node.textContent)).toEqual([
        'email is already taken',
        'name is too short',
      ])
      expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('taken@example.test')
      expect(document.querySelector('form')!.hasAttribute('submitError')).toBe(false)
    },
  )

  it('renders controlled non-X1 invoice errors as text and ignores malformed fields', () => {
    mount(() => (
      <Form
        submitError={{
          response: {
            data: {
              errors: { total: 'must be positive', ref: ['<script>bad()</script>', null, {}] },
            },
          },
        }}
      />
    ))
    const view = within(document.body)
    expect(view.queryAllByRole('listitem').map((node) => node.textContent)).toEqual([
      'total must be positive',
      'ref <script>bad()</script>',
    ])
    expect(document.querySelector('script')).toBeNull()
  })

  it.each([new Error('Offline'), { data: { errors: { field: [null, {}] } } }, null])(
    'renders a controlled ordinary or malformed failure instead of an empty error list: %#',
    (error) => {
      mount(() => <Form submitError={error} />)
      const view = within(document.body)
      expect(view.queryByRole('alert')?.textContent).toBe(
        error instanceof Error ? 'Offline' : 'Unable to submit. Please try again.',
      )
    },
  )
})
