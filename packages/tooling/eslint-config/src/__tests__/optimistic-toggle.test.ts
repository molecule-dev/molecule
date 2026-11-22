import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ESLint, type Linter, RuleTester } from 'eslint'
import ts from 'typescript'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

import {
  createOptimisticValue,
  type OptimisticValue,
  type OptimisticValueOptions,
} from '@molecule/app-state'

import { moleculeLocalPlugin } from '../plugin.mjs'
import { lintProject } from './project.js'

/**
 * The rule that names `useOptimisticValue` for a hand-rolled server-backed toggle that
 * changes the button at once. The invalid cases include the shapes of X1 runs whose "should
 * unfavorite an article" test failed (l1285, l1296, l1297, 2026-11-04) and non-X1 toggles (a
 * grocery checkbox, a setting switch, a star button). Controls that display the saved response
 * are valid.
 */
const project = await lintProject({
  dependencies: { '@molecule/app-react': '1.0.0', '@molecule/app-routing-react-router': '1.0.0' },
})
afterAll(() => project.remove())
const { root: dir, configFile: configPath } = project

const rule = moleculeLocalPlugin.rules?.['server-toggles-use-optimistic-value']
const ruleId = 'molecule-local/server-toggles-use-optimistic-value'
// These fixture functions model transports implemented in other files. Declare that contract
// explicitly; source names alone are not evidence that an arbitrary callback persists.
const fixturePersistence = [
  'favoriteArticle',
  'toggleLike',
  'favorite',
  'client.post',
  'client.delete',
  'followUser',
  'setFollow',
  'setFavorite',
  'http.delete',
  'http.post',
  'http.patch',
  'http.put',
  'http.request',
  'persistSettings',
  'saveSettings',
  'request',
  'api.favorite',
  'api.unfavorite',
  'http().post',
  'http().delete',
  'api.follow',
  'api.unfollow',
]

const retained = JSON.parse(
  await readFile(new URL('./fixtures/optimistic-toggle-races.json', import.meta.url), 'utf8'),
) as Record<string, string>

