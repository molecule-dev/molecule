// @vitest-environment jsdom
/**
 * Unit tests for the Solid `CollapsibleSection` and `ShowMore` — a port of
 * `@molecule/app-collapsible-section-react/src/__tests__/collapsible-section.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import { createSignal, For, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { CollapsibleSection, ShowMore } = await import('../CollapsibleSection.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders a view with Solid's browser renderer and returns the container's markup. */
function mount(view: () => JSX.Element): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

/** The body marker the React tests render as a `<p data-body>` child. */
const body = (): JSX.Element => <p data-body="">hidden body</p>

/** `initialCount` items, each marked with its index — the React tests' `<div data-item>`. */
const items = (count: number): JSX.Element[] =>
  Array.from({ length: count }, (_value, index) => (
    <div data-item={String(index)}>{`item-${index}`}</div>
  ))

describe('CollapsibleSection', () => {
  it('renders the title and starts collapsed', () => {
    const markup = mount(() => (
      <CollapsibleSection title="Key concepts">{body()}</CollapsibleSection>
    ))
    expect(markup).toContain('Key concepts')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('data-body=""')
  })

  it('renders the body when defaultExpanded is true', () => {
    const markup = mount(() => (
      <CollapsibleSection title="T" defaultExpanded={true}>
        {body()}
      </CollapsibleSection>
    ))
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-body=""')
  })

  it('respects the controlled expanded prop', () => {
    const markup = mount(() => (
      <CollapsibleSection title="T" expanded={true}>
        {body()}
      </CollapsibleSection>
    ))
    expect(markup).toContain('data-body=""')
  })

  it('renders the badge and actions slots', () => {
    const markup = mount(() => (
      <CollapsibleSection
        title="T"
        badge={<span data-badge="" />}
        actions={<span data-actions="" />}
      />
    ))
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the heading at the requested level', () => {
    const markup = mount(() => <CollapsibleSection title="T" level={2} />)
    expect(markup).toContain('<h2')
  })

  it('forwards className', () => {
    const markup = mount(() => <CollapsibleSection title="T" className="cs-cls" />)
    expect(markup).toContain('cs-cls')
  })
})

describe('ShowMore', () => {
  it('renders only the initialCount items by default', () => {
    const markup = mount(() => <ShowMore initialCount={3}>{items(5)}</ShowMore>)
    expect(markup).toContain('item-0')
    expect(markup).toContain('item-2')
    expect(markup).not.toContain('item-3')
  })

  it('renders a "Show N more" toggle when there are extra items', () => {
    const markup = mount(() => <ShowMore initialCount={3}>{items(5)}</ShowMore>)
    expect(markup).toContain('Show 2 more')
  })

  it('renders no toggle when all items fit within initialCount', () => {
    const markup = mount(() => <ShowMore initialCount={3}>{items(2)}</ShowMore>)
    expect(markup).not.toContain('Show')
  })

  it('forwards className', () => {
    const markup = mount(() => <ShowMore className="sm-cls">{items(2)}</ShowMore>)
    expect(markup).toContain('sm-cls')
  })

  it('counts items added through a <For> and drops the toggle when it shrinks', () => {
    const [values, setValues] = createSignal(['a', 'b', 'c', 'd'])
    const container = document.createElement('div')
    document.body.appendChild(container)
    disposers.push(
      render(
        () => (
          <ShowMore initialCount={3}>
            <For each={values()}>{(value) => <div data-item={value}>{value}</div>}</For>
          </ShowMore>
        ),
        container,
      ),
    )
    expect(container.textContent).toContain('Show 1 more')

    setValues(['a', 'b', 'c', 'd', 'e'])
    expect(container.textContent).toContain('Show 2 more')

    setValues(['a', 'b'])
    expect(container.textContent).not.toContain('Show')
    expect(container.querySelectorAll('[data-item]')).toHaveLength(2)

    setValues([])
    expect(container.querySelectorAll('[data-item]')).toHaveLength(0)
  })
})
