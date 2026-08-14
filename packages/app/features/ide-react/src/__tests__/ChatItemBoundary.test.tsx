// @vitest-environment jsdom
/**
 * The containment guarantee.
 *
 * Where an error boundary sits decides whether a render defect is a cosmetic bug or an
 * outage. Before 2026-08-14 the IDE had exactly one, at the app root, so a single
 * malformed chat card blanked the editor, the preview, the file tree and every other
 * message along with it. These tests pin the property that replaced that: a throwing
 * item costs one inline notice, and its siblings keep rendering.
 *
 * This is the guard for defects nobody has thought of yet — which is the category the
 * outage belonged to — so it must stay true regardless of what throws or why.
 */

import { render } from '@testing-library/react'
import type { JSX } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatItemBoundary } from '../components/ChatItemBoundary.js'

beforeAll(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

/** A component that always throws while rendering. */
function Exploding(): JSX.Element {
  throw new Error('render exploded')
}

/** A component that renders an object as a child — React error #31, the outage's shape. */
function InvalidChild(): JSX.Element {
  const notAString = { label: 'Recipe box' } as unknown as string
  return <span>{notAString}</span>
}

describe('ChatItemBoundary', () => {
  it('renders its item normally when nothing throws', () => {
    const { container } = render(<ChatItemBoundary render={() => <span>fine</span>} />)
    expect(container.textContent).toContain('fine')
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')).toBeNull()
  })

  it('catches a throw from a descendant component', () => {
    const { container } = render(<ChatItemBoundary render={() => <Exploding />} />)
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches a throw from the item body itself, not just its descendants', () => {
    // The body runs inside a child component precisely so this case is covered — a
    // boundary cannot catch what it throws in its own render.
    const { container } = render(
      <ChatItemBoundary
        render={() => {
          throw new Error('body exploded')
        }}
      />,
    )
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches an object rendered as a React child — the 2026-08-14 failure', () => {
    const { container } = render(<ChatItemBoundary render={() => <InvalidChild />} />)
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('leaves sibling items untouched', () => {
    const { container } = render(
      <div>
        <ChatItemBoundary render={() => <span>before</span>} />
        <ChatItemBoundary render={() => <Exploding />} />
        <ChatItemBoundary render={() => <span>after</span>} />
      </div>,
    )
    expect(container.textContent).toContain('before')
    expect(container.textContent).toContain('after')
    expect(container.querySelectorAll('[data-mol-id="chat-item-render-error"]')).toHaveLength(1)
  })

  it('reports the error to the host', () => {
    const onError = vi.fn()
    render(<ChatItemBoundary onError={onError} render={() => <Exploding />} />)
    expect(onError).toHaveBeenCalledTimes(1)
    expect((onError.mock.calls[0][0] as Error).message).toBe('render exploded')
  })

  it('still contains the failure when the host reporter itself throws', () => {
    const { container } = render(
      <ChatItemBoundary
        onError={() => {
          throw new Error('reporter exploded')
        }}
        render={() => <Exploding />}
      />,
    )
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })
})
