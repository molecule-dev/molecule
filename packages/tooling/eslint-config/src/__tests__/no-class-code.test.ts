import { readFile } from 'node:fs/promises'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { expect, it } from 'vitest'

import { moleculeLocalPlugin } from '../plugin.mjs'

const config: Linter.Config[] = [
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}'],
    linterOptions: { noInlineConfig: true },
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'molecule-local': moleculeLocalPlugin },
    rules: { 'molecule-local/no-class-code': 'error' },
  },
]
const linter = new Linter()
const lint = (source: string, filename = 'fixture.tsx'): Linter.LintMessage[] =>
  linter.verify(source, config, { filename })

it.each(['$', '?', ':', '{', '}', "'active'", '"active"'])(
  'rejects a JavaScript token %s rendered as a class',
  (token) => {
    const source = `const node = <button className={${JSON.stringify('control ' + token)}} />`
    expect(lint(source)).toEqual([
      expect.objectContaining({ ruleId: 'molecule-local/no-class-code', severity: 2 }),
    ])
  },
)
it('rejects the lost interpolation brace shape from the retained source', () => {
  const source =
    "const control = <button className={`btn btn-sm pull-xs-right $\n favorited ? 'btn-primary' : 'btn-outline-primary'\n }`} />"
  const messages = lint(source)
  expect(messages).toHaveLength(1)
  expect(messages[0]).toMatchObject({ ruleId: 'molecule-local/no-class-code', line: 1 })
  expect(messages[0].message).toContain('${...}')
})
it.each([
  '<button className={`control ${active ? "selected" : "idle"}`} />',
  `<i className="before:content-['x'] text-[color:var(--ink)] [&>*]:p-2" />`,
  `<i className="content-['?'] font-['Open_Sans'] bg-[url('x.svg')]" />`,
  '<i className="hover:focus:bg-red-500 w-[calc(100%-1px)]" />',
  'const label = "$ ? : { }"',
  'const styles = {color: "?"}',
  '<i className={active ? "selected" : "idle"} />',
  '<i className={cm.cn(cm.button(), active && cm.selected)} />',
])('accepts expressions and legitimate arbitrary CSS values: %s', (source) => {
  // Statements are valid as written; expression examples get a declaration.
  expect(lint(source.startsWith('const ') ? source : 'const node = ' + source)).toEqual([])
})
it.each([
  `const node = {className: "control ? 'active' : 'idle'"}`,
  `element.setAttribute('class', "control $")`,
  `element.classList.add('control ?')`,
  `cm.cn('control ?')`,
])('covers literal DOM and class-map destinations: %s', (source) => {
  expect(lint(source)).toEqual([
    expect.objectContaining({ ruleId: 'molecule-local/no-class-code' }),
  ])
})
it('rejects the complete recorded component and accepts the repaired interpolation', async () => {
  const source = await readFile(
    new URL('./fixtures/class-code-lost-interpolation.tsx.fixture', import.meta.url),
    'utf8',
  )
  expect(lint(source)).toEqual([
    expect.objectContaining({ ruleId: 'molecule-local/no-class-code' }),
  ])
  expect(lint(source.replace('pull-xs-right $\n', 'pull-xs-right ${\n'))).toEqual([])
})
