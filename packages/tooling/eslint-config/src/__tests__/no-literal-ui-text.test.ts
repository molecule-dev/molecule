import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import { moleculeLocalPlugin } from '../plugin.mjs'

const config: Linter.Config[] = [
  {
    files: ['**/*.tsx'],
    linterOptions: { noInlineConfig: true },
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'molecule-local': moleculeLocalPlugin },
    rules: { 'molecule-local/no-literal-ui-text': 'error' },
  },
]
const linter = new Linter()
const lint = (source: string): Linter.LintMessage[] =>
  linter.verify(source, config, { filename: 'fixture.tsx' })

describe('no-literal-ui-text', () => {
  // The shapes found in molecule's React feature packages on 2026-11-15.
  it.each([
    '<span aria-label="Pinned">📌</span>',
    '<button aria-label="Previous month" />',
    '<input placeholder="Header" />',
    '<span title="Locked">🔒</span>',
    '<img alt="Company logo" src={src} />',
    '<track kind="captions" label="English" />',
    '<ConfirmDialog title="Remove image?" />',
    "<nav aria-label={'Breadcrumb'} />",
    '<nav aria-label={`Footer`} />',
    '<button aria-label={open ? "Close" : "Open"} />',
    '<button aria-label={name || "Player"} />',
    '<div aria-roledescription="carousel" />',
    '<input aria-valuetext="50 percent" />',
    '<span aria-label="Épinglé" />',
    // Only `no` opts out, and only for the element and what it contains.
    '<svg translate="yes" aria-label="GitHub" />',
    '<div><span translate="no" /><input placeholder="Header" /></div>',
  ])('reports %s', (source) => {
    const messages = lint(`const node = ${source}`)
    expect(messages.length).toBeGreaterThan(0)
    expect(
      messages.every((m) => m.ruleId === 'molecule-local/no-literal-ui-text' && m.severity === 2),
    ).toBe(true)
  })

  it.each([
    // A component whose props do not declare `translate` receives it through a spread.
    `const NOT_TRANSLATED = { translate: 'no' } as const\nconst node = <Input {...NOT_TRANSLATED} placeholder="https://api.example.com" />`,
    'const node = <Input {...{ translate: \'no\' }} placeholder=\'{"key": "value"}\' />',
    `const KEEP = { translate: 'no' } satisfies Record<string, string>\nconst node = <div {...KEEP}><input placeholder="node_modules, dist" /></div>`,
  ])('allows translate="no" through a spread: %s', (source) => {
    expect(lint(source)).toEqual([])
  })

  it.each([
    // Only a const object literal that sets translate to no opts out.
    `const OPTS = { translate: 'yes' }\nconst node = <Input {...OPTS} placeholder="Search" />`,
    `let OPTS = { translate: 'no' }\nconst node = <Input {...OPTS} placeholder="Search" />`,
    `const node = <Input {...props} placeholder="Search" />`,
    `const OPTS = makeOptions()\nconst node = <Input {...OPTS} placeholder="Search" />`,
  ])('still reports a spread that does not set translate="no": %s', (source) => {
    expect(lint(source).map((m) => m.ruleId)).toEqual(['molecule-local/no-literal-ui-text'])
  })

  it('reports each literal branch, and names the fix', () => {
    const messages = lint('const node = <button aria-label={open ? "Close" : "Open"} />')
    expect(messages).toHaveLength(2)
    expect(messages[0].message).toContain('t(\'<namespace>.<key>\', {}, { defaultValue: "Close" })')
  })

  it.each([
    '<span aria-label={t("noteCard.pinned", {}, { defaultValue: "Pinned" })} />',
    '<img alt="" src={src} />',
    '<span aria-label={label} />',
    '<span title={`${count} items`} />',
    '<span aria-label="·" />',
    '<span title="—" />',
    '<span aria-label="42" />',
    '<button aria-labelledby="title-1" />',
    '<div data-mol-id="row-open" className={cm.row} />',
    '<input type="range" min={0} />',
    '<button aria-label={open ? t("a") : t("b")} />',
    // translate="no": text that stays as written in every language.
    '<svg translate="no" aria-label="GitHub" role="img" />',
    '<option translate="no" value="POST" label="POST" />',
    '<div translate="no"><input placeholder="https://api.example.com" /></div>',
  ])('allows %s', (source) => {
    expect(lint(`const node = ${source}`)).toEqual([])
  })
})
