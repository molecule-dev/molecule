// @vitest-environment jsdom
/**
 * Keyboard-access tests for the Angular tag chip — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-chip-keyboard.test.tsx`:
 * the same test names and the same assertions, mounted through Angular's real
 * renderer in jsdom.
 *
 * @module
 */

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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagChip } = await import('../tag-chip.component.js')
const { mountHost } = await import('./mount.js')

const mounted: Array<Awaited<ReturnType<typeof mountHost>>> = []

afterEach(async () => {
  for (const item of mounted.splice(0)) await item.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts one chip and returns its host element.
 *
 * @param props - The chip's inputs.
 * @returns The mounted host.
 */
const mountChip = async (props: Record<string, unknown> = {}): Promise<HTMLElement> => {
  const item = await mountHost(
    `<span mol-tag-chip [onClick]="p['onClick']" [onRemove]="p['onRemove']">react</span>`,
    [TagChip],
    props,
  )
  mounted.push(item)
  return item.host
}

/**
 * Presses a key on an element.
 *
 * @param el - The element.
 * @param key - The key name.
 * @returns Whether the event's default was left unprevented.
 */
const press = (el: Element, key: string): boolean =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

/**
 * Clicks an element.
 *
 * @param el - The element.
 */
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/** The chip body control in the mounted tree. */
const body = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[role="button"]')
  if (!el) throw new Error('no chip body control')
  return el
}

describe('TagChip keyboard access', () => {
  it('exposes a clickable chip body as a tabbable role="button"', async () => {
    const chip = body(await mountChip({ onClick: () => {} }))
    expect(chip.tagName).toBe('SPAN')
    expect(chip.getAttribute('tabindex')).toBe('0')
    expect(chip.getAttribute('role')).toBe('button')
  })

  it('fires onClick for Enter and Space on the focused chip body', async () => {
    const onClick = vi.fn()
    const chip = body(await mountChip({ onClick }))
    press(chip, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
    press(chip, ' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('ignores keys other than Enter and Space on the chip body', async () => {
    const onClick = vi.fn()
    const chip = body(await mountChip({ onClick }))
    press(chip, 'Escape')
    press(chip, 'a')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('still fires onClick when the chip body is clicked with the mouse', async () => {
    const onClick = vi.fn()
    const chip = body(await mountChip({ onClick }))
    click(chip)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('moves the body action onto a native label button when a remove button is present', async () => {
    const onClick = vi.fn()
    const onRemove = vi.fn()
    const host = await mountChip({ onClick, onRemove })
    // The chip holds two controls, so the container stays non-interactive.
    const label = host.querySelector<HTMLElement>('button:not([aria-label])')
    if (!label) throw new Error('no label button')
    expect(label.tagName).toBe('BUTTON')
    expect(label.getAttribute('type')).toBe('button')
    const container = label.parentElement as HTMLElement
    expect(container.tagName).toBe('SPAN')
    expect(container.getAttribute('role')).toBeNull()
    expect(container.getAttribute('tabindex')).toBeNull()

    click(label)
    expect(onClick).toHaveBeenCalledTimes(1)

    const remove = host.querySelector<HTMLElement>('button[aria-label="Remove"]')
    if (!remove) throw new Error('no remove button')
    click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
    // Activating remove must not fall through to the body action.
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('keeps a remove-only chip a static container whose remove button works', async () => {
    const onRemove = vi.fn()
    const host = await mountChip({ onRemove })
    // Exactly one control: the remove button. The chip itself is not one.
    const buttons = host.querySelectorAll<HTMLElement>('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Remove')
    const label = Array.from(host.querySelectorAll('span')).find(
      (el) => el.children.length === 0 && el.textContent === 'react',
    )
    expect(label?.parentElement?.getAttribute('role')).toBeNull()
    click(buttons[0]!)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('renders a chip with no handlers as plain static markup', async () => {
    const host = await mountChip()
    expect(host.querySelector('[role="button"]')).toBeNull()
    expect(host.textContent).toContain('react')
  })
})
