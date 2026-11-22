// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React package's own tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The same markers the React suite's UI mocks render.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element }) => <button data-button="">{props.children}</button>,
  Input: () => <input data-input="" />,
  Textarea: () => <textarea data-textarea="" />,
}))

const { InlineEdit } = await import('../InlineEdit.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders an {@link InlineEdit} and returns the markup it produced. */
const html = (props: Parameters<typeof InlineEdit>[0]): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <InlineEdit {...props} />, container))
  return container.innerHTML
}

// The edit state only appears after a click; SSR covers the read state.
describe('InlineEdit (read state)', () => {
  it('renders the value as plain text', () => {
    const markup = html({ value: 'Hello world', onSubmit: () => {} })
    expect(markup).toContain('Hello world')
  })

  it('exposes a button role for the read-state trigger', () => {
    const markup = html({ value: 'x', onSubmit: () => {} })
    expect(markup).toContain('role="button"')
  })

  it('shows the placeholder when the value is empty', () => {
    const def = html({ value: '', onSubmit: () => {} })
    expect(def).toContain('Click to edit')
    const custom = html({ value: '', onSubmit: () => {}, placeholder: 'Add a title' })
    expect(custom).toContain('Add a title')
  })

  it('uses renderRead to format the value when supplied', () => {
    const markup = html({
      value: 'raw',
      onSubmit: () => {},
      renderRead: (v: string): JSX.Element => <strong data-read="">{v.toUpperCase()}</strong>,
    })
    expect(markup).toContain('data-read=""')
    expect(markup).toContain('RAW')
  })

  it('does not render the editor inputs before being clicked', () => {
    const markup = html({ value: 'x', onSubmit: () => {} })
    expect(markup).not.toContain('data-input')
    expect(markup).not.toContain('data-textarea')
  })

  it('forwards className', () => {
    const markup = html({ value: 'x', onSubmit: () => {}, className: 'ie-cls' })
    expect(markup).toContain('ie-cls')
  })
})
