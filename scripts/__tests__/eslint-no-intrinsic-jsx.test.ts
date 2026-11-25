import { relative, resolve } from 'node:path'

import { ESLint, RuleTester } from 'eslint'
import ts from 'typescript'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import {
  intrinsicJsxConfig,
  isTestFile,
  pendingWithIntrinsicJsx,
  prunedPending,
  readPending,
  sourceFiles,
} from '../../eslint-rules/intrinsic-jsx-config.mjs'
import rule, { ELEMENT_FOR_TAG, TAKES_AS } from '../../eslint-rules/no-intrinsic-jsx.mjs'

/**
 * Unit tests for `molecule-intrinsic-jsx/no-intrinsic-jsx`: a lowercase JSX element reports, with
 * the element of `@molecule/app-ui-react/elements` that replaces it in the message; a member
 * element, a namespaced one and a fragment pass. Then the rule through its config block over the
 * real tree: `eslint-rules/intrinsic-jsx-pending.json` lists only packages that still render an
 * intrinsic element, and every other file of the React features and the React UI kit is held and
 * reports nothing.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

/** The typescript-eslint parser reads JSX only in a `.tsx` file. */
const TSX = { filename: 'test.tsx' }

/** The end of every message that names an element. */
const FROM = " from '@molecule/app-ui-react/elements'"

/** What a container may be instead of a `Box`. */
const CONTAINER = ' (or `Text` when its children are text, `Pressable` when it is clickable)'

/** The message for a tag the elements cover. */
const replacedBy = (tag: string, element: string, tail = ''): string =>
  `\`<${tag}>\` cannot render on React Native: use \`${element}\`${FROM}${tail}.`

ruleTester.run('no-intrinsic-jsx', rule as RuleModule, {
  valid: [
    { ...TSX, name: 'a Box', code: 'const x = <Box as="div">badge</Box>' },
    { ...TSX, name: 'a Text', code: 'const x = <Text as="p">line</Text>' },
    { ...TSX, name: 'a member element', code: 'const x = <motion.div />' },
    { ...TSX, name: 'a namespaced element', code: 'const x = <svg:path d="M0" />' },
    { ...TSX, name: 'a fragment', code: 'const x = <>line</>' },
  ],
  invalid: [
    {
      ...TSX,
      name: 'a div',
      code: 'const x = <div>badge</div>',
      // The whole sentence, as a reader meets it.
      errors: [
        {
          message: `\`<div>\` cannot render on React Native: use \`<Box as="div">\` from '@molecule/app-ui-react/elements' (or \`Text\` when its children are text, \`Pressable\` when it is clickable).`,
        },
      ],
    },
    {
      ...TSX,
      name: 'a self-closing span',
      code: 'const x = <span />',
      errors: [{ message: replacedBy('span', '<Box as="span">', CONTAINER) }],
    },
    {
      ...TSX,
      name: 'a clickable button',
      code: 'const x = (f: () => void) => <button onClick={f}>go</button>',
      errors: [{ message: replacedBy('button', '<Pressable as="button">') }],
    },
    {
      ...TSX,
      name: 'a link',
      code: 'const x = <a href="x">home</a>',
      errors: [{ message: replacedBy('a', '<Link>') }],
    },
    {
      ...TSX,
      name: 'an svg and the path in it',
      code: 'const x = <svg><path d="M0" /></svg>',
      errors: [{ message: replacedBy('svg', '<Svg>') }, { message: replacedBy('path', '<Path>') }],
    },
    {
      ...TSX,
      name: 'an input',
      code: 'const x = <input />',
      errors: [
        {
          message: replacedBy(
            'input',
            '<TextField as="input">',
            ' (or `CheckField as="input"` for a checkbox or radio)',
          ),
        },
      ],
    },
    {
      ...TSX,
      name: 'a paragraph',
      code: 'const x = <p>line</p>',
      errors: [{ message: replacedBy('p', '<Text as="p">') }],
    },
    {
      ...TSX,
      name: 'an image',
      code: 'const x = <img src="x" />',
      errors: [{ message: replacedBy('img', '<Image>') }],
    },
    {
      ...TSX,
      name: 'an svg text, which is SvgText and not Text',
      code: 'const x = <svg><text>x</text></svg>',
      errors: [
        { message: replacedBy('svg', '<Svg>') },
        { message: replacedBy('text', '<SvgText>') },
      ],
    },
    {
      ...TSX,
      name: 'a table and its cells',
      code: 'const x = <table><tbody><tr><th>a</th><td>b</td></tr></tbody></table>',
      errors: [
        { message: replacedBy('table', '<TableBox as="table">') },
        { message: replacedBy('tbody', '<TableBox as="tbody">') },
        { message: replacedBy('tr', '<TableBox as="tr">') },
        { message: replacedBy('th', '<TableCell as="th">') },
        { message: replacedBy('td', '<TableCell as="td">') },
      ],
    },
    {
      ...TSX,
      name: 'a form and its fieldset',
      code: 'const x = <form><fieldset /></form>',
      errors: [
        { message: replacedBy('form', '<FormArea as="form">') },
        { message: replacedBy('fieldset', '<Fieldset as="fieldset">') },
      ],
    },
    {
      ...TSX,
      name: 'a select, which no element covers yet',
      code: 'const x = <select />',
      errors: [
        {
          message:
            '`<select>` cannot render on React Native: use an element from @molecule/app-ui-react/elements (add one if none fits).',
        },
      ],
    },
  ],
})

