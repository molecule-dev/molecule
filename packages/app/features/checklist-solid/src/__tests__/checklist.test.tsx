// @vitest-environment jsdom
/**
 * Unit tests for the Solid `Checklist` — a port of
 * `@molecule/app-checklist-react/src/__tests__/checklist.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChecklistItem } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// `t(key, values, opts)` interpolates `{{name}}` into the supplied
// `defaultValue`, as the i18n core does.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

// The Checkbox marker the React tests mock `@molecule/app-ui-react` with: an
// input carrying `data-checkbox`.
vi.mock('@molecule/app-ui-solid', () => ({
  Checkbox: (props: { checked?: boolean; disabled?: boolean }) => (
    <input type="checkbox" data-checkbox="" checked={props.checked} disabled={props.disabled} />
  ),
}))

const { Checklist } = await import('../Checklist.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** The props a test renders the checklist with. */
interface DrawProps {
  items: ChecklistItem[]
  onToggle?: (id: string, next: boolean) => void
  showProgress?: boolean
  title?: JSX.Element
  className?: string
}

/** Renders {@link Checklist} with Solid's browser renderer and returns its markup. */
function draw(props: DrawProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <Checklist
          items={props.items}
          onToggle={props.onToggle ?? (() => {})}
          showProgress={props.showProgress}
          title={props.title}
          className={props.className}
        />
      ),
      container,
    ),
  )
  return container.innerHTML
}

const items = [
  { id: 'a', label: 'Set up profile', completed: true },
  { id: 'b', label: 'Invite team', completed: false, description: 'Add at least one teammate' },
]

describe('Checklist', () => {
  it('renders every item label', () => {
    const markup = draw({ items, onToggle: () => {} })
    expect(markup).toContain('Set up profile')
    expect(markup).toContain('Invite team')
  })

  it('renders an item description when present', () => {
    const markup = draw({ items, onToggle: () => {} })
    expect(markup).toContain('Add at least one teammate')
  })

  it('renders the progress summary and bar by default', () => {
    const markup = draw({ items, onToggle: () => {} })
    expect(markup).toContain('1 of 2 complete')
    expect(markup).toContain('50%')
    expect(markup).toContain('width: 50%')
  })

  it('omits the progress block when showProgress is false', () => {
    const markup = draw({ items, onToggle: () => {}, showProgress: false })
    expect(markup).not.toContain('complete')
    expect(markup).not.toContain('width: 50%')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(draw({ items, onToggle: () => {}, title: 'Get started' })).toContain('Get started')
    expect(draw({ items, onToggle: () => {} })).not.toContain('<h3')
  })

  it('strikes through completed items', () => {
    const markup = draw({ items, onToggle: () => {} })
    expect(markup).toContain('line-through')
  })

  it('forwards className', () => {
    const markup = draw({ items, onToggle: () => {}, className: 'cl-cls' })
    expect(markup).toContain('cl-cls')
  })
})
