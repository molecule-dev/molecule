// @vitest-environment jsdom
/**
 * `Dropdown`'s `onOpenChange` contract with an owner that follows it (the
 * usual controlled wiring, `open={open()} onOpenChange={setOpen}`): the menu
 * reports a change only when one happens (a toggle, a selection, Escape, a
 * route change), so an owner that follows every report keeps the menu open
 * until something closes it. Solid counterpart of
 * `@molecule/app-ui-react`'s `dropdown-open-change.test.tsx`; a navigation is
 * simulated by changing the reactive location `useLocation` returns.
 *
 * @module
 */
import { fireEvent, within } from '@testing-library/dom'
import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') {
            return (...classes: unknown[]) =>
              classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
          }
          const token = String(prop)
          return (..._args: unknown[]) => token
        },
      },
    ),
}))

// The mocked `useLocation` reads the same reactive location the tests change.
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const { dropdownLocation } = await import('./dropdown-location-fixture.js')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useLocation: () => dropdownLocation,
  }
})

import { setDropdownLocation } from './dropdown-location-fixture.js'

const { Dropdown } = await import('../components/Dropdown.jsx')

const ITEMS = [
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
]

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  setDropdownLocation({ pathname: '/', search: '' })
})

/** Mounts a Solid view into a fresh container and returns that container. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * An owner that follows every `onOpenChange` report, with Solid signals.
 *
 * @param props - The initial open state and a spy for each report.
 * @returns The controlled dropdown.
 */
function Owner(props: { initialOpen: boolean; onReport: (open: boolean) => void }): JSX.Element {
  const [open, setOpen] = createSignal(props.initialOpen)
  return (
    <Dropdown
      trigger={<button type="button">Options</button>}
      items={ITEMS}
      open={open()}
      onOpenChange={(next) => {
        props.onReport(next)
        setOpen(next)
      }}
    />
  )
}

describe('Dropdown onOpenChange with an owner that follows it', () => {
  it('keeps a menu mounted open open, and reports nothing on mount', () => {
    const onReport = vi.fn()
    mount(() => <Owner initialOpen onReport={onReport} />)

    expect(within(document.body).getByRole('menu')).toBeDefined()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('keeps a menu opened by the trigger open', () => {
    const onReport = vi.fn()
    mount(() => <Owner initialOpen={false} onReport={onReport} />)

    fireEvent.click(within(document.body).getByRole('button', { name: 'Options' }))

    expect(within(document.body).getByRole('menu')).toBeDefined()
    expect(onReport.mock.calls).toEqual([[true]])
  })

  it('closes through onOpenChange when the route changes', () => {
    const onReport = vi.fn()
    mount(() => <Owner initialOpen={false} onReport={onReport} />)
    fireEvent.click(within(document.body).getByRole('button', { name: 'Options' }))

    setDropdownLocation({ pathname: '/settings', search: '' })

    expect(within(document.body).queryByRole('menu')).toBeNull()
    expect(onReport.mock.calls).toEqual([[true], [false]])
  })
})

describe('uncontrolled Dropdown onOpenChange', () => {
  it('reports nothing on mount, then each toggle and the route-change close', () => {
    const onOpenChange = vi.fn()
    /**
     * The uncontrolled dropdown under test.
     *
     * @returns The dropdown.
     */
    const view = (): JSX.Element => (
      <Dropdown
        trigger={<button type="button">Options</button>}
        items={ITEMS}
        onOpenChange={onOpenChange}
      />
    )
    mount(view)
    expect(onOpenChange).not.toHaveBeenCalled()

    fireEvent.click(within(document.body).getByRole('button', { name: 'Options' }))
    expect(within(document.body).getByRole('menu')).toBeDefined()

    setDropdownLocation({ pathname: '/', search: '?tab=2' })

    expect(within(document.body).queryByRole('menu')).toBeNull()
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })
})
