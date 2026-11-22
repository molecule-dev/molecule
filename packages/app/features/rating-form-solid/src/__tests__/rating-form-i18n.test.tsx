// @vitest-environment jsdom
/**
 * The comment field's label goes through i18n — the Solid port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. The React
 * original had the label as the English literal `"Comment"` in the JSX (found
 * by the pseudo-locale check); these tests mock `useTranslation` with a `t`
 * that marks every key, so a string that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Solid suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset' | 'menu'
  }) => (
    <button data-button="" type={props.type ?? 'button'} disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Textarea: (props: { placeholder?: string; 'aria-label'?: string }) => (
    <textarea data-textarea="" placeholder={props.placeholder} aria-label={props['aria-label']} />
  ),
}))

const { RatingForm } = await import('../RatingForm.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Mounts a {@link RatingForm} and returns the container it rendered into.
 *
 * @param props - Props over the required `onSubmit`.
 * @returns The container.
 */
function mount(props: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <RatingForm onSubmit={() => {}} {...props} />, container))
  return container
}

describe('RatingForm i18n', () => {
  it('renders the comment field label through t', () => {
    expect(mount().innerHTML).toContain('aria-label="«rating.comment»"')
  })

  it('an explicit commentPlaceholder overrides the translated placeholder', () => {
    const markup = mount({ commentPlaceholder: 'Tell us more' }).innerHTML
    expect(markup).toContain('placeholder="Tell us more"')
    expect(markup).not.toContain('«rating.commentPlaceholder»')
  })
})
