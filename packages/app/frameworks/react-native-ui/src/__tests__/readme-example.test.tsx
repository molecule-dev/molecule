// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `react-native` runtime is
 * stubbed (it has no DOM/node renderer and cannot be installed in this
 * workspace — see `src/react-native.d.ts`); the ClassMap bond, i18n and the
 * components are real, and `Pressable`'s `onPress` is surfaced as a DOM click so
 * the `onClick` wiring is exercised end to end.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  const stub =
    (tag: string) =>
    (props: Record<string, unknown>): ReturnType<typeof createElement> =>
      createElement(
        tag === 'Pressable' ? 'button' : 'div',
        {
          'data-rn': tag,
          className: props.className,
          onClick: props.onPress as (() => void) | undefined,
        },
        props.children as never,
      )
  return {
    View: stub('View'),
    Text: stub('Text'),
    Pressable: stub('Pressable'),
    ActivityIndicator: stub('ActivityIndicator'),
    StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s },
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  }
})

const { registerLocaleModule, t } = await import('@molecule/app-i18n')
const commonLocales = await import('@molecule/app-locales-common')
const { setClassMap } = await import('@molecule/app-ui')
const { classMap } = await import('@molecule/app-ui-nativewind')
const { Button, Card, CardContent, CardTitle } = await import('../index.js')

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the card and updates it through the Button onClick', () => {
    setClassMap(classMap)
    registerLocaleModule(commonLocales)

    /**
     * The example's component.
     *
     * @returns The inbox card.
     */
    function InboxCard(): JSX.Element {
      const [unread, setUnread] = useState(3)
      return (
        <Card>
          <CardTitle>
            {t('common.countUnread', { count: unread }, { defaultValue: '{{count}} unread' })}
          </CardTitle>
          <CardContent>
            <Button color="primary" onClick={() => setUnread(0)}>
              {t('common.markAllRead', undefined, { defaultValue: 'Mark all read' })}
            </Button>
          </CardContent>
        </Card>
      )
    }

    render(<InboxCard />)
    expect(screen.getByText('3 unread')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(screen.getByText('0 unread')).toBeTruthy()
    expect(screen.getByText('0 unread').className).toContain(classMap.cardTitle)
  })
})
