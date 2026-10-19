import { describe, expect, it } from 'vitest'

import { type CausePageErrors, failureCausesNote, missingHeaderNote } from '../utilities.js'

/**
 * xr-molecule-flash-m193's four failures, verbatim from the run's log: the register test's
 * profile link, the health check's brand link, the navigation test's home link and the
 * navbar-avatar test's picture. Each block carries its own `Locator:` line, which is where this
 * reading gets the ancestor from.
 */
const M193_LOG = `  1) [chromium] › fixtures/realworld/specs/e2e/auth.spec.ts:7:3 › Authentication › should register a new user

    Error: expect(locator).toBeVisible() failed

    Locator: locator('a[href="/profile/testuser1792370227262"]')
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" locator('a[href="/profile/testuser1792370227262"]') with timeout 10000ms
      - waiting for locator('a[href="/profile/testuser1792370227262"]')

  2) [chromium] › fixtures/realworld/specs/e2e/health.spec.ts:5:3 › Health Checks › app should load successfully

    Error: expect(locator).toBeVisible() failed

    Locator: locator('a.navbar-brand')
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" locator('a.navbar-brand') with timeout 10000ms
      - waiting for locator('a.navbar-brand')

  3) [chromium] › fixtures/realworld/specs/e2e/navigation.spec.ts:21:3 › Navigation and routing › should navigate to main pages when logged in

    Error: expect(locator).toBeVisible() failed

    Locator: locator('nav a[href="/"]')
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" locator('nav a[href="/"]') with timeout 10000ms
      - waiting for locator('nav a[href="/"]')

  4) [chromium] › fixtures/realworld/specs/e2e/null-fields.spec.ts:33:3 › Null/Empty Image and Bio Handling › newly registered user should show default avatar in navbar

    Error: expect(locator).toBeVisible() failed

    Locator: locator('nav .user-pic')
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" locator('nav .user-pic') with timeout 10000ms
      - waiting for locator('nav .user-pic')

  3 failed
    [chromium] › fixtures/realworld/specs/e2e/auth.spec.ts:7:3 › Authentication › should register a new user
    [chromium] › fixtures/realworld/specs/e2e/health.spec.ts:5:3 › Health Checks › app should load successfully
    [chromium] › fixtures/realworld/specs/e2e/navigation.spec.ts:21:3 › Navigation and routing › should navigate to main pages when logged in
`

/** The snapshot facts the artifact reader produces for a page with feed content and NO `<nav>`. */
const NO_NAV = { landmarks: [] as string[], populated: true }

/** m193's four snapshots, keyed the way the run's log prints each test's location. */
const M193_SNAPSHOTS: CausePageErrors[] = [
  {
    where: 'fixtures/realworld/specs/e2e/auth.spec.ts:7',
    items: [],
    ...NO_NAV,
  },
  {
    where: 'fixtures/realworld/specs/e2e/health.spec.ts:5',
    items: [],
    ...NO_NAV,
  },
  {
    where: 'fixtures/realworld/specs/e2e/navigation.spec.ts:21',
    items: [],
    ...NO_NAV,
  },
  {
    where: 'fixtures/realworld/specs/e2e/null-fields.spec.ts:33',
    items: [],
    ...NO_NAV,
  },
]

