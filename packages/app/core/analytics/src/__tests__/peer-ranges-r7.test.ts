import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const applyReleasePlan = require('@changesets/apply-release-plan').default
const { defaultConfig } = require('@changesets/config')
const semver = require('semver')

it('the real changesets release excludes analytics cores missing the SDK helper', async () => {
  const root = join(tmpdir(), `molecule-peer-release-${process.pid}`)
  mkdirSync(root, { recursive: true })
  const rootPackage = { name: 'private-peer-fixture', version: '0.0.0', private: true }
  writeFileSync(join(root, 'package.json'), JSON.stringify(rootPackage))
  const packages = ['core/analytics', 'bonds/analytics/posthog', 'bonds/analytics/mixpanel'].map(
    (relative) => {
      const packageJson = JSON.parse(
        readFileSync(new URL(`../../../../${relative}/package.json`, import.meta.url), 'utf8'),
      )
      const dir = join(root, packageJson.name.replace('@molecule/', ''))
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'package.json'), JSON.stringify(packageJson))
      return { dir, packageJson }
    },
  )
  const releases = packages.map(({ packageJson }) => ({
    name: packageJson.name,
    type: 'patch',
    oldVersion: packageJson.version,
    newVersion: semver.inc(packageJson.version, 'patch'),
    changesets: [],
  }))
  await applyReleasePlan(
    { changesets: [], releases },
    { root: { dir: root, packageJson: rootPackage }, packages },
    {
      ...defaultConfig,
      changelog: false,
      prettier: false,
      updateInternalDependencies: 'patch',
      ___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH: {
        ...defaultConfig.___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH,
        onlyUpdatePeerDependentsWhenOutOfRange: true,
      },
    },
  )
  const ranges = Object.fromEntries(
    packages.slice(1).map(({ dir, packageJson }) => {
      const released = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      const range = released.peerDependencies['@molecule/app-analytics']
      expect(semver.satisfies('1.1.1', range)).toBe(true)
      return [packageJson.name, semver.satisfies('1.1.0', range)]
    }),
  )
  expect(ranges).toEqual({
    '@molecule/app-analytics-posthog': false,
    '@molecule/app-analytics-mixpanel': false,
  })
})
