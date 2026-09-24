// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, with the real Tailwind ClassMap and
 * react-router.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Breadcrumb } from '../index.js'

setClassMap(classMap)

/**
 * The example's project page.
 *
 * @returns The breadcrumb trail.
 */
function ProjectPage(): JSX.Element {
  const navigate = useNavigate()
  const project = { id: 'apollo', name: 'Apollo Redesign' }
  return (
    <Breadcrumb
      items={[
        { label: 'Home', to: '/' },
        { label: 'Projects', to: '/projects' },
        { label: project.name },
      ]}
      onNavigate={(to) => navigate(to)}
    />
  )
}

/**
 * The example's routed app.
 *
 * @returns The router.
 */
function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/projects" element={<h1>Projects</h1>} />
        <Route path="/projects/:id" element={<ProjectPage />} />
      </Routes>
    </BrowserRouter>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the trail with the current page last and navigates client-side', () => {
    window.history.pushState({}, '', '/projects/apollo')
    render(<App />)

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav.textContent).toBe('Home/Projects/Apollo Redesign')
    expect(screen.getByText('Apollo Redesign').closest('[aria-current="page"]')).not.toBeNull()
    expect(nav.querySelectorAll('button')).toHaveLength(2)
    expect(nav.querySelector('a')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))
    expect(window.location.pathname).toBe('/projects')
    expect(screen.getByRole('heading').textContent).toBe('Projects')
  })
})
