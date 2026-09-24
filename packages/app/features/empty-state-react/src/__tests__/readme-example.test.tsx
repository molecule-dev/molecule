// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { setClassMap } from '@molecule/app-ui'
import { Button, Icon } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { CtaCard, EmptyState } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @param props - Page callbacks.
 * @param props.onCompose - Opens the composer.
 * @param props.onConnect - Starts the email connection flow.
 * @returns The rendered inbox page.
 */
function InboxPage({
  onCompose,
  onConnect,
}: {
  onCompose: () => void
  onConnect: () => void
}): React.JSX.Element {
  const messages: Array<{ id: string; subject: string }> = []
  return (
    <>
      {messages.length === 0 ? (
        <EmptyState
          dataMolId="inbox-empty"
          icon={<Icon name="mail" size={40} />}
          title="No messages yet"
          description="When you receive messages they will appear here."
          action={<Button onClick={onCompose}>Write a message</Button>}
        />
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m.id}>{m.subject}</li>
          ))}
        </ul>
      )}
      <CtaCard
        layout="horizontal"
        eyebrow="Tip"
        title="Connect your email"
        description="Import your existing conversations in one click."
        media={<Icon name="link" size={32} />}
        action={
          <Button variant="solid" onClick={onConnect}>
            Connect
          </Button>
        }
      />
    </>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the empty state and the CTA card, wiring each action', () => {
    const onCompose = vi.fn()
    const onConnect = vi.fn()
    const view = render(<InboxPage onCompose={onCompose} onConnect={onConnect} />)
    const empty = view.container.querySelector('[data-mol-id="inbox-empty"]')
    expect(empty?.querySelector('h3')?.textContent).toBe('No messages yet')
    expect(empty?.textContent).toContain('When you receive messages they will appear here.')
    expect(empty?.querySelector('svg')).not.toBeNull()
    expect(view.getByRole('heading', { name: 'Connect your email' })).toBeTruthy()
    expect(view.getByText('Tip')).toBeTruthy()
    expect(view.container.querySelectorAll('svg')).toHaveLength(2)

    fireEvent.click(view.getByRole('button', { name: 'Write a message' }))
    expect(onCompose).toHaveBeenCalledTimes(1)
    fireEvent.click(view.getByRole('button', { name: 'Connect' }))
    expect(onConnect).toHaveBeenCalledTimes(1)
  })
})
