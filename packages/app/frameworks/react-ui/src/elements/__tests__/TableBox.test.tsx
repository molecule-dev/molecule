// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'

import { TableBox, TableCell } from '../index.js'

describe('TableBox (web)', () => {
  it('renders the original table, group and row tags and preserves the row handler', () => {
    const click = vi.fn()
    const ref = createRef<ElementHandle>()
    const { container } = render(
      <TableBox as="table" ref={ref} id="results" webStyle={{ width: '100%' }}>
        <TableBox as="thead">
          <TableBox as="tr">
            <TableCell as="th">Head</TableCell>
          </TableBox>
        </TableBox>
        <TableBox as="tbody">
          <TableBox as="tr" onClick={click}>
            <TableCell as="td">Data</TableCell>
          </TableBox>
        </TableBox>
        <TableBox as="tfoot">
          <TableBox as="tr">
            <TableCell as="td">Total</TableCell>
          </TableBox>
        </TableBox>
      </TableBox>,
    )
    const table = container.querySelector('table')
    expect(ref.current).toBe(table)
    expect(table?.id).toBe('results')
    expect(table?.style.width).toBe('100%')
    expect(Array.from(table?.children ?? [], (child) => child.tagName)).toEqual([
      'THEAD',
      'TBODY',
      'TFOOT',
    ])
    const row = table?.querySelector('tbody > tr')
    if (!row) throw new Error('Expected a table row')
    fireEvent.click(row)
    expect(click).toHaveBeenCalledOnce()
  })
})
