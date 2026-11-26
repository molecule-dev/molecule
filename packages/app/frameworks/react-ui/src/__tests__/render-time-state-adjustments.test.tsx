// @vitest-environment jsdom
/**
 * Render tests for the state these components adjust DURING RENDER when an
 * input changes (React's pattern for state derived from a changed prop),
 * rather than in an effect:
 *
 * - `Dropdown` with a controlled `open` reports a route-change close through
 *   `onOpenChange` (the owner scripts hold the state, so the component cannot
 *   close itself);
 * - `Dropdown width="trigger"` sizes the menu from the trigger width measured
 *   at commit, not from a render-time ref read;
 * - a reopened `PromptDialog` seeds its input from the CURRENT `initialValue`.
 *
 * @module
 */
import { fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns — tests advance it to
// simulate SPA navigation, then re-render.
const mockLocation = { pathname: '/', search: '' }

// PromptDialog renders the kit's Input, which also reads `fieldLayout` from this module, so the
// actual module stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const CALLABLE = new Set([
      'modal',
      'stack',
      'flex',
      'sp',
      'textSize',
      'fontWeight',
      'input',
      'button',
    ])
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
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLocation: () => ({ ...mockLocation }),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { Dropdown } = await import('../components/Dropdown.js')
const { PromptDialog } = await import('../components/PromptDialog.js')

const items = [{ value: 'a', label: 'Item A' }]

afterEach(() => {
  mockLocation.pathname = '/'
  mockLocation.search = ''
  vi.restoreAllMocks()
})

/** A Dropdown whose `open` is owned by the caller, like a controlled consumer. */
function ControlledDropdown({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <Dropdown
      trigger={<button type="button">Actions</button>}
      items={items}
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        setOpen(next)
      }}
    />
  )
}

describe('Dropdown — controlled open closes on route change', () => {
  it('reports the close through onOpenChange instead of only resetting internally', () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<ControlledDropdown onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    expect(screen.getByText('Item A')).toBeDefined()

    mockLocation.pathname = '/elsewhere'
    rerender(<ControlledDropdown onOpenChange={onOpenChange} />)

    expect(screen.queryByText('Item A')).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})

describe('Dropdown — width="trigger"', () => {
  it('sizes the menu from the trigger width measured at commit', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(180)
    render(
      <Dropdown trigger={<button type="button">Actions</button>} items={items} width="trigger" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))

    expect(screen.getByRole('menu').style.width).toBe('180px')
  })
})

describe('PromptDialog — reopening', () => {
  it('seeds the input from the initialValue of the render that opens it', () => {
    const base = {
      onClose: vi.fn(),
      title: 'Rename board',
      placeholder: 'Board name',
      onSubmit: vi.fn(),
      inputMolId: 'prompt-input',
    }
    const input = (): HTMLInputElement =>
      screen.getByLabelText('Rename board', { selector: 'input' }) as HTMLInputElement
    const { rerender } = render(<PromptDialog {...base} open initialValue="Sprint 4" />)
    expect(input().value).toBe('Sprint 4')

    // The user edits, then the dialog closes and the caller's value moves on.
    fireEvent.change(input(), { target: { value: 'Sprint 5' } })
    expect(input().value).toBe('Sprint 5')
    rerender(<PromptDialog {...base} open={false} initialValue="Sprint 5" />)
    rerender(<PromptDialog {...base} open initialValue="Sprint 6" />)

    expect(input().value).toBe('Sprint 6')
  })
})