const ROOT = resolve(import.meta.dirname, '..', '..')
const RULE = 'molecule-intrinsic-jsx/no-intrinsic-jsx'

/** The element types: each element's props are `<Element>Props` there (`Link`'s are `ElementLinkProps`). */
const ELEMENT_TYPES = resolve(ROOT, 'packages/app/core/ui/src/elements.ts')

/**
 * The web tags each element's `as` prop accepts, read from the element types with the TypeScript
 * checker: every variant of a union of props (`TextProps`) counts.
 *
 * @returns Each element with an `as` prop, and its tags, sorted.
 */
const tagsEachElementTakes = (): Map<string, string[]> => {
  const program = ts.createProgram([ELEMENT_TYPES], { noEmit: true, skipLibCheck: true })
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(ELEMENT_TYPES)
  const module = source && checker.getSymbolAtLocation(source)
  if (!source || !module) throw new Error(`cannot read ${ELEMENT_TYPES}`)
  const taken = new Map<string, string[]>()
  for (const symbol of checker.getExportsOfModule(module)) {
    if (!symbol.name.endsWith('Props')) continue
    const props = checker.getDeclaredTypeOfSymbol(symbol)
    const tags = (props.isUnion() ? props.types : [props]).flatMap((variant) => {
      const as = checker.getPropertyOfType(variant, 'as')
      if (!as) return []
      const type = checker.getTypeOfSymbolAtLocation(as, source)
      return (type.isUnion() ? type.types : [type]).flatMap((tag) =>
        tag.isStringLiteral() ? [tag.value] : [],
      )
    })
    const element = symbol.name.slice(0, -'Props'.length).replace(/^ElementLink$/, 'Link')
    if (tags.length > 0) taken.set(element, [...new Set(tags)].sort())
  }
  return taken
}

describe('the tags the rule names agree with the element types', () => {
  const taken = tagsEachElementTakes()

  it('reads the element types', () => {
    // A rename in elements.ts would otherwise leave the checks below with nothing to compare.
    for (const element of ['Box', 'Text', 'Pressable', 'TextField'])
      expect(taken.get(element), `${element}Props has an \`as\` prop`).toBeDefined()
  })

  it('suggests only an `as` the element accepts', () => {
    const refused = [...ELEMENT_FOR_TAG]
      .filter(([tag, element]) => TAKES_AS.has(element) && !taken.get(element)?.includes(tag))
      .map(
        ([tag, element]) => `<${element} as="${tag}">: ${element}Props does not take as="${tag}"`,
      )
    expect(refused).toEqual([])
  })

  it('writes `as` for exactly the elements whose props have it', () => {
    const named = new Set(ELEMENT_FOR_TAG.values())
    const withAs = [...taken.keys()].filter((element) => named.has(element)).sort()
    expect([...TAKES_AS].sort()).toEqual(withAs)
  })

  it('names an element for every tag an element renders', () => {
    // Otherwise the rule says "add one if none fits" for a tag an element already renders.
    const unmapped = [...taken].flatMap(([element, tags]) =>
      tags
        .filter((tag) => !ELEMENT_FOR_TAG.has(tag))
        .map(
          (tag) =>
            `<${tag}>: ${element} renders it; add it to ELEMENT_FOR_TAG in eslint-rules/no-intrinsic-jsx.mjs`,
        ),
    )
    expect(unmapped).toEqual([])
  })
})
const block = intrinsicJsxConfig({ rules: { 'no-intrinsic-jsx': rule as RuleModule } })

// The repo's eslint.config.js parses .tsx with typescript-eslint (its `tseslint.configs.recommended`);
// alone, the block needs that parser to read the files.
const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: [{ files: ['**/*.tsx'], languageOptions: { parser: tseslint.parser } }, block],
})

const pending = readPending()

/** Whether the pending list exempts the package a file is part of. */
const isPending = (file: string): boolean =>
  pending.features.some((feature) => file.startsWith(`packages/app/features/${feature}/src/`)) ||
  pending.kitComponents.some(
    (component) => `packages/app/frameworks/react-ui/src/components/${component}` === file,
  )

