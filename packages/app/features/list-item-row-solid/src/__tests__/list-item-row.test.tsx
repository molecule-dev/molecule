// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ListItemRow` — a port of
 * `@molecule/app-list-item-row-react/src/__tests__/list-item-row.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces. The disabled row's dimmed opacity is set
 * through the CSSOM, so jsdom serializes it with a space (`opacity: 0.5`) —
 * the same live-DOM spelling a mounted React tree produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ListItemRowProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

const { ListItemRow } = await import('../ListItemRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and return the mounted container. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** The markup the given props produced. */
const markupOf = (props: ListItemRowProps): string => {
  const container = mount(() => <ListItemRow {...props} />)
  return container.innerHTML
}

/** The open button a mounted clickable row produced. */
const openButton = (container: HTMLElement): HTMLButtonElement => {
  const button = container.querySelector<HTMLButtonElement>(
    'button[data-mol-id="list-item-row-open"]',
  )
  expect(button, 'a clickable row renders the open button').not.toBeNull()
  return button as HTMLButtonElement
}

describe('ListItemRow', () => {
  it('renders the title', () => {
    const markup = markupOf({ title: 'Inbox' })
    expect(markup).toContain('Inbox')
  })

  it('renders subtitle and metadata when present and omits them otherwise', () => {
    const full = markupOf({ title: 'T', subtitle: 'sub-x', metadata: 'meta-x' })
    expect(full).toContain('sub-x')
    expect(full).toContain('meta-x')
    const bare = markupOf({ title: 'T' })
    expect(bare).not.toContain('sub-x')
    expect(bare).not.toContain('meta-x')
  })

  it('renders the leading and actions slots', () => {
    const markup = markupOf({
      title: 'T',
      leading: <span data-leading="" />,
      actions: <span data-actions="" />,
    })
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('exposes a body button and clickable cursor only when onClick is supplied', () => {
    const clickable = markupOf({ title: 'T', onClick: () => {} })
    expect(clickable).toContain('<button type="button"')
    expect(clickable).toContain('cursorPointer')
    const plain = markupOf({ title: 'T' })
    expect(plain).not.toContain('<button')
    expect(plain).not.toContain('cursorPointer')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const container = mount(() => <ListItemRow title="T" onClick={onClick} />)
    openButton(container).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const container = mount(() => (
      <ListItemRow title="T" onClick={onClick} actions={<span data-actions="">Menu</span>} />
    ))
    container
      .querySelector('[data-actions]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const container = mount(() => <ListItemRow title="Inbox" onClick={() => {}} />)
    const button = openButton(container)
    const labelId = button.getAttribute('aria-labelledby')
    expect(labelId, 'the open button names its label').not.toBeNull()
    const label = container.querySelector(`[id="${labelId}"]`)
    expect(label?.textContent).toBe('Inbox')
  })

  it('without onClick there is no open button', () => {
    const markup = markupOf({ title: 'T' })
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('cursorPointer')
    expect(markup).not.toContain('position')
    expect(markup).not.toContain('aria-pressed')
  })

  it('a disabled clickable row renders a disabled open button', () => {
    const onClick = vi.fn()
    const container = mount(() => <ListItemRow title="T" onClick={onClick} disabled />)
    const button = openButton(container)
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.className).not.toContain('cursorPointer')
    const row = container.firstElementChild as HTMLElement
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(row.getAttribute('aria-disabled')).toBe('true')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('reflects the selected state via aria-current', () => {
    const markup = markupOf({ title: 'T', selected: true })
    expect(markup).toContain('aria-current="true"')
    expect(markup).not.toContain('aria-selected')
    expect(markup).not.toContain('aria-pressed')
    const clickable = markupOf({ title: 'T', selected: true, onClick: () => {} })
    expect(clickable).toContain('aria-current="true"')
    expect(clickable).not.toContain('aria-selected')
    expect(clickable).not.toContain('aria-pressed')
    const unselected = markupOf({ title: 'T', selected: false })
    expect(unselected).not.toContain('aria-current')
  })

  it('reflects the disabled state via aria-disabled and dimmed opacity', () => {
    const markup = markupOf({ title: 'T', disabled: true })
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain('opacity: 0.5')
  })

  it('forwards className', () => {
    const markup = markupOf({ title: 'T', className: 'lir-cls' })
    expect(markup).toContain('lir-cls')
  })
})

it('turns a loaded row toggle into its own button that persists the change', async () => {
  let saved = false
  const open = vi.fn()
  const commit = vi.fn(async (desired: boolean) => (saved = desired))
  const row = () => (
    <ListItemRow
      title="Sprint plan"
      metadata="4 collaborators"
      onClick={open}
      toggle={{ value: saved, commit, activeLabel: 'Unpin', inactiveLabel: 'Pin' }}
    />
  )
  const container = mount(row)
  const toggle = container.querySelector<HTMLButtonElement>('button[aria-pressed]')
  expect(toggle?.textContent).toBe('Pin')
  toggle!.click()
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(commit).toHaveBeenCalledExactlyOnceWith(true)
  expect(open).not.toHaveBeenCalled()
  expect(toggle?.textContent).toBe('Unpin')
  expect(mount(row).querySelector('button[aria-pressed="true"]')?.textContent).toBe('Unpin')
})

it('counterexample: row metadata is read-only when there is no toggle', () => {
  const container = mount(() => <ListItemRow title="Sprint plan" metadata="4 collaborators" />)
  expect(container.textContent).toContain('4 collaborators')
  expect(container.querySelector('button')).toBeNull()
})
