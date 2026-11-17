// @vitest-environment jsdom

/**
 * FileExplorer's tree role follows its content.
 *
 * `role="tree"` requires `treeitem` children (axe `aria-required-children`),
 * so an empty tree — the empty-state text and nothing else — must not claim
 * the role. With at least one item the container stays a tree.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorer } from '../components/FileExplorer.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A minimal light theme so `useThemeMode` (the git colors) resolves. */

/** Wrap children in the theme context (i18n rides the bonded provider). */
function wrap(children: ReactNode): JSX.Element {
  return <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
}

/** The explorer's root element (the empty-state text's parent). */
function root(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
})

describe('FileExplorer tree role (axe aria-required-children)', () => {
  it('drops the tree role when there are no items', () => {
    const { container } = render(wrap(<FileExplorer files={[]} onFileSelect={vi.fn()} />))

    expect(root(container).getAttribute('role')).toBeNull()
    // The empty state still renders, just outside a tree.
    expect(root(container).textContent).not.toBe('')
  })

  it('keeps the tree role with at least one item', () => {
    const { container } = render(
      wrap(
        <FileExplorer
          files={[{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }]}
          onFileSelect={vi.fn()}
        />,
      ),
    )

    expect(root(container).getAttribute('role')).toBe('tree')
  })
})
