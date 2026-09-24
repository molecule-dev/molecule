// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { JobListingRow } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The job list.
 */
function JobList(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const jobs = [
    {
      id: 'j1',
      title: 'Senior Frontend Engineer',
      company: 'Acme Corp',
      location: 'Remote (US)',
      type: 'Full-time',
      salaryMin: 130000,
      salaryMax: 160000,
      postedAt: '2026-09-20',
    },
    {
      id: 'j2',
      title: 'Data Analyst',
      company: 'Globex',
      location: 'London, UK',
      type: 'Contract',
      salaryMin: 60000,
      salaryMax: 75000,
      postedAt: '2026-09-18',
    },
  ]
  const money = (n: number): string =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact' })
  return (
    <section>
      {jobs.map((job) => (
        <JobListingRow
          key={job.id}
          title={job.title}
          company={job.company}
          location={job.location}
          type={job.type}
          salary={`${money(job.salaryMin)}–${money(job.salaryMax)}`}
          postedAt={new Date(job.postedAt).toLocaleDateString('en-US', {
            dateStyle: 'medium',
            timeZone: 'UTC',
          })}
          onClick={() => navigate(`/jobs/${job.id}`)}
          actions={
            <Link to={`/jobs/${job.id}`}>
              {t('common.open', undefined, { defaultValue: 'Open' })}
            </Link>
          }
        />
      ))}
    </section>
  )
}

/**
 * Stand-in job detail page, so navigation is observable.
 *
 * @returns The job id that was navigated to.
 */
function JobPage(): React.JSX.Element {
  const { id } = useParams()
  return <p>job page {id}</p>
}

/**
 * Renders the example at `/jobs` inside a router and the i18n provider.
 *
 * @returns The testing-library render result.
 */
function renderList(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <MemoryRouter initialEntries={['/jobs']}>
        <Routes>
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders each job with its formatted meta and an Open link', () => {
    const view = renderList()
    expect(view.getByRole('heading', { name: 'Senior Frontend Engineer' })).toBeTruthy()
    expect(view.getByText('Acme Corp')).toBeTruthy()
    expect(view.getByText('📍 Remote (US)')).toBeTruthy()
    expect(view.getByText('· Full-time')).toBeTruthy()
    expect(view.getByText('· $130K–$160K')).toBeTruthy()
    expect(view.getByText('· Sep 20, 2026')).toBeTruthy()
    const links = view.getAllByRole('link', { name: 'Open' })
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/jobs/j1', '/jobs/j2'])
  })

  it('navigates to the job when the row is clicked', () => {
    const view = renderList()
    fireEvent.click(view.getByRole('heading', { name: 'Data Analyst' }))
    expect(view.getByText('job page j2')).toBeTruthy()
  })
})
