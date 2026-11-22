// @vitest-environment jsdom
/**
 * `Dropdown`'s `onOpenChange` contract with an owner that follows it (the
 * usual controlled wiring, `open={open} onOpenChange={setOpen}`): the menu
 * reports a change only when one happens (a toggle, a selection, Escape, a
 * route change), so an owner that follows every report keeps the menu open
 * until something closes it.
 *
 * @module
 */
import { fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns: tests advance it to
// simulate SPA navigation, then re-render.
const mockLocation = { pathname: '/', search: '' }

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

vi.mock('@molecule/app-react', () => ({
  useLocation: () => ({ ...mockLocation }),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

const { Dropdown } = await import('../components/Dropdown.js')

const ITEMS = [
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
]

/**
 * An owner that follows every `onOpenChange` report.
 *
 * @param props - The initial open state and a spy for each report.
 * @param props.initialOpen - Whether the owner starts with the menu open.
 * @param props.onReport - Called with every reported open state.
 * @returns The controlled dropdown.
 */
function Owner({
  initialOpen,
  onReport,
}: {
  initialOpen: boolean
  onReport: (open: boolean) => void
}): JSX.Element {
  const [open, setOpen] = useState(initialOpen)
  return (
    <Dropdown
      trigger={<button type="button">Options</button>}
      items={ITEMS}
      open={open}
      onOpenChange={(next) => {
        onReport(next)
        setOpen(next)
      }}
    />
  )
}

afterEach(() => {
  mockLocation.pathname = '/'
  mockLocation.search = ''
})

describe('Dropdown onOpenChange with an owner that follows it', () => {
  it('keeps a menu mounted open open, and reports nothing on mount', () => {
    const onReport = vi.fn()
    render(<Owner initialOpen onReport={onReport} />)

    expect(screen.getByRole('menu')).toBeDefined()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('keeps a menu opened by the trigger open', () => {
    const onReport = vi.fn()
    render(<Owner initialOpen={false} onReport={onReport} />)

    fireEvent.click(screen.getByRole('button', { name: 'Options' }))

    expect(screen.getByRole('menu')).toBeDefined()
    expect(onReport.mock.calls).toEqual([[true]])
  })

  it('closes through onOpenChange when the route changes', () => {
    const onReport = vi.fn()
    const { rerender } = render(<Owner initialOpen={false} onReport={onReport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Options' }))

    mockLocation.pathname = '/settings'
    rerender(<Owner initialOpen={false} onReport={onReport} />)

    expect(screen.queryByRole('menu')).toBeNull()
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
    const { rerender } = render(view())
    expect(onOpenChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Options' }))
    expect(screen.getByRole('menu')).toBeDefined()

    mockLocation.search = '?tab=2'
    rerender(view())

    expect(screen.queryByRole('menu')).toBeNull()
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })
})
