// @vitest-environment jsdom
/**
 * The web tree of Alert: the status icon beside a title and a body, as the React kit lays it out.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Alert } from '../index.web.js'

vi.mock('react-native', () => import('react-native-web'))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: (name: string) => ({ viewBox: '0 0 16 16', paths: [{ d: `path of ${name}` }] }),
}))

/**
 * The one element a selector matches.
 *
 * @param root - Where to search.
 * @param selector - The selector.
 * @returns The element.
 */
function one<E extends Element>(root: ParentNode, selector: string): E {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

beforeAll(() => setClassMap(classMap))
beforeEach(() => setProvider(createSimpleI18nProvider()))
afterEach(cleanup)

describe('Alert on React Native Web', () => {
  it('renders its status icon, title and body the way the React kit does', () => {
    const { container } = render(
      <Alert title="Heads up" status="warning" testId="notice" className="extra">
        Careful
      </Alert>,
    )
    const root = one<HTMLElement>(container, '[data-testid="notice"]')
    expect(root.getAttribute('role')).toBe('alert')
    expect(root.className).toBe(classMap.cn(classMap.alert({ variant: 'warning' }), 'extra'))
    const [icon, content] = root.children
    expect(icon?.className).toBe(classMap.alertIconWrapper)
    expect(one<SVGElement>(icon ?? root, 'svg').getAttribute('class')).toBe(classMap.iconMd)
    expect(icon?.querySelector('path')?.getAttribute('d')).toBe('path of exclamation-triangle')
    expect(content?.className).toBe(classMap.alertContent)
    const [title, body] = content?.children ?? []
    expect(title?.tagName).toBe('H5')
    expect(title?.className).toBe(classMap.alertTitle)
    expect(title?.textContent).toBe('Heads up')
    expect(body?.className).toBe(classMap.alertDescription)
    expect(body?.textContent).toBe('Careful')
  })

  it('takes info as its status and the default look for a brand color', () => {
    const look = (props: { status?: 'info' | 'primary' | 'secondary' }): string => {
      const { container, unmount } = render(<Alert {...props} />)
      const root = one<HTMLElement>(container, 'div')
      const classes = `${root.className} ${root.querySelector('path')?.getAttribute('d') ?? 'no icon'}`
      unmount()
      return classes
    }
    expect(look({})).toBe(`${classMap.alert({ variant: 'info' })} path of info-circle`)
    expect(look({ status: 'primary' })).toBe(`${classMap.alert({ variant: 'default' })} no icon`)
    expect(look({ status: 'secondary' })).toBe(`${classMap.alert({ variant: 'default' })} no icon`)
  })

  it('draws the icon it is given in place of the status icon', () => {
    const { container } = render(
      <Alert status="error" icon={<svg data-testid="custom" />}>
        Body
      </Alert>,
    )
    const icon = one<HTMLElement>(container, 'div > span')
    expect(icon.className).toBe(classMap.alertIconWrapper)
    expect(icon.querySelector('[data-testid="custom"]')).not.toBeNull()
    expect(icon.querySelector('path')).toBeNull()
  })

  it('dismisses from its button', () => {
    const onDismiss = vi.fn()
    const { container } = render(<Alert onDismiss={onDismiss} dismissible dismissLabel="Hide" />)
    const button = one<HTMLButtonElement>(container, 'button')
    expect(button.className).toBe(classMap.alertDismiss)
    expect(button.getAttribute('aria-label')).toBe('Hide')
    fireEvent.click(button)
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith()
  })

  it('draws a left accent in the status color', () => {
    const { container } = render(<Alert status="success" variant="left-accent" />)
    expect(one<HTMLElement>(container, 'div').className).toBe(
      classMap.cn(
        classMap.alert({ variant: 'success' }),
        classMap.alertLeftAccent({ variant: 'success' }),
      ),
    )
  })
})
