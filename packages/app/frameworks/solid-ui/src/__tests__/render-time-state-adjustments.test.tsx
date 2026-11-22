// @vitest-environment jsdom
/**
 * The state these components adjust when an input changes, ported to Solid's
 * reactive props (there is no render-time setState pass — a prop getter feeds
 * the same adjustments):
 *
 * - `Dropdown` with a controlled `open` reports a route-change close through
 *   `onOpenChange` (the owner holds the state, so the component cannot close
 *   itself);
 * - `Dropdown width="trigger"` sizes the menu from the trigger width measured
 *   when the menu mounts;
 * - a reopened `PromptDialog` seeds its input from the CURRENT `initialValue`.
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
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
  }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { setDropdownLocation } from './dropdown-location-fixture.js'

const { Dropdown } = await import('../components/Dropdown.jsx')
const { PromptDialog } = await import('../components/PromptDialog.jsx')

const items = [{ value: 'a', label: 'Item A' }]

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  setDropdownLocation({ pathname: '/', search: '' })
  vi.restoreAllMocks()
})

/**
 * Mounts a Solid view into a fresh container.
 *
 * @param view - The view to render.
 * @returns The container the view rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * A Dropdown whose `open` is owned by the caller, like a controlled consumer.
 *
 * @param props - The spy the component reports every open change to.
 * @returns The controlled dropdown.
 */
function ControlledDropdown(props: { onOpenChange: (open: boolean) => void }): JSX.Element {
  const [open, setOpen] = createSignal(false)
  return (
    <Dropdown
      trigger={<button type="button">Actions</button>}
      items={items}
      open={open()}
      onOpenChange={(next) => {
        props.onOpenChange(next)
        setOpen(next)
      }}
    />
  )
}

describe('Dropdown — controlled open closes on route change', () => {
  it('reports the close through onOpenChange instead of only resetting internally', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    mount(() => <ControlledDropdown onOpenChange={onOpenChange} />)

    fireEvent.click(within(document.body).getByRole('button', { name: 'Actions' }))
    expect(within(document.body).getByText('Item A')).toBeDefined()

    setDropdownLocation({ pathname: '/elsewhere', search: '' })

    expect(within(document.body).queryByText('Item A')).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})

describe('Dropdown — width="trigger"', () => {
  it('sizes the menu from the trigger width measured at commit', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(180)
    mount(() => (
      <Dropdown trigger={<button type="button">Actions</button>} items={items} width="trigger" />
    ))

    fireEvent.click(within(document.body).getByRole('button', { name: 'Actions' }))

    expect(within(document.body).getByRole('menu').style.width).toBe('180px')
  })
})

describe('PromptDialog — reopening', () => {
  it('seeds the input from the initialValue of the render that opens it', () => {
    const onClose = vi.fn()
    const onSubmit = vi.fn<(value: string) => void | Promise<void>>()
    const [open, setOpen] = createSignal(true)
    const [initialValue, setInitialValue] = createSignal('Sprint 4')
    mount(() => (
      <PromptDialog
        open={open()}
        onClose={onClose}
        title="Rename board"
        placeholder="Board name"
        onSubmit={onSubmit}
        initialValue={initialValue()}
        inputMolId="prompt-input"
      />
    ))
    const input = (): HTMLInputElement => {
      const element = document.querySelector<HTMLInputElement>('input[aria-label="Rename board"]')
      if (!element) throw new Error('expected the prompt input')
      return element
    }
    expect(input().value).toBe('Sprint 4')

    // The user edits, then the dialog closes and the caller's value moves on.
    fireEvent.input(input(), { target: { value: 'Sprint 5' } })
    expect(input().value).toBe('Sprint 5')
    setOpen(false)
    setInitialValue('Sprint 5')
    setOpen(true)
    setInitialValue('Sprint 6')

    expect(input().value).toBe('Sprint 6')
  })
})
