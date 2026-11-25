// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TableBox, TableCell, Text } from '../index.js'

describe('TableCell (web)', () => {
  it('forwards header scope, sort, span, style, children and handlers to the same cell', () => {
    const activate = vi.fn()
    render(
      <TableBox as="table">
        <TableBox as="tbody">
          <TableBox as="tr">
            <TableCell
              as="th"
              scope="row"
              aria-sort="ascending"
              colSpan={2}
              style={{ width: '50%' }}
              onClick={activate}
            >
              <Text as="span">Name</Text>
            </TableCell>
            <TableCell as="td">Ada</TableCell>
          </TableBox>
        </TableBox>
      </TableBox>,
    )
    const header = screen.getByRole<HTMLTableCellElement>('rowheader', { name: 'Name' })
    const cell = screen.getByRole('cell', { name: 'Ada' })
    expect(header.tagName).toBe('TH')
    expect(header.colSpan).toBe(2)
    expect(header.getAttribute('aria-sort')).toBe('ascending')
    expect(header.style.width).toBe('50%')
    expect(cell.tagName).toBe('TD')
    fireEvent.click(header)
    expect(activate).toHaveBeenCalledOnce()
  })
})
