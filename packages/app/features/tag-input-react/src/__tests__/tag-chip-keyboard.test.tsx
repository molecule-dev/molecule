// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagChip } = await import('../TagChip.js')

afterEach(() => {
  cleanup()
})

describe('TagChip keyboard access', () => {
  it('exposes a clickable chip body as a tabbable role="button"', () => {
    render(<TagChip onClick={() => {}}>react</TagChip>)
    const chip = screen.getByRole('button', { name: 'react' })
    expect(chip.tagName).toBe('SPAN')
    expect(chip.getAttribute('tabindex')).toBe('0')
    expect(chip.getAttribute('role')).toBe('button')
  })

  it('fires onClick for Enter and Space on the focused chip body', () => {
    const onClick = vi.fn()
    render(<TagChip onClick={onClick}>react</TagChip>)
    const chip = screen.getByRole('button', { name: 'react' })
    fireEvent.keyDown(chip, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(chip, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('ignores keys other than Enter and Space on the chip body', () => {
    const onClick = vi.fn()
    render(<TagChip onClick={onClick}>react</TagChip>)
    fireEvent.keyDown(screen.getByRole('button', { name: 'react' }), { key: 'Escape' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'react' }), { key: 'a' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('still fires onClick when the chip body is clicked with the mouse', () => {
    const onClick = vi.fn()
    render(<TagChip onClick={onClick}>react</TagChip>)
    fireEvent.click(screen.getByRole('button', { name: 'react' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('moves the body action onto a native label button when a remove button is present', () => {
    const onClick = vi.fn()
    const onRemove = vi.fn()
    render(
      <TagChip onClick={onClick} onRemove={onRemove}>
        react
      </TagChip>,
    )
    // The chip holds two controls, so the container stays non-interactive.
    const label = screen.getByRole('button', { name: 'react' })
    expect(label.tagName).toBe('BUTTON')
    expect(label.getAttribute('type')).toBe('button')
    const container = label.parentElement as HTMLElement
    expect(container.tagName).toBe('SPAN')
    expect(container.getAttribute('role')).toBeNull()
    expect(container.getAttribute('tabindex')).toBeNull()

    fireEvent.click(label)
    expect(onClick).toHaveBeenCalledTimes(1)

    const remove = screen.getByRole('button', { name: 'Remove' })
    fireEvent.click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
    // Activating remove must not fall through to the body action.
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('keeps a remove-only chip a static container whose remove button works', () => {
    const onRemove = vi.fn()
    render(<TagChip onRemove={onRemove}>react</TagChip>)
    // Exactly one control: the remove button. The chip itself is not one.
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Remove')
    expect(screen.getByText('react').parentElement?.getAttribute('role')).toBeNull()
    fireEvent.click(buttons[0] as HTMLElement)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('renders a chip with no handlers as plain static markup', () => {
    render(<TagChip>react</TagChip>)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('react')).toBeDefined()
  })
})
