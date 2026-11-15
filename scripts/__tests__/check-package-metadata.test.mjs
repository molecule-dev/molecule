/**
 * The package-metadata gate's description rules: every publishable package has one, and a
 * framework counterpart describes itself in its own framework's terms, never in the React
 * package's it was written from.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { descriptionProblems, frameworkDescriptionProblems } from '../check-package-metadata.mjs'

const ROOT = join(import.meta.dirname, '..', '..')

describe('descriptionProblems', () => {
  it('refuses a package with no description, or an empty one', () => {
    // 176 packages shipped this way: 151 with no field, 25 with an empty string.
    const none = [
      'no description: npm shows the package without one and npm search cannot match it',
    ]
    expect(descriptionProblems({ name: '@molecule/app-locales-vue' })).toEqual(none)
    expect(descriptionProblems({ name: '@molecule/api-ai-openai', description: '' })).toEqual(none)
    expect(descriptionProblems({ name: '@molecule/api-ai-openai', description: '  ' })).toEqual(
      none,
    )
  })

  it('passes a described package on to the framework rule', () => {
    expect(
      descriptionProblems({
        name: '@molecule/app-locales-vue',
        description: 'Translations for @molecule/app-vue',
      }),
    ).toEqual([])
    expect(
      descriptionProblems({
        name: '@molecule/app-breadcrumb-vue',
        description: 'React breadcrumb navigation component',
      }),
    ).toHaveLength(1)
  })
})

describe('frameworkDescriptionProblems', () => {
  it("refuses a counterpart that kept its React package's description", () => {
    // The shape 36 counterparts were generated with.
    expect(
      frameworkDescriptionProblems({
        name: '@molecule/app-breadcrumb-vue',
        description: 'React breadcrumb navigation component',
      }),
    ).toEqual([
      'description names React, but this is the Vue package: describe it in Vue\'s terms ("React breadcrumb navigation component")',
    ])
    expect(
      frameworkDescriptionProblems({
        name: '@molecule/app-safe-link-angular',
        description: 'SafeLink React Router wrapper',
      }),
    ).toHaveLength(1)
  })

  it('refuses every other framework a counterpart names, JSX included outside Solid', () => {
    const problems = frameworkDescriptionProblems({
      name: '@molecule/app-x-svelte',
      description: 'A Vue port of the Angular widget; compose it with JSX children',
    })
    expect(problems.map((p) => p.split(',')[0])).toEqual([
      'description names Vue',
      'description names Angular',
      'description names JSX',
    ])
  })

  it("accepts a counterpart in its own terms, and JSX in Solid's", () => {
    expect(
      frameworkDescriptionProblems({
        name: '@molecule/app-breadcrumb-vue',
        description: 'Vue breadcrumb navigation component',
      }),
    ).toEqual([])
    expect(
      frameworkDescriptionProblems({
        name: '@molecule/app-settings-panel-solid',
        description: 'Apps compose via JSX children',
      }),
    ).toEqual([])
    // A word boundary: "Reactive" is not React.
    expect(
      frameworkDescriptionProblems({
        name: '@molecule/app-x-angular',
        description: 'Reactive form fields',
      }),
    ).toEqual([])
  })

  it('leaves React packages and packages without a framework suffix alone', () => {
    expect(
      frameworkDescriptionProblems({
        name: '@molecule/app-settings-panel-react',
        description: 'Apps compose via JSX children, as in the Vue port',
      }),
    ).toEqual([])
    expect(
      frameworkDescriptionProblems({
        name: '@molecule/app-ui',
        description: 'UI contract for React, Vue, Solid, Svelte and Angular bindings',
      }),
    ).toEqual([])
  })

  it('passes on the tree', () => {
    const out = execFileSync('node', [join(ROOT, 'scripts', 'check-package-metadata.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(out).toContain('a fitting description')
  })
})
