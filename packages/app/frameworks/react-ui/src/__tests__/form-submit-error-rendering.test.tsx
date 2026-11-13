// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Form } from '../components/Form.js'

beforeEach(() => {
  setClassMap({ formError: 'error', formFieldsetContents: 'contents' } as UIClassMap)
})
afterEach(cleanup)

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
      render(
        <Form submitError={submitError}>
          <input name="email" defaultValue="taken@example.test" />
        </Form>,
      )
      expect(screen.queryByRole('alert')?.textContent).toContain('email is already taken')
      expect(screen.queryAllByRole('listitem').map((node) => node.textContent)).toEqual([
        'email is already taken',
        'name is too short',
      ])
      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('taken@example.test')
      expect(document.querySelector('form')!.hasAttribute('submitError')).toBe(false)
    },
  )

  it('renders controlled non-X1 invoice errors as text and ignores malformed fields', () => {
    render(
      <Form
        submitError={{
          response: {
            data: {
              errors: { total: 'must be positive', ref: ['<script>bad()</script>', null, {}] },
            },
          },
        }}
      />,
    )
    expect(screen.queryAllByRole('listitem').map((node) => node.textContent)).toEqual([
      'total must be positive',
      'ref <script>bad()</script>',
    ])
    expect(document.querySelector('script')).toBeNull()
  })

  it.each([new Error('Offline'), { data: { errors: { field: [null, {}] } } }, null])(
    'renders a controlled ordinary or malformed failure instead of an empty error list: %#',
    (error) => {
      render(<Form submitError={error} />)
      expect(screen.queryByRole('alert')?.textContent).toBe(
        error instanceof Error ? 'Offline' : 'Unable to submit. Please try again.',
      )
    },
  )
})