describe('missingHeaderNote', () => {
  it('names the route and the three selectors that need the missing navigation', () => {
    expect(missingHeaderNote(M193_LOG, M193_SNAPSHOTS)).toBe(
      'The `/` snapshots contain populated main content but no navigation landmark. These ' +
        '`a.navbar-brand`, `nav a[href="/"]` and `nav .user-pic` failures share the missing ' +
        'header; check whether the route actually renders its shared header before changing ' +
        'authentication or the header component’s internals.',
    )
  })

  it('leads the grouped causes note without stopping anything', () => {
    const note = failureCausesNote(M193_LOG, [], undefined, M193_SNAPSHOTS)
    expect(note).toContain(
      'The `/` snapshots contain populated main content but no navigation landmark.',
    )
    expect(note).toContain('4 failures in this run, grouped by cause')
    expect(note?.startsWith('The `/` snapshots')).toBe(true)
  })

  it('says nothing when the snapshots contain the navigation', () => {
    const withNav = M193_SNAPSHOTS.map((entry) => ({ ...entry, landmarks: ['navigation'] }))
    expect(missingHeaderNote(M193_LOG, withNav)).toBeNull()
    // ... and the causes note still lists the four failures, unchanged.
    const note = failureCausesNote(M193_LOG, [], undefined, withNav)
    expect(note).not.toContain('missing header')
  })

  it('says nothing when a snapshot is missing or blank', () => {
    const missing = M193_SNAPSHOTS.slice(0, 3)
    expect(missingHeaderNote(M193_LOG, missing)).toBeNull()
    const blank = M193_SNAPSHOTS.map((entry) => ({ ...entry, populated: false }))
    expect(missingHeaderNote(M193_LOG, blank)).toBeNull()
  })

  it('says nothing when the snapshots were never read', () => {
    const unread = M193_SNAPSHOTS.map(({ where, items }) => ({ where, items }))
    expect(missingHeaderNote(M193_LOG, unread)).toBeNull()
  })

  it('needs two failures: one landmark selector is not a shared header', () => {
    const one = `  1) [chromium] › health.spec.ts:5:3 › Health Checks › app should load successfully

    Error: expect(locator).toBeVisible() failed

    Locator: locator('a.navbar-brand')
    Expected: visible
    Error: element(s) not found
`
    expect(
      missingHeaderNote(one, [
        { where: 'health.spec.ts:5', items: [], landmarks: [], populated: true },
      ]),
    ).toBeNull()
  })

  it('does not group selectors that name no landmark (the profile link alone)', () => {
    const onlyLink = `  1) [chromium] › auth.spec.ts:7:3 › Authentication › should register a new user

    Error: expect(locator).toBeVisible() failed

    Locator: locator('a[href="/profile/testuser1"]')
    Expected: visible
    Error: element(s) not found
`
    expect(
      missingHeaderNote(onlyLink, [
        { where: 'auth.spec.ts:7', items: [], landmarks: [], populated: true },
      ]),
    ).toBeNull()
  })

  it('names a header landmark for a banner selector', () => {
    const log = `  1) [chromium] › pages.spec.ts:5:3 › App › home

    Error: expect(locator).toBeVisible() failed

    Locator: locator('header a[href="/"]')
    Expected: visible
    Error: element(s) not found

  2) [chromium] › pages.spec.ts:6:3 › App › about

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[role="banner"] .logo')
    Expected: visible
    Error: element(s) not found
`
    expect(
      missingHeaderNote(log, [
        { where: 'pages.spec.ts:5', items: [], landmarks: [], populated: true },
        { where: 'pages.spec.ts:6', items: [], landmarks: [], populated: true },
      ]),
    ).toBe(
      'The `/` snapshots contain populated main content but no header landmark. These ' +
        '`header a[href="/"]` and `[role="banner"] .logo` failures share the missing header; check whether ' +
        'the route actually renders its shared header before changing authentication or the ' +
        'header component’s internals.',
    )
  })

  it('says nothing when two landmark failures name different routes', () => {
    const log = `  1) [chromium] › a.spec.ts:5:3 › App › home

    Error: expect(locator).toBeVisible() failed

    Locator: locator('nav a[href="/"]')
    Expected: visible
    Error: element(s) not found

  2) [chromium] › a.spec.ts:9:3 › App › settings

    Error: expect(locator).toBeVisible() failed

    Locator: locator('nav a[href="/settings"]')
    Expected: visible
    Error: element(s) not found
`
    expect(
      missingHeaderNote(log, [
        { where: 'a.spec.ts:5', items: [], landmarks: [], populated: true },
        { where: 'a.spec.ts:9', items: [], landmarks: [], populated: true },
      ]),
    ).toBeNull()
  })
})
