/**
 * React's recorded DOM passes axe-core's structural accessibility rules.
 *
 * Every framework's port is held to React's goldens, so a defect in React's markup
 * (a dialog without a name, a role whose children are presentational wrapped around
 * buttons, an `aria-controls` that names nothing) is copied into every port. This test
 * runs axe-core over each recorded snapshot of the UI kit and of every feature package
 * and fails on each violation, naming the component, the case, the rule and the element.
 *
 * Only rules that need no layout run: jsdom computes no boxes or colours, so contrast,
 * target size and visibility rules would report nothing true. A violation the case's
 * own input causes on purpose (an empty label it passes, a bare `<img>` it hands a
 * slot) is declared on that case as `a11y: { expect: [rule], reason }`; a declared rule
 * that no snapshot breaks fails too, so a declaration cannot outlive its cause.
 *
 * Found 2026-11-16: 34 feature goldens and 9 UI components broke these rules, among
 * them a reorderable list whose rows became `option`s and hid their move buttons.
 *
 * Reads the committed goldens; renders nothing.
 *
 * @module
 */

import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import {
  featureCaseSet,
  type FeatureGoldens,
  featureGoldensGroups,
  loadFeatureGoldens,
} from '../features/index.js'
import { featureCaseFileNames, loadFeatureCases } from '../features/load.js'
import { uiCaseFamilies, uiGoldens } from '../ui/run.js'
import type { CaseResult, UIComponentCases } from '../ui/spec.js'

/** The axe-core rules that read the DOM alone: no layout, colour or visibility. */
const RULES = [
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-command-name',
  'aria-dialog-name',
  'aria-hidden-focus',
  'aria-input-field-name',
  'aria-meter-name',
  'aria-progressbar-name',
  'aria-prohibited-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-text',
  'aria-toggle-field-name',
  'aria-tooltip-name',
  'aria-treeitem-name',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'button-name',
  'definition-list',
  'dlitem',
  'duplicate-id-aria',
  'form-field-multiple-labels',
  'image-alt',
  'input-button-name',
  'label',
  'link-name',
  'list',
  'listitem',
  'nested-interactive',
  'role-img-alt',
  'select-name',
  'svg-img-alt',
]

/**
 * A recorded snapshot as HTML: the recorder appends its own `@route …`, `@scroll …`,
 * `@focus …` and `@selection …` lines after the markup.
 *
 * @param snapshot - One recorded snapshot.
 * @returns Its markup.
 */
const markupOf = (snapshot: string): string =>
  snapshot
    .split('\n')
    .filter((line) => !/^@(route|scroll|focus|selection)\b/.test(line))
    .join('\n')

/**
 * The axe run in progress. axe-core runs one at a time and throws "Axe is already running"
 * at a second, so a case that outlives its timeout would fail every case after it; each run
 * waits for the one before.
 */
let previousRun: Promise<unknown> = Promise.resolve()

/**
 * The violations axe-core finds in one snapshot, as `rule: element` lines.
 *
 * @param snapshot - One recorded snapshot.
 * @param signal - The test's abort signal: a case that has timed out stops checking.
 * @returns rule id → the first offending element's markup.
 */
async function violations(snapshot: string, signal: AbortSignal): Promise<Map<string, string>> {
  const run = previousRun.then(async () => {
    signal.throwIfAborted()
    const root = document.createElement('main')
    root.innerHTML = markupOf(snapshot)
    document.body.replaceChildren(root)
    try {
      return await axe.run(root, {
        runOnly: { type: 'rule', values: RULES },
        resultTypes: ['violations'],
        // A golden's <iframe> (the IDE's preview) holds a page the component does not render,
        // and jsdom's frames cannot answer axe's cross-frame messages.
        iframes: false,
      })
    } finally {
      document.body.replaceChildren()
    }
  })
  // Only the order matters here: the caller awaits `run` itself and gets its error.
  previousRun = run.then(
    () => undefined,
    (_error: unknown) => undefined,
  )
  const result = await run
  return new Map(
    result.violations.map((v) => [
      v.id,
      (v.nodes[0]?.html ?? '').replace(/\s+/g, ' ').slice(0, 200),
    ]),
  )
}

