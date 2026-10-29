// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import { Tooltip } from '../components/Tooltip.js'

beforeEach(() => {
  setClassMap(
    new Proxy({} as UIClassMap, {
      get: (_target, name) =>
        name === 'cn' ? (...values: unknown[]) => values.filter(Boolean).join(' ') : String(name),
    }),
  )
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('tooltip hover interactions', () => {
  it('hands off immediately across toolbar buttons without leaving a tooltip trail', () => {
    render(
      <>
        {['Share', 'Report', 'Settings'].map((label) => (
          <Tooltip key={label} content={`${label} help`}>
            <button type="button">{label}</button>
          </Tooltip>
        ))}
      </>,
    )
    for (const label of ['Share', 'Report', 'Settings']) {
      const button = screen.getByRole('button', { name: label })
      fireEvent.mouseEnter(button)
      expect(screen.getAllByRole('tooltip')).toHaveLength(1)
      expect(screen.getByRole('tooltip').textContent).toBe(`${label} help`)
      fireEvent.mouseLeave(button)
      act(() => vi.advanceTimersByTime(25))
    }
    act(() => vi.advanceTimersByTime(150))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('cancels another trigger’s pending show and replaces visible help even when the new tooltip is delayed', () => {
    render(
      <>
        <Tooltip content="Share help">
          <button type="button">Share</button>
        </Tooltip>
        <Tooltip content="Delayed settings" delay={300}>
          <button type="button">Settings</button>
        </Tooltip>
        <Tooltip content="Report help">
          <button type="button">Report</button>
        </Tooltip>
      </>,
    )
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByRole('tooltip').textContent).toBe('Share help')
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(() => vi.advanceTimersByTime(100))
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Report' }))
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getAllByRole('tooltip')).toHaveLength(1)
    expect(screen.getByRole('tooltip').textContent).toBe('Report help')
  })

  it('preserves the current owner when an older replaced tooltip unmounts', () => {
    const view = (first: boolean) => (
      <>
        {first && (
          <Tooltip content="Old help">
            <button type="button">Old</button>
          </Tooltip>
        )}
        <Tooltip content="Current help">
          <button type="button">Current</button>
        </Tooltip>
        <Tooltip content="Next help">
          <button type="button">Next</button>
        </Tooltip>
      </>
    )
    const { rerender } = render(view(true))
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Old' }))
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Current' }))
    rerender(view(false))
    expect(screen.getByRole('tooltip').textContent).toBe('Current help')
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getAllByRole('tooltip')).toHaveLength(1)
    expect(screen.getByRole('tooltip').textContent).toBe('Next help')
  })

  it('dismisses pointer-only hover with Escape while focus stays in another control', () => {
    render(
      <>
        <input aria-label="Composer" />
        <Tooltip content="Context summary">
          <button type="button">Context</button>
        </Tooltip>
      </>,
    )
    const composer = screen.getByRole('textbox')
    act(() => composer.focus())
    fireEvent.mouseEnter(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.keyDown(composer, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(composer)
  })

  it('stays open when crossing the gap into tooltip content and closes after leaving both', () => {
    render(
      <Tooltip content="Context summary">
        <button type="button">Context</button>
      </Tooltip>,
    )
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    fireEvent.mouseLeave(button)
    act(() => vi.advanceTimersByTime(75))
    fireEvent.mouseEnter(screen.getByRole('tooltip'))
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.mouseLeave(screen.getByRole('tooltip'))
    act(() => vi.advanceTimersByTime(150))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('cancels a pending delayed show when the pointer only passes over the trigger', () => {
    render(
      <Tooltip content="Context summary" delay={300}>
        <button type="button">Context</button>
      </Tooltip>,
    )
    fireEvent.mouseEnter(screen.getByRole('button'))
    act(() => vi.advanceTimersByTime(100))
    fireEvent.mouseLeave(screen.getByRole('button'))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('clicks dismiss immediately and unmount clears pending timers', () => {
    const { unmount } = render(
      <Tooltip content="Context summary">
        <button type="button">Context</button>
      </Tooltip>,
    )
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    fireEvent.click(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.mouseEnter(button)
    fireEvent.mouseLeave(button)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps asynchronously expanded content anchored above its trigger', () => {
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const height =
        this.getAttribute('role') === 'tooltip' ? (this.textContent === 'Loading' ? 20 : 120) : 30
      return {
        top: 300,
        left: 300,
        width: 200,
        height,
        bottom: 300 + height,
        right: 500,
        x: 300,
        y: 300,
        toJSON: () => ({}),
      }
    })
    const { rerender } = render(
      <Tooltip content="Loading">
        <button type="button">Context</button>
      </Tooltip>,
    )
    fireEvent.mouseEnter(screen.getByRole('button'))
    expect(screen.getByRole('tooltip').parentElement?.style.top).toBe('272px')
    rerender(
      <Tooltip content="Loaded context and allowance details">
        <button type="button">Context</button>
      </Tooltip>,
    )
    expect(screen.getByRole('tooltip').parentElement?.style.top).toBe('172px')
    vi.restoreAllMocks()
  })
})
