// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { HeroSection, PageHeader } from '../index.js'

/**
 * The README example's projects page, verbatim.
 *
 * @returns The rendered projects page.
 */
function ProjectsPage(): React.JSX.Element {
  const [projects, setProjects] = useState(['Website redesign', 'Mobile app'])
  return (
    <main>
      <PageHeader
        breadcrumbs={
          <nav aria-label="Breadcrumb">
            <a href="/">Home</a> / Projects
          </nav>
        }
        title="Projects"
        subtitle="Manage your active projects"
        meta={<span>{`${projects.length} active`}</span>}
        actions={
          <Button onClick={() => setProjects((p) => [...p, `Project ${p.length + 1}`])}>
            New project
          </Button>
        }
        dataMolId="projects-header"
      />
      <ul>
        {projects.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </main>
  )
}

/**
 * The README example's landing page, verbatim.
 *
 * @returns The rendered hero.
 */
function LandingPage(): React.JSX.Element {
  return (
    <HeroSection
      align="center"
      eyebrow="New in 2.0"
      title="Ship your app this week"
      description="Everything you need to launch, in one workspace."
      primaryAction={
        <Button variant="solid" color="primary">
          Get started
        </Button>
      }
      secondaryAction={<Button variant="ghost">See pricing</Button>}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the page header slots and wires the action button', () => {
    const view = render(<ProjectsPage />)
    expect(view.getByRole('heading', { level: 1, name: 'Projects' })).toBeTruthy()
    expect(view.getByText('Manage your active projects')).toBeTruthy()
    expect(view.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy()
    expect(view.container.querySelector('[data-mol-id="projects-header"]')).not.toBeNull()
    expect(view.getByText('2 active')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'New project' }))
    expect(view.getByText('3 active')).toBeTruthy()
    expect(view.getByText('Project 3')).toBeTruthy()
  })

  it('renders the hero headline, copy and both calls to action', () => {
    const view = render(<LandingPage />)
    expect(view.getByRole('heading', { level: 1, name: 'Ship your app this week' })).toBeTruthy()
    expect(view.getByText('New in 2.0')).toBeTruthy()
    expect(view.getByText('Everything you need to launch, in one workspace.')).toBeTruthy()
    expect(view.getByRole('button', { name: 'Get started' })).toBeTruthy()
    expect(view.getByRole('button', { name: 'See pricing' })).toBeTruthy()
  })
})