/**
 * The problems of one component's recorded cases: each undeclared violation, and each
 * declared rule that no snapshot of its case breaks.
 *
 * @param label - The package and component, for the message.
 * @param family - The component's cases.
 * @param results - Its recorded results, by case name.
 * @param seen - Snapshots already checked (identical markup gives identical results).
 * @param signal - The test's abort signal.
 * @returns One line per problem.
 */
async function familyProblems(
  label: string,
  family: UIComponentCases,
  results: Record<string, CaseResult> | undefined,
  seen: Map<string, Map<string, string>>,
  signal: AbortSignal,
): Promise<string[]> {
  const problems: string[] = []
  for (const kase of family.cases) {
    const snapshots = results?.[kase.name]?.snapshots
    if (!snapshots?.length) continue
    const found = new Map<string, string>()
    for (const snapshot of snapshots) {
      let checked = seen.get(snapshot)
      if (!checked) {
        checked = await violations(snapshot, signal)
        seen.set(snapshot, checked)
      }
      for (const [rule, html] of checked) if (!found.has(rule)) found.set(rule, html)
    }
    const declared = new Set(kase.a11y?.expect ?? [])
    for (const [rule, html] of found)
      if (!declared.has(rule)) problems.push(`${label} [${kase.name}] ${rule}: ${html}`)
    for (const rule of declared)
      if (!found.has(rule))
        problems.push(`${label} [${kase.name}] declares ${rule}, but no snapshot breaks it`)
  }
  return problems
}

const HOW =
  'Fix the markup in the React package (and every port), then re-record its goldens; ' +
  'https://dequeuniversity.com/rules/axe/4.14/<rule> explains each rule. Only when the ' +
  "case's own input breaks the rule on purpose (an empty label it passes, a bare <img> it " +
  "hands a slot), declare it on the case: a11y: { expect: ['<rule>'], reason: '<what in the input>' }.\n"

/**
 * Time for one component's snapshots, or one goldens group's: a large component checks
 * hundreds, and this machine's load can slow axe tenfold. It only bounds a hang.
 */
const CASE_TIMEOUT = 180_000

/**
 * Every feature's cases as the runners see them, loaded before the tests are collected so each
 * component, and each goldens group of a grouped component, is a test of its own: one test per
 * feature outgrew any timeout once the IDE's chat panel held 700 cases.
 */
const features = await Promise.all(
  featureCaseFileNames().map(async (name) => ({
    name,
    feature: featureCaseSet(await loadFeatureCases(name)),
  })),
)

describe('React markup passes axe-core structural rules', () => {
  for (const family of uiCaseFamilies) {
    it(`UI kit ${family.component}`, { timeout: CASE_TIMEOUT }, async ({ signal }) => {
      const problems = await familyProblems(
        family.component,
        family,
        uiGoldens.cases[family.component],
        new Map(),
        signal,
      )
      expect(problems, HOW + problems.join('\n')).toEqual([])
    })
  }

  // A hooks-only feature (client-search, keyboard-shortcuts: `families: []`) renders no markup to check, and
  // vitest fails a suite that holds no test ("No test found in suite").
  for (const { name, feature } of features.filter(({ feature }) => feature.families.length))
    describe(name, () => {
      // Read once for the feature's tests, when the first one runs; identical snapshots are
      // checked once.
      let goldens: FeatureGoldens | null | undefined
      const seen = new Map<string, Map<string, string>>()
      const groups = featureGoldensGroups(feature)
      for (const family of feature.families) {
        const groupOf = groups[family.component]
        const parts = groupOf
          ? [...new Set(family.cases.map((c) => groupOf[c.name]!))].map((group) => ({
              label: `${family.component} ${group}`,
              cases: { ...family, cases: family.cases.filter((c) => groupOf[c.name] === group) },
            }))
          : [{ label: family.component, cases: family }]
        for (const part of parts)
          it(part.label, { timeout: CASE_TIMEOUT }, async ({ signal }) => {
            if (goldens === undefined) goldens = loadFeatureGoldens(feature.package)
            if (!goldens) return
            const problems = await familyProblems(
              `${feature.package} ${family.component}`,
              part.cases,
              goldens.cases[family.component],
              seen,
              signal,
            )
            expect(problems, HOW + problems.join('\n')).toEqual([])
          })
      }
    })
})