/** Compile the generated migration as a strict consumer, with this component's API shapes. */
function rewriteDiagnostics(message: string): string[] {
  const snippet = /```tsx\n([\s\S]*?)```/.exec(message)?.[1]
  if (!snippet) return ['missing component rewrite']
  const file = join(import.meta.dirname, '__optimistic-rewrite__.tsx')
  const source = `import { useOptimisticValue } from '@molecule/app-react'
type ArticleSummary = { slug: string; favorited: boolean; favoritesCount: number }
type Profile = { username: string; following: boolean }
declare const article: ArticleSummary
declare const profile: Profile | null
declare const favorited: boolean, favoritesCount: number, slug: string
declare const onChanged: ((...args: unknown[]) => void) | undefined
declare const onChange: ((...args: unknown[]) => void) | undefined
declare function favoriteArticle(slug: string, next: boolean): Promise<ArticleSummary>
declare function setFavorite(slug: string, next: boolean): Promise<ArticleSummary>
declare function setFollow(username: string, next: boolean): Promise<Profile>
declare const http: { post(path: string): Promise<{ data: { article: ArticleSummary } }>; delete(path: string): Promise<{ data: { article: ArticleSummary } }> }
declare const api: { favorite(slug: string): Promise<{ article: ArticleSummary }>; unfavorite(slug: string): Promise<{ article: ArticleSummary }> }
function Component() { ${snippet} }
`
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (name, version, onError, fresh) =>
    name === file
      ? ts.createSourceFile(name, source, version, true, ts.ScriptKind.TSX)
      : original(name, version, onError, fresh)
  return ts
    .getPreEmitDiagnostics(ts.createProgram([file], options, host))
    .filter((diagnostic) => diagnostic.file?.fileName === file)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/** X1 l1296 (2026-11-04): each click sends its own request and sets state from its response. */
const favoriteButton = `import { useState } from 'react'
import { useHttpClient } from '@molecule/app-react'

export function FavoriteButton({ article }: { article: Article }) {
  const http = useHttpClient()
  const [favorited, setFavorited] = useState(article.favorited)
  const toggle = async () => {
    const next = !favorited
    setFavorited(next)
    const response = next
      ? await http.post(\`/articles/\${article.slug}/favorite\`)
      : await http.delete(\`/articles/\${article.slug}/favorite\`)
    setFavorited(response.data.article.favorited)
  }
  return <button onClick={toggle}>{favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`

const splitToggle = `import { useState } from 'react'
import { savePreference as save } from './preferences.js'

export function Alerts({ preference }) {
  const [enabled, setEnabled] = useState(preference.enabled)
  const toggle = async () => {
    const next = !enabled
    setEnabled(next)
    const confirmed = await save(preference.id, next)
    setEnabled(confirmed.enabled)
  }
  return <button onClick={toggle}>{enabled ? 'Turn off' : 'Turn on'}</button>
}`

const splitWriter = `import { getClient as getHttp } from '@molecule/app-http'
const http = () => getHttp()

export async function savePreference(id: string, enabled: boolean) {
  const path = '/preferences/' + id
  const response = enabled ? await http().post(path) : await http().delete(path)
  return response.data
}`

describe('molecule-local/server-toggles-use-optimistic-value', () => {
  describe('writes delegated to an imported function', () => {
    async function lintToggle(
      name: string,
      component: string,
      adapter: string,
    ): Promise<Linter.LintMessage[]> {
      const folder = join(dir, name)
      await mkdir(folder)
      await writeFile(join(folder, 'preferences.ts'), adapter)
      const eslint = new ESLint({ cwd: dir, overrideConfigFile: configPath })
      const [result] = await eslint.lintText(component, { filePath: join(folder, 'Alerts.tsx') })
      expect(result.messages.filter((message) => message.fatal)).toEqual([])
      return result.messages.filter((message) => message.ruleId === ruleId)
    }

    it('finds an early display update even when the mutation lives in a sibling module', async () => {
      const messages = await lintToggle('split-write', splitToggle, splitWriter)
      expect(messages).toHaveLength(1)
      // An error: the shipped config fails `npm run lint` on this toggle (a warning did not).
      expect(messages[0]).toMatchObject({ line: 9, severity: 2 })
      expect(messages[0]?.message).toContain('Use the generated toggle hook')
      expect(messages[0]?.message).toContain('wait for the save before navigating')
      expect(messages[0]?.message).toContain('await save(')
    })

    it('names an imported DELETE-for-true branch before recommending a toggle migration', async () => {
      const reversed = splitWriter.replace(
        'await http().post(path) : await http().delete(path)',
        'await http().delete(path) : await http().post(path)',
      )
      const messages = await lintToggle('inverted-write', splitToggle, reversed)
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({ line: 9, severity: 2 })
      expect(messages[0]?.message).toContain(
        'inverted-write/preferences.ts:6 sends DELETE for true and POST for false',
      )
      expect(messages[0]?.message).toContain('use the generated resource setter')
      expect(messages[0]?.message).not.toContain('```tsx')
    })

    it('keeps custom actions on different paths out of the direction advice', async () => {
      const distinct = splitWriter.replace(
        'await http().post(path) : await http().delete(path)',
        "await http().delete(path) : await http().post('/pending-preferences')",
      )
      const messages = await lintToggle('distinct-paths', splitToggle, distinct)
      expect(messages).toHaveLength(1)
      expect(messages[0]?.message).toContain('await save(')
      expect(messages[0]?.message).not.toContain('sends DELETE for true')
    })

    it('allows rendering the saved flag after acknowledgment', async () => {
      const confirmed = splitToggle.replace('    setEnabled(next)\n', '')
      expect(await lintToggle('confirmed-write', confirmed, splitWriter)).toEqual([])
    })

    it('keeps an imported read-only adapter quiet', async () => {
      const read = splitWriter.replaceAll(/\.(post|delete)\(/g, '.get(')
      expect(await lintToggle('split-read', splitToggle, read)).toEqual([])
    })

    it('keeps unrelated writes that ignore the changed flag quiet', async () => {
      const telemetry = `import { getClient } from '@molecule/app-http'
export async function savePreference(id: string, enabled: boolean) {
  await getClient().post('/events', { id })
  return { enabled }
}`
      expect(await lintToggle('unrelated-write', splitToggle, telemetry)).toEqual([])
    })

    it('keeps a local client shadowing the HTTP factory quiet', async () => {
      const local = `import { getClient } from '@molecule/app-http'
export async function savePreference(id: string, enabled: boolean) {
  const getClient = () => ({ post: (id: string) => ({ data: { enabled, id } }) })
  return getClient().post(id).data
}`
      expect(await lintToggle('local-shadow', splitToggle, local)).toEqual([])
    })
  })

  it('rejects the retained P358 enabled busy guard once, as a default native error', async () => {
    const eslint = new ESLint({ cwd: dir, overrideConfigFile: configPath })
    const source = await readFile(
      new URL('./fixtures/p358-l2728-ArticlePreview.tsx.txt', import.meta.url),
      'utf8',
    )
    const [result] = await eslint.lintText(source, { filePath: 'ArticlePreview.tsx' })
    const messages = result.messages.filter((row) => row.messageId === 'droppedAction')
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      ruleId: 'molecule-local/no-dropped-action',
      severity: 2,
      line: 56,
    })
  })

  it('counterexample: the retained callback can deliberately disable its pending control', async () => {
    const eslint = new ESLint({ cwd: dir, overrideConfigFile: configPath })
    const source = await readFile(
      new URL('./fixtures/p358-l2728-ArticlePreview.tsx.txt', import.meta.url),
      'utf8',
    )
    const [result] = await eslint.lintText(
      source.replace('onClick={toggle}', 'disabled={busy} onClick={toggle}'),
      {
        filePath: 'ArticlePreview.tsx',
      },
    )
    expect(
      result.messages.filter((row) => row.ruleId === 'molecule-local/no-dropped-action'),
    ).toEqual([])
  })

  it.each([false, true, null])(
    'preserves both boolean values in the retained nullable follow rewrite, starting at %s',
    async (initial) => {
      const eslint = new ESLint({
        cwd: dir,
        overrideConfigFile: configPath,
        overrideConfig: {
          rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
        },
      })
      const source = await readFile(
        new URL('./fixtures/p318-l2406-Profile-before.tsx.txt', import.meta.url),
        'utf8',
      )
      const [result] = await eslint.lintText(source, { filePath: 'Profile.tsx' })
      const message = result.messages.find((row) => row.ruleId === ruleId)?.message ?? ''
      const snippet = /```tsx\n([\s\S]*?)```/.exec(message)?.[1]
      expect(snippet).toBeDefined()
      const code = ts.transpileModule(snippet!, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText
      let controller!: OptimisticValue<{ following: boolean | null }>
      const calls: boolean[] = []
      type FollowAnswer = { data: { profile: { following: boolean } } }
      const http = (): {
        post: () => Promise<FollowAnswer>
        delete: () => Promise<FollowAnswer>
      } => ({
        post: async () => {
          calls.push(true)
          return { data: { profile: { following: true } } }
        },
        delete: async () => {
          calls.push(false)
          return { data: { profile: { following: false } } }
        },
      })
      const hook = (
        options: OptimisticValueOptions<{ following: boolean | null }>,
      ): {
        value: { following: boolean | null }
        update: OptimisticValue<{ following: boolean | null }>['update']
      } => {
        controller = createOptimisticValue(options)
        return { value: controller.getState().value, update: controller.update }
      }
      new Function('useOptimisticValue', 'following', 'profile', 'http', code)(
        hook,
        initial,
        { username: 'reader', following: false },
        http,
      )
      await controller.settled()
      expect(calls).toEqual([!initial])
      expect(controller.getState().value.following).toBe(!initial)
    },
  )

  it('rewrites the retained event handler without treating its event as record identity', async () => {
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: configPath,
      overrideConfig: {
        rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
      },
    })
    const source = await readFile(
      new URL('./fixtures/p307-Buttons.tsx.txt', import.meta.url),
      'utf8',
    )
    const [result] = await eslint.lintText(source, { filePath: 'Buttons.tsx' })
    const findings = result.messages.filter((message) => message.ruleId === ruleId)
    expect(findings).toHaveLength(2)
    const favorite = findings[0].message
    expect(favorite).toContain('useOptimisticValue({')
    expect(favorite).not.toContain('keyed by event')
    expect(favorite).not.toContain('event.preventDefault')
    expect(favorite).not.toContain('setBusy(')
    expect(rewriteDiagnostics(favorite)).toEqual([])
  })

  it('a generated notification toggle accepts two clicks while the first save is delayed', async () => {
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: configPath,
      overrideConfig: {
        rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
      },
    })
    const [result] = await eslint.lintText(
      `import { useState } from 'react'
export function NotificationToggle({ settings }) {
  const [enabled, setEnabled] = useState(settings.enabled)
  const [busy, setBusy] = useState(false)
  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault()
    if (busy) return
    const next = !enabled
    setBusy(true)
    setEnabled(next)
    try { const saved = await saveSettings(next); setEnabled(saved.enabled) }
    finally { setBusy(false) }
  }
  return <button onClick={toggle}>{enabled ? 'Disable' : 'Enable'}</button>
}`,
      { filePath: 'NotificationToggle.tsx' },
    )
    const message = result.messages.find((message) => message.ruleId === ruleId)?.message ?? ''
    const snippet = /```tsx\n([\s\S]*?)```/.exec(message)?.[1]
    expect(snippet).toBeDefined()
    const code = ts.transpileModule(snippet ?? '', {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText
    let controller!: OptimisticValue<{ enabled: boolean }>
    const calls: boolean[] = []
    let complete!: (value: { enabled: boolean }) => void
    const first = new Promise<{ enabled: boolean }>((resolve) => {
      complete = resolve
    })
    const saveSettings = async (enabled: boolean): Promise<{ enabled: boolean }> => {
      calls.push(enabled)
      return calls.length === 1 ? first : { enabled }
    }
    const hook = (
      options: OptimisticValueOptions<{ enabled: boolean }>,
    ): {
      value: { enabled: boolean }
      update: OptimisticValue<{ enabled: boolean }>['update']
    } => {
      controller = createOptimisticValue(options)
      return { value: controller.getState().value, update: controller.update }
    }
    new Function('useOptimisticValue', 'settings', 'saveSettings', code)(
      hook,
      { enabled: false },
      saveSettings,
    )
    expect(controller.getState().value.enabled).toBe(true)
    controller.update((current) => ({ enabled: !current.enabled }))
    expect(controller.getState().value.enabled).toBe(false)
    expect(calls).toEqual([true])
    complete({ enabled: true })
    expect(await controller.settled()).toMatchObject({ value: { enabled: false }, pending: false })
    expect(calls).toEqual([true, false])
  })

  it('keeps a save that reads its handler parameter out of a lifted commit', async () => {
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: configPath,
      overrideConfig: {
        rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
      },
    })
    const [result] = await eslint.lintText(
      `import { useState } from 'react'
export function Notifications({ settings }) {
  const [enabled, setEnabled] = useState(settings.enabled)
  const toggle = async (row) => { setEnabled(!enabled); await saveSettings(row.id, !enabled) }
  return <button onClick={() => toggle(settings)} />
}`,
      { filePath: 'Notifications.tsx' },
    )
    const message = result.messages.find((message) => message.ruleId === ruleId)?.message ?? ''
    expect(message).toContain('useOptimisticValue')
    expect(message).not.toContain('```tsx')
    expect(message).toContain('row')
  })

  it.each([
    [
      'functional branch',
      'settings.enabled',
      `setEnabled((old) => !old); if (enabled) await http.delete('/setting'); else await http.post('/setting')`,
    ],
    [
      'block updater',
      'settings.enabled',
      `setEnabled((old) => { return !old }); await saveSettings(!enabled)`,
    ],
    [
      'promise response',
      'settings.enabled',
      `const next = !enabled; setEnabled(next); saveSettings({ enabled: next }).then((saved) => setEnabled(saved.enabled))`,
    ],
    [
      'lazy seed',
      '() => settings.enabled',
      `const next = !enabled; setEnabled(next); await saveSettings(next)`,
    ],
  ])(
    'the generated %s rewrite saves the intended value and waits for the request',
    async (_name, seed, body) => {
      const eslint = new ESLint({
        cwd: dir,
        overrideConfigFile: configPath,
        overrideConfig: {
          languageOptions: { parserOptions: { tsconfigRootDir: dir } },
          rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
        },
      })
      const source = `import { useState } from 'react'
export function Switch({ settings }) {
  const [enabled, setEnabled] = useState(${seed})
  const toggle = async () => { ${body} }
  return <button onClick={toggle} />
}`
      const [result] = await eslint.lintText(source, { filePath: 'Switch.tsx' })
      const finding = result.messages.find((message) => message.ruleId === ruleId)
      expect(finding).toBeDefined()
      const snippet = /```tsx\n([\s\S]*?)```/.exec(finding?.message ?? '')?.[1]
      expect(snippet).toBeDefined()
      let controller: OptimisticValue<{ enabled: boolean }> | undefined
      let resolve!: (value: { enabled: boolean }) => void
      const reply = new Promise<{ enabled: boolean }>((done) => {
        resolve = done
      })
      const calls: unknown[] = []
      const hook = (
        options: OptimisticValueOptions<{ enabled: boolean }>,
      ): {
        value: { enabled: boolean }
        update: OptimisticValue<{ enabled: boolean }>['update']
      } => {
        expect(options.value).toEqual({ enabled: false })
        controller = createOptimisticValue(options)
        return { value: controller.getState().value, update: controller.update }
      }
      const save = (value: unknown): Promise<{ enabled: boolean }> => {
        calls.push(value)
        return reply
      }
      const code = ts.transpileModule(snippet ?? '', {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText
      const apply = new Function('useOptimisticValue', 'settings', 'http', 'saveSettings', code)
      apply(hook, { enabled: false }, { post: () => save(true), delete: () => save(false) }, save)
      expect(calls).toEqual([_name === 'promise response' ? { enabled: true } : true])
      expect(controller?.getState()).toMatchObject({ value: { enabled: true }, pending: true })
      resolve({ enabled: true })
      expect(await controller?.settled()).toMatchObject({
        value: { enabled: true },
        pending: false,
        error: null,
      })
    },
  )
  it.each(['l1375', 'l1383', 'l1416', 'l1372'])(
    'detects the actual retained %s race and names its own state in the rewrite',
    async (run) => {
      const eslint = new ESLint({
        cwd: dir,
        overrideConfigFile: configPath,
        overrideConfig: {
          languageOptions: { parserOptions: { tsconfigRootDir: dir } },
          rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
        },
      })
      const [result] = await eslint.lintText(retained[run], { filePath: 'Retained.tsx' })
      const findings = result.messages.filter((message) => message.ruleId === ruleId)
      expect(findings).toHaveLength(1)
      const message = findings[0].message
      expect(message).toContain('useOptimisticValue({')
      expect(message).toContain('commit: async')
      expect(message).toContain(
        run === 'l1372'
          ? 'setFollow(desiredValue.profile.username'
          : run === 'l1416'
            ? 'favoriteArticle(slug'
            : run === 'l1375'
              ? 'setFavorite(article.slug'
              : 'http.post(',
      )
      expect(message).toContain(
        run === 'l1416' ? 'isFavorited' : run === 'l1372' ? 'profile' : 'favorited',
      )
      if (run !== 'l1372') expect(message).toContain('count')
      expect(rewriteDiagnostics(message)).toEqual([])
    },
  )
  it.each(['direct', 'alias', 'then'])(
    'does not copy an unverified %s single-resource generic into a runnable migration',
    async (shape) => {
      const eslint = new ESLint({
        cwd: dir,
        overrideConfigFile: configPath,
        overrideConfig: {
          rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
        },
      })
      let source = `import {useState} from 'react'
import {unwrapSingle as resource} from '@molecule/app-http'
export function Saved({record, onChange}) {
 const [selected,setSelected]=useState(record.selected)
 const toggle=async()=>{setSelected(!selected); const response=selected ? await http.delete('/saved') : await http.post('/saved'); const saved=resource<Record>(response); onChange(saved)}
 return <button onClick={toggle}>{selected?'Saved':'Save'}</button>
}`
      if (shape === 'alias')
        source = source.replace(
          'const saved=resource<Record>(response)',
          'const alias=response; const saved=resource<Record>(alias)',
        )
      if (shape === 'then')
        source = source.replace(
          "const response=selected ? await http.delete('/saved') : await http.post('/saved'); const saved=resource<Record>(response); onChange(saved)",
          "await (selected ? http.delete('/saved') : http.post('/saved')).then((response) => {const saved=resource<Record>(response); onChange(saved)})",
        )
      const [result] = await eslint.lintText(source, { filePath: 'Saved.tsx' })
      const finding = result.messages.find((m) => m.ruleId === ruleId)
      expect(finding).toBeDefined()
      expect(finding!.message).not.toContain('```tsx')
      expect(finding!.message).toContain('named resource keys')
      expect(finding!.message).toContain('For a bare resource body, keep that resource directly.')
      expect(finding!.message).toContain(
        shape === 'alias' ? 'resource<Record>(alias)' : 'resource<Record>(response)',
      )
    },
  )

  it('keeps a projected saved body and an unrelated cached decode in a runnable migration', async () => {
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: configPath,
      overrideConfig: {
        rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
      },
    })
    const source = `import {useState} from 'react'
import {unwrapSingle as resource} from '@molecule/app-http'
export function Saved({record, onChange}) {
 const [selected,setSelected]=useState(record.selected)
 const toggle=async()=>{setSelected(!selected); const response=selected ? await http.delete('/saved') : await http.post('/saved'); const cached=resource<Record>(cache); onChange(response.data.record)}
 return <button onClick={toggle}>{selected?'Saved':'Save'}</button>
}`
    const [result] = await eslint.lintText(source, { filePath: 'Saved.tsx' })
    const finding = result.messages.find((message) => message.ruleId === ruleId)
    expect(finding?.message).toContain('```tsx')
    expect(finding?.message).not.toContain('First verify the saved resource')
  })

  it('loads from the real template and names the hook', async () => {
    expect(rule).toBeDefined()
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: configPath,
      overrideConfig: {
        languageOptions: { parserOptions: { tsconfigRootDir: dir } },
        rules: { [ruleId]: ['warn', { persistenceFunctions: fixturePersistence }] },
      },
    })
    const [result] = await eslint.lintText(favoriteButton, { filePath: 'FavoriteButton.tsx' })
    const findings = result.messages.filter((message) => message.ruleId === ruleId)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: 1, line: 10 })
    expect(findings[0]?.message).toContain('`useOptimisticValue` from `@molecule/app-react`')
  })

  if (rule) {
    const tester = new RuleTester({
      languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    })

    tester.run('server-toggles-use-optimistic-value', rule, {
      valid: [
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'an initial asynchronous collection load does not establish a refetching toggle',
          filename: 'Pipeline.tsx',
          code: `import { useEffect, useState } from 'react'
export function Pipeline() {
  const [candidates, setCandidates] = useState([])
  useEffect(() => { http.get('/candidates').then((response) => setCandidates(response.data)) }, [])
  const move = async (id, stage) => {
    setCandidates((current) => {
      const target = current.find((candidate) => candidate.id === id)
      if (!target || target.stage === stage) return current
      return current.map((candidate) => candidate.id === id ? { ...candidate, stage } : candidate)
    })
    await http.put('/candidates/' + id, { stage })
  }
  return <Board candidates={candidates} onMove={move} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a local panel disables its busy control while posting analytics',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const toggle = async () => {
    if (busy) return
    setOpen((current) => !current)
    setBusy(true)
    try { await http.post('/analytics', { event: 'open' }) } finally { setBusy(false) }
  }
  return <button disabled={busy} onClick={toggle}>{open ? 'Close' : 'Open'}</button>
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a custom promise queue serializes all requests and reads its current value inside it',
          filename: 'Switch.tsx',
          code: `import { useState, useRef } from 'react'
export function Switch({ settings }) {
  const [enabled, setEnabled] = useState(settings.enabled)
  const current = useRef(settings.enabled)
  const queue = useRef(Promise.resolve())
  const toggle = () => {
    queue.current = queue.current.then(async () => {
      const next = !current.current
      setEnabled(next)
      await saveSettings(next)
      current.current = next
    })
  }
  return <button onClick={toggle}>{String(enabled)}</button>
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'retained l1391 adopted the shared favorite/count and follow controllers',
          filename: 'Buttons.tsx',
          code: retained.l1391,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'opening a local panel while posting unrelated analytics is not a server toggle',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => { setOpen((value) => !value); await http.post('/analytics', { event: 'open' }) }
  return <button onClick={toggle} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'returning a local setter is not a server request',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(false)
  const toggle = () => {
    setOpen(!open)
    return setSelected(!selected)
  }
  return <button onClick={toggle} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'an asynchronous local animation persists no preference',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await animatePanel(next)
  }
  return <button onClick={toggle} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a form submit wrapper calls a draft save',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
export function Settings() {
  const [saved, setSaved] = useState(false)
  const submit = async () => {
    const next = !saved
    setSaved(next)
    await http.put('/settings', { acknowledged: next })
  }
  return <form onSubmit={(event) => { event.preventDefault(); void submit() }} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a controller commit is protected even when it updates local state',
          filename: 'Switch.tsx',
          code: `import { useState } from 'react'
import { createOptimisticValue as optimistic } from '@molecule/app-state'
export function Switch() {
  const [on, setOn] = useState(false)
  const commit = async () => {
    setOn(!on)
    await saveSettings(!on)
  }
  const value = optimistic({ value: on, commit })
  return <button onClick={() => value.update((on) => !on)} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a parameter shadowing a setter is not that setter',
          filename: 'Local.tsx',
          code: `import { useState } from 'react'
export function Local() {
  const [on, setOn] = useState(false)
  async function report(setOn) {
    setOn(!on)
    await saveSettings(!on)
  }
  return <button onClick={() => report(log)} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a local panel toggle awaits analytics but saves no preference',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
import { track } from '@molecule/app-analytics'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await track({ name: 'panel', properties: { open: next } })
  }
  return <button onClick={toggle} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a local panel loads data without persisting its open flag',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await http.get('/preview', { expanded: next })
  }
  return <button onClick={toggle} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a confirmation dialog returns a decision, not a saved switch',
          filename: 'Delete.tsx',
          code: `import { useState } from 'react'
export function Delete() {
  const [open, setOpen] = useState(false)
  const ask = async () => {
    const next = !open
    setOpen(next)
    await confirmDialog(next)
  }
  return <button onClick={ask} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a form submit changes local feedback before saving the draft',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
export function Settings() {
  const [saved, setSaved] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    const next = !saved
    setSaved(next)
    await http.put('/settings', { acknowledged: next })
  }
  return <form onSubmit={submit} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a setter in an uncalled nested function changes nothing before the request',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
export function Settings() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    const next = !on
    const later = () => setOn(next)
    await http.put('/settings', { enabled: next })
    later()
  }
  return <button onClick={toggle} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a local object choosing a method is not a request',
          filename: 'Options.tsx',
          code: `import { useState } from 'react'
export function Options() {
  const [on, setOn] = useState(false)
  const choose = () => {
    setOn(!on)
    const options = { method: on ? 'DELETE' : 'POST' }
    return options
  }
  return <button onClick={choose} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a cyclic promise alias does not crash lint',
          filename: 'Unusual.tsx',
          code: `import { useState } from 'react'
export function Unusual() {
  const [on, setOn] = useState(false)
  const toggle = () => {
    setOn(!on)
    const request = saveSettings(!on)
    const a = b
    const b = a
  }
  return <button onClick={toggle} />
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'the same toggle through useOptimisticValue',
          filename: 'FavoriteButton.tsx',
          code: `import { useOptimisticValue } from '@molecule/app-react'
export function FavoriteButton({ article }) {
  const favorite = useOptimisticValue({
    value: article.favorited,
    commit: async (next) => {
      const response = next ? await http.post(path) : await http.delete(path)
      return response.data.article.favorited
    },
  })
  return <button onClick={() => favorite.update((on) => !on)}>{favorite.value ? 'Unfavorite' : 'Favorite'}</button>
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'separate create and delete actions are not a toggle',
          filename: 'Comments.tsx',
          code: `import { useState } from 'react'
export function Comments({ slug }) {
  const [items, setItems] = useState([])
  const add = async (body) => setItems([...items, await http.post('/comments', { body })])
  const remove = async (id) => {
    await http.delete('/comments/' + id)
    setItems(items.filter((item) => item.id !== id))
  }
  return <CommentList items={items} onAdd={add} onRemove={remove} />
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a controlled checkbox that only reports the flip',
          filename: 'Checkbox.tsx',
          code: `export function Checkbox({ checked, onChange }) {
  return <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} />
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a local panel toggle beside an unrelated awaited call',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await track('panel-toggled')
  }
  return <button onClick={toggle}>{open ? 'Close' : 'Open'}</button>
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'an editor choosing create or update is not a toggle',
          filename: 'Editor.tsx',
          code: `import { useState } from 'react'
export function Editor({ article }) {
  const [draft] = useState(article ?? {})
  const isNew = !article
  const save = async () => {
    const saved = isNew ? await createArticle(draft) : await updateArticle(article.slug, draft)
    navigate('/article/' + saved.slug)
  }
  return <form onSubmit={save} />
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'an empty-field guard before a save',
          filename: 'NewComment.tsx',
          code: `import { useState } from 'react'
export function NewComment() {
  const [body, setBody] = useState('')
  const submit = async () => {
    if (!body) return
    await http.post('/comments', { body })
    setBody('')
  }
  return <form onSubmit={submit} />
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'an API client module chooses the request for a caller-supplied flag',
          filename: 'api.ts',
          code: `export function setFollowing(username: string, following: boolean) {
  const path = '/profiles/' + username + '/follow'
  return following ? client.post(path) : client.delete(path)
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a star saved first and shown after the refetch',
          filename: 'BoardDetail.tsx',
          code: `import { useState } from 'react'
export function BoardDetail({ initial }) {
  const [board, setBoard] = useState(initial)
  const handleStar = async () => {
    await http.patch('/api/boards/' + board.id, { is_starred: !board.is_starred })
    setBoard(await load(board.id))
  }
  return <button onClick={handleStar}>{board.is_starred ? 'Unstar' : 'Star'}</button>
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'an HTTP method chosen between DELETE and POST, shown after the answer',
          filename: 'ArticlePreview.tsx',
          code: `export function ArticlePreview({ article, onChange }) {
  async function toggleFavorite() {
    const response = await http.request({
      method: article.favorited ? 'DELETE' : 'POST',
      url: '/articles/' + article.slug + '/favorite',
    })
    onChange(response.data.article)
  }
  return <button onClick={() => void toggleFavorite()}>{article.favoritesCount}</button>
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a negated option that is not the field it sets',
          filename: 'Login.tsx',
          code: `import { useState } from 'react'
export function Login() {
  const [skipRemember] = useState(false)
  const submit = async () => {
    await http.post('/login', { remember: !skipRemember ? 'yes' : 'no' })
  }
  return <form onSubmit={submit} />
}
`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a non-optimistic server toggle disables the button until the answer',
          filename: 'SettingsSwitch.tsx',
          code: `import { useState } from 'react'
export function SettingsSwitch({ settings }) {
  const [enabled, setEnabled] = useState(settings.enabled)
  const [saving, setSaving] = useState(false)
  const toggle = async () => {
    if (saving) return
    setSaving(true)
    try { const saved = await saveSettings({ enabled: !enabled }); setEnabled(saved.enabled) }
    finally { setSaving(false) }
  }
  return <button role="switch" disabled={saving} onClick={toggle}>{String(enabled)}</button>
}`,
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'X1 l1259 shape: a follow button that changes only when the server answers',
          filename: 'Profile.tsx',
          code: `import { useState } from 'react'
export function Profile({ initial }) {
  const [profile, setProfile] = useState(initial)
  async function toggleFollow() {
    setProfile(await setFollowing(profile.username, !profile.following))
  }
  return <button onClick={() => void toggleFollow()}>{profile.following ? 'Unfollow' : 'Follow'}</button>
}
`,
        },
      ],
      invalid: [
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a toggle chooses POST or DELETE with an if statement',
          filename: 'Bookmark.tsx',
          code: `import { useState } from 'react'
export function Bookmark({ item }) {
  const [saved, setSaved] = useState(item.saved)
  const toggle = async () => {
    setSaved((current) => !current)
    if (saved) await http.delete('/bookmarks/' + item.id)
    else await http.post('/bookmarks/' + item.id)
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'non-X1: a refetch effect overwrites the settings switch while its save runs',
          filename: 'SettingsSwitch.tsx',
          code: `import { useState, useEffect } from 'react'
export function SettingsSwitch({ settings, refresh }) {
  const [enabled, setEnabled] = useState(settings.enabled)
  useEffect(() => { setEnabled(settings.enabled) }, [settings.enabled, refresh])
  const toggle = async () => {
    setEnabled((current) => !current)
    await persistSettings()
  }
  return <button role="switch" onClick={toggle}>{String(enabled)}</button>
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a non-async handler returns the save promise',
          filename: 'Switch.tsx',
          code: `import { useState } from 'react'
export function Switch() {
  const [on, setOn] = useState(false)
  const toggle = () => {
    const next = !on
    setOn(next)
    return http.put('/settings', { on: next })
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a request options object chooses DELETE versus PUT',
          filename: 'Switch.tsx',
          code: `import { useState } from 'react'
export function Switch() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    setOn(!on)
    const options = { method: on ? 'DELETE' : 'PUT', url: '/flag' }
    await http.request(options)
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'an unused optimistic helper import does not exempt a racing handler',
          filename: 'FavoriteButton.tsx',
          code: `import { useOptimisticValue } from '@molecule/app-react'\n${favoriteButton}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a protected sibling does not exempt another server toggle',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
import { createOptimisticValue } from '@molecule/app-state'
export function Settings() {
  const safe = createOptimisticValue({ value: false, commit: saveSafe })
  const [on, setOn] = useState(false)
  const toggle = async () => {
    setOn(!on)
    await saveSettings(!on)
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'DELETE versus POST chosen from the current value',
          filename: 'FavoriteButton.tsx',
          code: `import { useState } from 'react'
export function FavoriteButton() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    setOn(!on)
    await (on ? http.delete('/favorite') : http.post('/favorite'))
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'a TypeScript satisfies expression retains its toggled value',
          filename: 'Switch.tsx',
          code: `import { useState } from 'react'
export function Switch() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    const next = (!on) satisfies boolean
    setOn(next)
    await http.put('/settings', { on: next })
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'X1 l1296: a request chosen by the toggled value, each response applied',
          filename: 'FavoriteButton.tsx',
          code: favoriteButton,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'X1 l1297: a toggled value held in a variable and passed to the save',
          filename: 'FavoriteButton.tsx',
          code: `import { useState } from 'react'
export function FavoriteButton({ slug, article }) {
  const [state, setState] = useState(article)
  const toggle = async () => {
    const before = state
    const next = !before.favorited
    setState({ ...before, favorited: next })
    const { article: saved } = await favorite(slug, next)
    setState(saved)
  }
  return <button onClick={toggle}>{state.favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'X1 l1285: an unawaited request whose promise is caught',
          filename: 'Conduit.tsx',
          code: `import { useState } from 'react'
export function FavoriteButton({ slug, favorited }) {
  const [state, setState] = useState({ favorited })
  const toggle = (): void => {
    const next = !state.favorited
    setState((current) => ({ favorited: !current.favorited }))
    const request = next ? client.post(path) : client.delete(path)
    request.catch(() => {})
  }
  return <button onClick={toggle}>{state.favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'the HTTP method chosen between DELETE and POST after the button changed',
          filename: 'ArticlePreview.tsx',
          code: `import { useState } from 'react'
export function ArticlePreview({ article }) {
  const [favorited, setFavorited] = useState(article.favorited)
  async function toggleFavorite() {
    setFavorited(!favorited)
    const response = await http.request({
      method: favorited ? 'DELETE' : 'POST',
      url: '/articles/' + article.slug + '/favorite',
    })
    setFavorited(response.data.article.favorited)
  }
  return <button onClick={() => void toggleFavorite()}>{favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'non-X1: a grocery checkbox flipped in the list, then saved from the row',
          filename: 'GroceryList.tsx',
          code: `import { useState } from 'react'
export function GroceryList({ initial }) {
  const [items, setItems] = useState(initial)
  const toggleItem = async (item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
    await http.put('/api/grocery-list/' + item.id, { checked: !item.checked })
  }
  return items.map((item) => <input key={item.id} type="checkbox" checked={item.checked} onChange={() => void toggleItem(item)} />)
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'non-X1: a setting switch whose save is chained with then',
          filename: 'NotificationsSwitch.tsx',
          code: `import { useState } from 'react'
export function NotificationsSwitch({ settings }) {
  const [on, setOn] = useState(settings.notifications)
  const flip = () => {
    const next = !on
    setOn(next)
    saveSettings({ notifications: next }).then((saved) => setOn(saved.notifications))
  }
  return <button role="switch" aria-checked={on} onClick={flip} />
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          options: [{ persistenceFunctions: fixturePersistence }],
          name: 'non-X1: a star button through fetch, reported once per handler',
          filename: 'StarButton.tsx',
          code: `import { useState } from 'react'
export function StarButton({ repo }) {
  const [starred, setStarred] = useState(repo.starred)
  const star = async () => {
    const next = !starred
    setStarred(next)
    await fetch('/repos/' + repo.id + '/star', { method: next ? 'PUT' : 'DELETE' })
    await (next ? notify('starred') : notify('unstarred'))
  }
  return <button onClick={star}>{repo.stars}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
      ],
    })
  }
  describe('refuses the same imported pending-save case through the general action gate', () => {
    const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } })
    tester.run('no-dropped-action', moleculeLocalPlugin.rules!['no-dropped-action']!, {
      valid: [],
      invalid: [
        {
          name: 'non-X1: a like and count flip followed by a pending guard drops the next click',
          filename: 'LikeButton.tsx',
          code: `import { useState } from 'react'
export function LikeButton({ post }) {
  const [liked, setLiked] = useState(post.liked)
  const [count, setCount] = useState(post.likes)
  const [saving, setSaving] = useState(false)
  const toggle = async () => {
    if (saving) return
    setLiked((current) => !current)
    setCount((current) => current + (liked ? -1 : 1))
    setSaving(true)
    try { await toggleLike(post.id) } finally { setSaving(false) }
  }
  return <button onClick={toggle}>{count}</button>
}`,
          errors: [{ messageId: 'droppedAction' }],
        },
      ],
    })
  })
})
