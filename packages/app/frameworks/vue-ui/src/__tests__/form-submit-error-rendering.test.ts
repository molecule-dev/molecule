// @vitest-environment jsdom
/**
 * Controlled Form error rendering — Vue port of
 * `@molecule/app-ui-react/src/__tests__/form-submit-error-rendering.test.tsx`:
 * the `submitError` prop is read without an HTTP transport, field errors
 * render as text (never HTML), malformed entries are ignored, and an
 * ordinary or empty failure shows a translated fallback instead of an empty
 * list.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    formError: 'error',
    formFieldsetContents: 'contents',
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
  }),
}))

import { type BoundFunctions, type queries, within } from '@testing-library/dom'
import { type App, createApp, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { Form } = await import('../components/Form.js')

setProvider(createSimpleI18nProvider())

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

const body = (): BoundFunctions<typeof queries> => within(document.body)

/**
 * Mounts a Form with the given controlled `submitError`, overridable children.
 *
 * @param submitError - The controlled failure value.
 * @param children - Slot content (defaults to an email input).
 */
function mountForm(submitError: unknown, children?: () => VNodeChild[]): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({
    render: () =>
      h(
        Form,
        { submitError },
        children ?? (() => [h('input', { name: 'email', value: 'taken@example.test' })]),
      ),
  })
  apps.push(app)
  app.mount(host)
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
      mountForm(submitError)
      expect(body().queryByRole('alert')?.textContent).toContain('email is already taken')
      expect(
        body()
          .queryAllByRole('listitem')
          .map((node: HTMLElement) => node.textContent),
      ).toEqual(['email is already taken', 'name is too short'])
      expect((body().getByRole('textbox') as HTMLInputElement).value).toBe('taken@example.test')
      expect(document.querySelector('form')!.hasAttribute('submitError')).toBe(false)
    },
  )

  it('renders controlled non-X1 invoice errors as text and ignores malformed fields', () => {
    mountForm(
      {
        response: {
          data: {
            errors: { total: 'must be positive', ref: ['<script>bad()</script>', null, {}] },
          },
        },
      },
      () => [],
    )
    expect(
      body()
        .queryAllByRole('listitem')
        .map((node: HTMLElement) => node.textContent),
    ).toEqual(['total must be positive', 'ref <script>bad()</script>'])
    expect(document.querySelector('script')).toBeNull()
  })

  it.each([new Error('Offline'), { data: { errors: { field: [null, {}] } } }, null])(
    'renders a controlled ordinary or malformed failure instead of an empty error list: %#',
    (error) => {
      mountForm(error, () => [])
      expect(body().queryByRole('alert')?.textContent).toBe(
        error instanceof Error ? 'Offline' : 'Unable to submit. Please try again.',
      )
    },
  )
})
