/**
 * The full config, driven through real ESLint: the standard Express `Request` augmentation lints
 * clean (a config that flagged it would fail a new project's `npm run lint` the moment it types
 * `req.user`), React's hook rules follow the workspace's React dependency, and router imports move
 * to the routing bond. Negative controls prove each check can fail.
 *
 * @module
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ESLint, type Linter } from 'eslint'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type LintProject, lintProject } from './project.js'

let project: LintProject
let dir: string
let eslint: ESLint

beforeEach(async () => {
  project = await lintProject({
    dependencies: {
      '@molecule/app-react': '1.0.0',
      '@molecule/app-routing-react-router': '1.0.0',
    },
  })
  dir = project.root
  eslint = new ESLint({ cwd: dir, overrideConfigFile: project.configFile })
})

afterEach(() => project.remove())

describe('collection wrappers in the config', () => {
  const wrapper = 'className="catalog-grid divided"'
  const empty = '<li>No matching products.</li>'
  const items = 'result.rows?.map((row) => <li key={row.id}>{row.name}</li>)'
  const list = `<ul ${wrapper}>{${items}}</ul>`
  const fallback = `<ul ${wrapper}>{result.rows?.length ? null : ${empty}}</ul>`

  async function findings(children: string): Promise<Linter.LintMessage[]> {
    const [result] = await eslint.lintText(
      [
        'export function Catalog({ result }) {',
        '  return <>',
        ...children.split('\n').map((line) => `    ${line}`),
        '  </>',
        '}',
      ].join('\n'),
      { filePath: join(dir, 'src/Catalog.tsx') },
    )
    expect(result.fatalErrorCount).toBe(0)
    return result.messages.filter(
      (message) => message.ruleId === 'molecule-local/no-duplicate-list-wrapper',
    )
  }

  it.each([
    [
      'a shared loading guard',
      `{!result.loading && ${fallback}}\n{!result.loading && Boolean(result.rows?.length) && ${list}}`,
    ],
    ['an unconditional placeholder', `${fallback}\n{Boolean(result.rows?.length) && ${list}}`],
    [
      'reordered class tokens and an inverted empty check',
      `<ul className="divided catalog-grid">{!result.rows?.length ? ${empty} : null}</ul>\n${list}`,
    ],
  ])('refuses the duplicate wrapper with %s', async (_name, children) => {
    const result = await findings(children)
    expect(result).toMatchObject([{ severity: 2, line: 3, messageId: 'duplicate' }])
    expect(result[0].message).toContain('at line 4')
  })

  it.each([
    ['a single list wrapper', `<ul ${wrapper}>{result.rows?.length ? ${items} : ${empty}}</ul>`],
    [
      'a separate empty status',
      `{!result.rows?.length && <p role="status">No matching products.</p>}\n${list}`,
    ],
    [
      'mutually exclusive siblings',
      `{!result.rows?.length && ${fallback}}\n{Boolean(result.rows?.length) && ${list}}`,
    ],
    ['another collection', `${fallback.replace('result.rows', 'result.featured')}\n${list}`],
    ['two lists that both contain items', `${list}\n${list}`],
    ['different wrapper classes', `${fallback.replace('divided', 'compact')}\n${list}`],
    [
      'a nonbreaking space inside a class token',
      `${fallback.replace('catalog-grid divided', 'catalog-grid\u00a0divided')}\n${list}`,
    ],
    [
      'a wrapper with its own accessible name',
      `${fallback.replace('<ul', '<ul aria-label="Search messages"')}\n${list}`,
    ],
    [
      'a class overridden by a spread',
      `${fallback}\n${list.replace(wrapper, `${wrapper} {...result.listProps}`)}`,
    ],
    ['repeated calls that may disagree', `{canRender() && ${fallback}}\n{canRender() && ${list}}`],
  ])('allows %s', async (_name, children) => {
    expect(await findings(children)).toEqual([])
  })
})

describe('the config', () => {
  it('rejects copying a package method contract through an unknown assertion', async () => {
    const [result] = await eslint.lintText(
      "import { provider } from '@molecule/app-markdown-marked'\n" +
        'export const renderer = provider as unknown as { render(input: string): string }\n',
      { filePath: join(dir, 'src/markdown.ts') },
    )
    expect(
      result.messages.filter((message) => message.messageId === 'erasedPackageType'),
    ).toMatchObject([{ severity: 2, line: 2, ruleId: 'molecule-local/prefer-declared-clients' }])
  })

  it('autofixes a storage catch once without changing its fallback', async () => {
    const source = [
      'export function readToken(): string | null {',
      '  try {',
      "    const token = window.localStorage.getItem('token')",
      "    return token && token.trim() !== '' ? token : null",
      '  } catch /* storage may be unavailable */ {',
      '    return null',
      '  }',
      '}',
      '',
    ].join('\n')
    const [before] = await eslint.lintText(source, { filePath: 'storage.ts' })
    expect(before.messages.map((message) => message.ruleId)).toContain(
      'molecule-local/require-catch-binding',
    )
    const fixer = new ESLint({
      cwd: dir,
      overrideConfigFile: join(dir, 'eslint.config.mjs'),
      overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
      fix: true,
    })
    const [fixed] = await fixer.lintText(source, { filePath: 'storage.ts' })
    expect(fixed.messages).toEqual([])
    expect(fixed.output).toBe(source.replace('catch /*', 'catch (_error) /*'))
    const [again] = await fixer.lintText(fixed.output!, { filePath: 'storage.ts' })
    expect(again.messages).toEqual([])
    expect(again.output).toBeUndefined()
  })

  it('allows both standard Express Request augmentations', async () => {
    const [result] = await eslint.lintText(
      [
        'declare global {',
        '  namespace Express {',
        '    interface Request {',
        '      conduitUserId?: string',
        '    }',
        '  }',
        '}',
        '',
        "declare module 'express-serve-static-core' {",
        '  interface Request {',
        '    conduitUserId?: string',
        '  }',
        '}',
        '',
        'export {}',
        '',
      ].join('\n'),
      { filePath: 'augmentation.ts' },
    )
    expect(result.messages).toEqual([])
  })

  describe("React's hook rules follow the workspace's React dependency", () => {
    // An Angular binding's `use*` calls belong in a component field initializer (its
    // injection context); React's rule calls that "a hook in a class component".
    const angularPage = [
      "import { useAuth } from '@molecule/app-angular'",
      '',
      'export class LoginPage {',
      '  readonly auth = useAuth()',
      '}',
      '',
    ].join('\n')

    /** Lints `source` in a workspace whose manifest has these dependencies. */
    async function lintIn(
      dependencies: Record<string, string>,
      source: string,
    ): Promise<ESLint.LintResult> {
      const workspace = await lintProject({ dependencies })
      try {
        const [result] = await workspace.engine.lintText(source, {
          filePath: join(workspace.root, 'src/login.page.ts'),
        })
        return result
      } finally {
        await workspace.remove()
      }
    }

    it('reports a hook call in a class in a workspace that depends on React', async () => {
      const result = await lintIn({ react: '19.2.4' }, angularPage)
      expect(result.messages.map((m) => m.ruleId)).toContain('react-hooks/rules-of-hooks')
    })

    it('leaves an Angular binding call in a field initializer alone', async () => {
      const result = await lintIn(
        { '@angular/core': '21.0.0', '@molecule/app-angular': '1.0.0' },
        angularPage,
      )
      expect(result.messages.filter((m) => m.ruleId?.startsWith('react-hooks/'))).toEqual([])
    })

    it('still resolves a react-hooks disable comment where the rules are off', async () => {
      const result = await lintIn(
        { vue: '3.5.0' },
        [
          '// eslint-disable-next-line react-hooks/exhaustive-deps',
          'export const ready = true',
          '',
        ].join('\n'),
      )
      expect(result.messages.map((m) => m.message).join('\n')).not.toMatch(/not found/)
    })
  })

  it('still fails a namespace declaration without `declare`', async () => {
    const [result] = await eslint.lintText('namespace Foo {\n  export const x = 1\n}\n', {
      filePath: 'plain.ts',
    })
    expect(result.messages.map((m) => m.ruleId)).toContain('@typescript-eslint/no-namespace')
  })

  describe('molecule-local/router-commits-with-url', () => {
    const ruleId = 'molecule-local/router-commits-with-url'
    const bond = '@molecule/app-routing-react-router'

    const fixer = (): ESLint =>
      new ESLint({
        cwd: dir,
        overrideConfigFile: join(dir, 'eslint.config.mjs'),
        overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
        fix: true,
      })

    const expectFixed = async (source: string, output: string): Promise<void> => {
      const [before] = await eslint.lintText(source, { filePath: 'app.tsx' })
      const messages = before.messages.filter((message) => message.ruleId === ruleId)
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({ severity: 1 })
      expect(messages[0]?.message).toContain(bond)
      expect(messages[0]?.message).toContain('URL and rendered page')

      const [fixed] = await fixer().lintText(source, { filePath: 'app.tsx' })
      expect(fixed.output).toBe(output)
      expect(fixed.messages).toEqual([])

      const [reparsed] = await eslint.lintText(output, { filePath: 'app.tsx' })
      expect(reparsed.messages).toEqual([])
      const transpiled = ts.transpileModule(output, {
        fileName: 'app.tsx',
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
      })
      expect(transpiled.diagnostics).toEqual([])
    }

    const expectReportedWithoutFix = async (
      source: string,
      message = 'This namespace renders a router',
    ): Promise<void> => {
      const [before] = await eslint.lintText(source, { filePath: 'app.tsx' })
      const messages = before.messages.filter((message) => message.ruleId === ruleId)
      expect(messages).toHaveLength(1)
      expect(messages[0]).not.toHaveProperty('fix')
      expect(messages[0]?.message).toContain(message)
      const [fixed] = await fixer().lintText(source, { filePath: 'app.tsx' })
      expect(fixed.output).toBeUndefined()
    }

    const expectNoRouterReport = async (source: string): Promise<void> => {
      const [result] = await eslint.lintText(source, { filePath: 'app.tsx' })
      expect(result.messages.filter((message) => message.ruleId === ruleId)).toEqual([])
    }

    describe('Sol regressions on 670e25510', () => {
      it('1: moves the import without corrupting JSX type arguments', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router'; // @ts-expect-error -- generic JSX regression\nexport const app = <BrowserRouter<unknown> />\n",
          `import { BrowserRouter } from '${bond}'; // @ts-expect-error -- generic JSX regression\nexport const app = <BrowserRouter<unknown> />\n`,
        )
      })

      it('2: moves RouterProvider from react-router/dom to the bond /dom entry', async () => {
        await expectFixed(
          "import { RouterProvider } from 'react-router/dom';\nexport const app = <RouterProvider router={router} />\n",
          `import { RouterProvider } from '${bond}/dom';\nexport const app = <RouterProvider router={router} />\n`,
        )
      })

      it('3: moves the import used through a const alias', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router';\nconst AppRouter = BrowserRouter;\nexport const app = <AppRouter />\n",
          `import { BrowserRouter } from '${bond}';\nconst AppRouter = BrowserRouter;\nexport const app = <AppRouter />\n`,
        )
      })

      it.each(['_Router', '$Router', 'ÉRouter'])(
        '4: preserves the %s import alias',
        async (alias) => {
          await expectFixed(
            `import { BrowserRouter as ${alias} } from 'react-router'\nexport const app = <${alias} />\n`,
            `import { BrowserRouter as ${alias} } from '${bond}'\nexport const app = <${alias} />\n`,
          )
        },
      )

      it('5: moves the import without inspecting a computed spread key', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router'\nRegExp.prototype.toString = () => 'useTransitions'\nexport const app = <BrowserRouter useTransitions={false} {...{ [/x/]: true }} />\n",
          `import { BrowserRouter } from '${bond}'\nRegExp.prototype.toString = () => 'useTransitions'\nexport const app = <BrowserRouter useTransitions={false} {...{ [/x/]: true }} />\n`,
        )
      })
    })

    it('splits a mixed import and moves only router specifiers in order', async () => {
      await expectFixed(
        "import { BrowserRouter as B, Link, RouterProvider, Routes, useNavigate } from 'react-router'\nexport const app = <B><Routes /></B>\nexport { Link, RouterProvider, useNavigate }\n",
        `import { Link, Routes, useNavigate } from 'react-router'\n\nimport { BrowserRouter as B, RouterProvider } from '${bond}'\nexport const app = <B><Routes /></B>\nexport { Link, RouterProvider, useNavigate }\n`,
      )
    })

    // The bond entry each router moves to: React Router's DOM-only routers need
    // `react-dom`, which only the bond's `/dom` entry imports.
    const destination = (component: string, entryPoint: string): string =>
      component === 'HydratedRouter' ||
      (component === 'RouterProvider' && entryPoint !== 'react-router')
        ? `${bond}/dom`
        : bond

    it.each([
      'HashRouter',
      'MemoryRouter',
      'Router',
      'RouterProvider',
      'HydratedRouter',
      'unstable_HistoryRouter',
    ])('moves %s from every supported react-router entry point', async (component) => {
      for (const entryPoint of ['react-router', 'react-router-dom', 'react-router/dom']) {
        await expectFixed(
          `import { ${component} } from '${entryPoint}'\nexport { ${component} }\n`,
          `import { ${component} } from '${destination(component, entryPoint)}'\nexport { ${component} }\n`,
        )
      }
    })

    it.each(['StaticRouter', 'StaticRouterProvider'])(
      'moves the server renderer %s to the bond main entry',
      async (component) => {
        for (const entryPoint of ['react-router', 'react-router-dom']) {
          await expectFixed(
            `import { ${component} } from '${entryPoint}'\nexport { ${component} }\n`,
            `import { ${component} } from '${bond}'\nexport { ${component} }\n`,
          )
        }
      },
    )

    it('says the bond gives the app its molecule router', async () => {
      const [result] = await eslint.lintText(
        'import { StaticRouter } from \'react-router\'\nexport const app = <StaticRouter location="/" />\n',
        { filePath: 'app.tsx' },
      )
      const [message] = result.messages.filter((m) => m.ruleId === ruleId)
      expect(message?.message).toContain('molecule router')
    })

    it('names the /dom entry in the message for a DOM-only router', async () => {
      const [result] = await eslint.lintText(
        "import { HydratedRouter } from 'react-router/dom'\nexport const app = <HydratedRouter />\n",
        { filePath: 'app.tsx' },
      )
      const [message] = result.messages.filter((m) => m.ruleId === ruleId)
      expect(message?.message).toContain(`'${bond}/dom'`)
    })

    it('splits a react-router-dom import across the bond main and /dom entries', async () => {
      await expectFixed(
        'import { BrowserRouter, Link, RouterProvider } from \'react-router-dom\'\nexport const app = <BrowserRouter><Link to="/" /></BrowserRouter>\nexport { RouterProvider }\n',
        `import { Link } from 'react-router-dom'\n\nimport { BrowserRouter } from '${bond}'\nimport { RouterProvider } from '${bond}/dom'\nexport const app = <BrowserRouter><Link to="/" /></BrowserRouter>\nexport { RouterProvider }\n`,
      )
    })

    it.each(['react-router', 'react-router-dom', 'react-router/dom'])(
      'reports a namespace import from %s without a fix',
      async (entryPoint) => {
        await expectReportedWithoutFix(
          `import * as RR from '${entryPoint}'\nexport const app = <RR.BrowserRouter />\n`,
        )
      },
    )

    it.each(['react-router', 'react-router-dom', 'react-router/dom'])(
      'redirects named router re-exports from %s and preserves aliases and other exports',
      async (entryPoint) => {
        await expectFixed(
          `export { BrowserRouter as B, Link, RouterProvider } from '${entryPoint}'\n`,
          entryPoint === 'react-router'
            ? `export { BrowserRouter as B, RouterProvider } from '${bond}'\nexport { Link } from '${entryPoint}'\n`
            : `export { BrowserRouter as B } from '${bond}'\nexport { RouterProvider } from '${bond}/dom'\nexport { Link } from '${entryPoint}'\n`,
        )
      },
    )

    it.each(['react-router', 'react-router-dom', 'react-router/dom'])(
      'leaves unsupported analysis of export-all from %s without a fix',
      async (entryPoint) => {
        await expectNoRouterReport(`export * from '${entryPoint}'\n`)
      },
    )

    it.each(['react-router', 'react-router-dom', 'react-router/dom'])(
      'leaves unsupported analysis of a dynamic import of %s without a fix',
      async (entryPoint) => {
        await expectNoRouterReport(
          `const { BrowserRouter } = await import('${entryPoint}')\nexport const app = <BrowserRouter />\n`,
        )
      },
    )

    it.each(['react-router', 'react-router-dom', 'react-router/dom'])(
      'leaves unsupported analysis of a zero-expression template-literal dynamic import of %s',
      async (entryPoint) => {
        await expectNoRouterReport(
          'const { BrowserRouter } = await import(`' +
            entryPoint +
            '`)\nexport const app = <BrowserRouter />\n',
        )
      },
    )

    it('leaves non-static and non-router template-literal imports untouched', async () => {
      await expectNoRouterReport(
        "const suffix = 'router'\nconst dynamic = await import(`react-${suffix}`)\nconst local = await import(`./local-router.js`)\nexport { dynamic, local }\n",
      )
    })

    it('leaves non-router imports, re-exports, and dynamic imports untouched', async () => {
      await expectNoRouterReport(
        "import { Link, Routes, useNavigate } from 'react-router'\nexport { Link, Routes, useNavigate }\nexport { Link as AnotherLink } from 'react-router'\nexport * from './local-router.js'\nconst local = await import('./local-router.js')\nexport { local }\n",
      )
    })

    it('leaves a local component named BrowserRouter untouched', async () => {
      await expectNoRouterReport(
        'const BrowserRouter = () => <div />\nexport const router = <BrowserRouter />\n',
      )
    })

    it('leaves type-only router imports and re-exports untouched', async () => {
      await expectNoRouterReport(
        "import type * as RR from 'react-router'\nimport type { BrowserRouter } from 'react-router'\nimport { type RouterProvider, Routes } from 'react-router/dom'\nexport type { BrowserRouter, BrowserRouterProps } from 'react-router'\nexport { type RouterProvider, type RouterProviderProps } from 'react-router/dom'\nexport type * from 'react-router-dom'\nexport type Props = RR.BrowserRouterProps\nexport type { BrowserRouter, RouterProvider }\nexport { Routes }\n",
      )
    })

    it('does not report a Vue entry that does not use react-router', async () => {
      const source = await readFile(new URL('./fixtures/vue-main.ts.txt', import.meta.url), 'utf8')
      await expectNoRouterReport(source)
    })
  })
})
