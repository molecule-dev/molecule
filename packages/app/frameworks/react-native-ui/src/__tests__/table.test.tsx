// @vitest-environment jsdom
import {
  act,
  createElement,
  type CSSProperties,
  type ReactNode,
  type Ref,
  useLayoutEffect,
} from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ScrollArea } from '../elements/ScrollArea.js'
import { tableColumnWidths } from '../elements/table.js'
import { TableBox } from '../elements/TableBox.js'
import { TableCell } from '../elements/TableCell.js'

const layouts = vi.hoisted(
  () => new Map<string, (event: { nativeEvent: { layout: { width: number } } }) => void>(),
)

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    splitForNative: (view: string) => ({
      view,
      text: '',
      display: null,
      weight: null,
      lines: null,
      verticalAlign: view.includes('middle') ? 'middle' : undefined,
      descendants:
        view === 'body'
          ? {
              'tr:first-child': 'first-row',
              'tr:last-child': 'last-row',
            }
          : undefined,
    }),
  }),
}))

vi.mock('react-native', () => {
  interface HostProps {
    role?: string
    testID?: string
    'aria-hidden'?: boolean
    className?: string
    style?: CSSProperties | (CSSProperties | false | undefined)[]
    horizontal?: boolean
    children?: ReactNode
    ref?: Ref<HTMLElement>
    onLayout?: (event: { nativeEvent: { layout: { width: number } } }) => void
    onPress?: (event: MouseEvent) => void
  }
  const host = (kind: string) =>
    function Host({
      role,
      testID,
      className,
      style,
      horizontal,
      children,
      ref,
      onLayout,
      onPress,
      ...props
    }: HostProps) {
      const id = testID ?? (kind === 'scroll' ? kind : undefined)
      useLayoutEffect(() => {
        if (!id || !onLayout) return
        layouts.set(id, onLayout)
        return () => {
          layouts.delete(id)
        }
      }, [id, onLayout])
      return createElement(
        kind === 'text' ? 'span' : 'div',
        {
          role,
          className,
          ref,
          'data-testid': id,
          'data-kind': kind,
          'data-horizontal': horizontal,
          'aria-hidden': props['aria-hidden'],
          style: Array.isArray(style) ? Object.assign({}, ...style) : style,
          onClick: onPress,
        },
        children,
      )
    }
  return {
    Platform: { select: ({ default: value }: { default: string }) => value },
    View: host('view'),
    Pressable: host('pressable'),
    Text: host('text'),
    ScrollView: host('scroll'),
  }
})

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function host(id: string): HTMLElement {
  const node = container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!node) throw new Error(`No native host for ${id}`)
  return node
}

function layOut(id: string, width: number): void {
  const listener = layouts.get(id)
  if (!listener) throw new Error(`No layout handler for ${id}`)
  act(() => listener({ nativeEvent: { layout: { width } } }))
}

describe('Native table columns', () => {
  it('allocates excess space in proportion to the widest cell per automatic column', () => {
    expect(
      tableColumnWidths(350, [
        { track: { column: 0, span: 1, fixed: 50 } },
        { track: { column: 1, span: 1 }, natural: 30 },
        { track: { column: 1, span: 1 }, natural: 50 },
        { track: { column: 2, span: 1 }, natural: 100 },
        { track: { column: 0, span: 3 }, natural: 1000 },
      ]),
    ).toEqual([50, 100, 200])
  })

  it('shares widths, honors spans and row positions, and scrolls excess width', () => {
    const show = (second: string): void =>
      act(() =>
        root.render(
          <ScrollArea as="div" direction="horizontal">
            <TableBox as="table" data-testid="table">
              <TableBox as="thead">
                <TableBox as="tr">
                  <TableCell as="th" scope="col" style={{ width: '20%' }} data-testid="fixed">
                    Name
                  </TableCell>
                  <TableCell as="th" scope="col" data-testid="head">
                    Amount
                  </TableCell>
                </TableBox>
              </TableBox>
              <TableBox as="tbody" className="body" data-testid="body">
                <>
                  <TableBox as="tr" data-testid="top" onClick={() => undefined}>
                    <TableCell as="th" scope="row" data-testid="label">
                      Subtotal
                    </TableCell>
                    <TableCell as="td" data-testid="value">
                      {second}
                    </TableCell>
                  </TableBox>
                  <TableBox as="tr" data-testid="bottom">
                    <TableCell as="td" colSpan={2} className="middle" data-testid="spanning">
                      Summary
                    </TableCell>
                  </TableBox>
                </>
              </TableBox>
            </TableBox>
          </ScrollArea>,
        ),
      )
    show('100')
    layOut('scroll', 300)
    expect(host('table').style.opacity).toBe('0')
    layOut('head', 60)
    layOut('label', 120)
    layOut('value', 80)
    expect(host('table').getAttribute('role')).toBe('table')
    expect(host('body').getAttribute('role')).toBe('rowgroup')
    expect(host('table').style.opacity).toBe('')
    expect(host('fixed').getAttribute('role')).toBe('columnheader')
    expect(host('label').getAttribute('role')).toBe('rowheader')
    expect(host('fixed').style.width).toBe('60px')
    expect(host('label').style.width).toBe('60px')
    expect(host('head').style.width).toBe('240px')
    expect(host('value').style.width).toBe('240px')
    expect(host('spanning').style.width).toBe('300px')
    expect(host('spanning').style.justifyContent).toBe('center')
    expect(host('top').className).toBe('first-row')
    expect(host('top').dataset.kind).toBe('pressable')
    expect(host('bottom').className).toBe('last-row')
    expect(host('bottom').dataset.kind).toBe('view')
    expect(host('bottom').getAttribute('role')).toBe('row')

    layOut('scroll', 80)
    expect(host('scroll').dataset.horizontal).toBe('true')
    expect(host('table').style.width).toBe('96px')
    expect(host('value').style.width).toBe('80px')
    expect(host('spanning').style.width).toBe('96px')

    show('A longer value')
    layOut('value', 144)
    expect(host('table').style.width).toBe('160px')
    expect(host('spanning').style.width).toBe('160px')
  })

  it('reports an orphan row in development', () => {
    vi.stubGlobal('__DEV__', true)
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    act(() =>
      root.render(
        <TableBox as="tr">
          <TableCell as="td">Cell</TableCell>
        </TableBox>,
      ),
    )
    expect(diagnostic).toHaveBeenCalledWith(
      expect.stringContaining('requires a TableBox as="table"'),
    )
  })
})