/** A component that renders an intrinsic element, for the paths where the rule must fire. */
const BAD =
  "import type { ReactElement } from 'react'\nexport const badge = (): ReactElement => <div>badge</div>\n"

/** The reports of the rule in a lint result: `line` and message. */
const reports = (result: {
  messages: { ruleId: string | null; line: number; message: string }[] | undefined
}) =>
  (result.messages ?? [])
    .filter((message) => message.ruleId === RULE)
    .map((message) => [message.line, message.message])

describe('eslint-rules/intrinsic-jsx-pending.json', () => {
  it('is sorted and has no duplicates', () => {
    for (const [list, name] of [
      [pending.features, 'features'],
      [pending.kitComponents, 'kitComponents'],
    ] as const) {
      expect([...list].sort(), `the "${name}" list is not sorted`).toEqual(list)
      expect(new Set(list).size, `the "${name}" list has duplicates`).toBe(list.length)
    }
  })

  it('lists only packages that still render an intrinsic JSX element', () => {
    const still = pendingWithIntrinsicJsx(ROOT)
    const stale = [
      ...pending.features
        .filter((feature) => !still.features[feature])
        .map(
          (feature) =>
            `packages/app/features/${feature} no longer renders an intrinsic JSX element: delete "${feature}" from the "features" list in eslint-rules/intrinsic-jsx-pending.json`,
        ),
      ...pending.kitComponents
        .filter((component) => !still.kitComponents[component])
        .map(
          (component) =>
            `packages/app/frameworks/react-ui/src/components/${component} no longer renders an intrinsic JSX element: delete "${component}" from the "kitComponents" list in eslint-rules/intrinsic-jsx-pending.json`,
        ),
    ]
    expect(stale).toEqual([])
    // A list with nothing stale is what the command that drops stale entries writes back.
    expect(prunedPending(ROOT)).toEqual(pending)
  })
})

// The last test reads both trees with the TypeScript parser and again with ESLint's; on a busy
// machine that needs the time.
describe(
  'the no-intrinsic-jsx block over the React features and the React UI kit',
  { timeout: 120_000 },
  () => {
    it('reports a lowercase element in a package the pending list does not exempt', async () => {
      const probes = [
        'packages/app/features/zz-known-bad-react/src/Badge.tsx',
        'packages/app/frameworks/react-ui/src/components/KnownBad.tsx',
      ]
      expect(pending.features, 'the probe feature must stay out of the pending list').not.toContain(
        'zz-known-bad-react',
      )
      expect(
        pending.kitComponents,
        'the probe component must stay out of the pending list',
      ).not.toContain('KnownBad.tsx')
      for (const filePath of probes) {
        const [result] = await eslint.lintText(BAD, { filePath })
        expect(reports(result), filePath).toEqual([
          [2, expect.stringContaining('use `<Box as="div">`')],
        ])
      }
    })

    it('exempts a pending package: the list is the only way past the rule', async () => {
      const probes = [
        ...pending.features
          .slice(0, 1)
          .map((feature) => `packages/app/features/${feature}/src/Badge.tsx`),
        ...pending.kitComponents
          .slice(0, 1)
          .map((component) => `packages/app/frameworks/react-ui/src/components/${component}`),
      ]
      for (const filePath of probes) {
        const [result] = await eslint.lintText(BAD, { filePath })
        expect(reports(result), filePath).toEqual([])
      }
    })

    it('holds every other .tsx file of both trees, and reports none', async () => {
      const sources = sourceFiles(ROOT)
      const results = await eslint.lintFiles(block.files)

      // ESLint returns a result for an exempted file too (with nothing run), so reaching every file
      // is one fact and holding it is another: the second is read from each file's configuration.
      const reached = results.map((result) => relative(ROOT, result.filePath)).sort()
      expect(
        reached.filter((file) => !isTestFile(file)),
        'the files the globs reach',
      ).toEqual(sources)
      for (const file of sources) {
        // A file no config object matches gets ESLint's default configuration, which has no rules.
        const { rules = {} } = (await eslint.calculateConfigForFile(file)) ?? {}
        if (isPending(file))
          expect(rules[RULE], `${file} is pending: the rule must not hold it`).toBeUndefined()
        else expect(rules[RULE], `${file} is not pending: the rule must hold it`).toEqual([2])
      }

      const offences = results.flatMap((result) =>
        [...result.messages, ...result.suppressedMessages]
          .filter((message) => message.ruleId === RULE || message.fatal)
          .map(
            (message) =>
              `${relative(ROOT, result.filePath)}:${message.line} (column ${message.column}) ${message.message}`,
          ),
      )
      expect(
        offences,
        'files outside eslint-rules/intrinsic-jsx-pending.json that render an intrinsic element (replace it with the element its message names: the pending list only shrinks, so add no entry), or that do not parse',
      ).toEqual([])
    })
  },
)
