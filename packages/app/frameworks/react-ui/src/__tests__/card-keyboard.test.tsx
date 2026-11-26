// @vitest-environment jsdom
/**
 * An interactive Card is announced as a button and sits in the tab order, so Enter and Space
 * activate it the way they activate a native button. Keys pressed in a control inside the card,
 * and keys on a card that is not interactive, do nothing.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
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

const { Card } = await import('../components/Card.js')

afterEach(cleanup)

describe('Card keyboard activation', () => {
  it.each(['Enter', ' '])('an interactive card calls onClick on %j', (key) => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <Card interactive onClick={onClick}>
        Clickable card
      </Card>,
    )
    fireEvent.keyDown(getByRole('button'), { key })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('other keys on an interactive card do nothing', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <Card interactive onClick={onClick}>
        Clickable card
      </Card>,
    )
    fireEvent.keyDown(getByRole('button'), { key: 'a' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('Enter in a control inside an interactive card belongs to that control', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <Card interactive onClick={onClick}>
        <input aria-label="Note" />
      </Card>,
    )
    fireEvent.keyDown(getByRole('textbox'), { key: 'Enter' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a card that is not interactive is not focusable and ignores Enter', () => {
    const onClick = vi.fn()
    const { getByTestId } = render(
      <Card testId="plain" onClick={onClick}>
        Plain card
      </Card>,
    )
    const card = getByTestId('plain')
    expect(card.hasAttribute('tabindex')).toBe(false)
    expect(card.hasAttribute('role')).toBe(false)
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it("the caller's onKeyDown runs before the activation", () => {
    const calls: string[] = []
    const { getByRole } = render(
      <Card interactive onClick={() => calls.push('click')} onKeyDown={() => calls.push('keydown')}>
        Clickable card
      </Card>,
    )
    fireEvent.keyDown(getByRole('button'), { key: 'Enter' })
    expect(calls).toEqual(['keydown', 'click'])
  })

  it("preventDefault in the caller's onKeyDown cancels the activation", () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <Card interactive onClick={onClick} onKeyDown={(event) => event.preventDefault()}>
        Clickable card
      </Card>,
    )
    fireEvent.keyDown(getByRole('button'), { key: 'Enter' })
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Card forwards its declared props', () => {
  it('id, title, onFocus, onBlur and onDoubleClick reach the card', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const onDoubleClick = vi.fn()
    const { getByTestId, getByRole } = render(
      <Card
        testId="billing"
        id="billing-card"
        title="Billing"
        onFocus={onFocus}
        onBlur={onBlur}
        onDoubleClick={onDoubleClick}
      >
        <button type="button">Edit</button>
      </Card>,
    )
    const card = getByTestId('billing')
    expect(card.id).toBe('billing-card')
    expect(card.title).toBe('Billing')
    // React's onFocus and onBlur hear focus moving onto and off a control inside the card.
    const edit = getByRole('button')
    edit.focus()
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onFocus.mock.calls[0][0].target).toBe(edit)
    edit.blur()
    expect(onBlur).toHaveBeenCalledTimes(1)
    fireEvent.doubleClick(card)
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })
})
