import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import {
  analyzeParity,
  newMissing,
  newUnowned,
  staleBaselineEntries,
} from '../check-i18n-parity.js'

const SCRIPTS_DIR = dirname(dirname(fileURLToPath(import.meta.url))) // .../scripts
const ROOT = join(SCRIPTS_DIR, '..')

/**
 * Strip comment-only lines so a `check:i18n-parity` mention that survives in a
 * comment can't satisfy a wiring assertion after the real step is removed —
 * the same defence check-security-workflow.js uses against weakened CI.
 */
function runnableLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

/**
 * The commands the hook hands to `scripts/run-on-index.mjs`, which runs each one
 * against an export of the tree the commit carries (one quoted string per line).
 */
function hookIndexCommands(hook: string): string[] {
  const block = /node scripts\/run-on-index\.mjs((?:\s*\\\n\s*"[^"]*")+)/.exec(runnableLines(hook))
  return block ? [...block[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]) : []
}

describe('i18n parity guard (cross-cutting-i18n)', () => {
  it('reports no NEW missing keys: every literal t() key resolves in its owning bond', () => {
    // newMissing() = keys used in code via a literal `t('ns.key')` whose
    // namespace is owned by exactly one locale bond, but absent from that
    // bond's en.ts AND not in the accepted-debt baseline. It must be empty: a
    // non-empty result means a user-facing string shipped as an inline
    // defaultValue without ever being added to its companion locale bond, so
    // every non-English locale is silently stuck on English for that surface.
    expect(newMissing()).toEqual([])
  })

  it('reports no NEW unowned keys: every literal t() namespace has a locale bond', () => {
    // newUnowned() = literal `t('ns.key')` keys whose namespace NO locale bond
    // defines at all, minus the accepted-debt baseline. The missing check above
    // cannot see these (it needs an owner bond to look in), so without this a
    // package can ship text with no companion bond and every non-English locale
    // shows English for it.
    expect(newUnowned()).toEqual([])
  })

  it('keeps no fixed entry in the baseline, so a fixed key cannot go missing again unnoticed', () => {
    expect(staleBaselineEntries()).toEqual([])
    // The comparison itself: an entry the tree no longer reports is stale.
    expect(
      staleBaselineEntries(
        { missing: ['app/x::x.a', 'app/x::x.b'], unowned: ['api::y.c'] },
        { missing: ['app/x::x.b'], unowned: [] },
      ),
    ).toEqual(['app/x::x.a', 'api::y.c'])
  })

  describe('on a fixture tree', () => {
    const roots: string[] = []
    afterEach(() => {
      for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
    })

    /** Writes a file under a fresh fixture root, creating its directories. */
    const write = (root: string, path: string, text: string): void => {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), text)
    }

    /** A repo with one bond owning `owned.*` and one package using both namespaces. */
    const fixture = (): string => {
      const root = mkdtempSync(join(tmpdir(), 'i18n-parity-'))
      roots.push(root)
      write(
        root,
        'packages/app/locales/owned/src/en.ts',
        "export const en = {\n  'owned.title': 'Title',\n}\n",
      )
      write(
        root,
        'packages/app/features/widget/src/widget.ts',
        [
          "t('owned.title', undefined, { defaultValue: 'Title' })",
          "t('owned.subtitle', undefined, { defaultValue: 'Subtitle' })",
          "t('bondless.label', undefined, { defaultValue: 'Label' })",
          '',
        ].join('\n'),
      )
      return root
    }

    it('reports a namespace no bond owns as unowned, and an owned one as missing', () => {
      const { missing, unowned } = analyzeParity(fixture())
      expect(unowned).toEqual(['app::bondless.label'])
      expect(missing).toEqual(['app/owned::owned.subtitle'])
    })

    it('counts a key thrown through new I18nError as a use', () => {
      // A package throws a translatable error as `new I18nError(key, values, English)`; the
      // key was never counted, so one used only there read as an orphan and a missing one as fine.
      const root = fixture()
      write(
        root,
        'packages/app/core/thrower/src/client.ts',
        ['throw new I18nError(', "  'owned.thrown',", '  undefined,', "  'Thrown',", ')', ''].join(
          '\n',
        ),
      )
      expect(analyzeParity(root).missing).toEqual([
        'app/owned::owned.subtitle',
        'app/owned::owned.thrown',
      ])
    })

    it('ignores a private package, whose keys never reach an app', () => {
      const root = fixture()
      write(root, 'packages/app/frameworks/harness/package.json', '{ "private": true }\n')
      write(
        root,
        'packages/app/frameworks/harness/src/cases.ts',
        "t('owned.placeholder')\nt('bondless.placeholder')\n",
      )
      const { missing, unowned } = analyzeParity(root)
      expect(missing).toEqual(['app/owned::owned.subtitle'])
      expect(unowned).toEqual(['app::bondless.label'])
    })

    it('does not count a key in a documentation comment as usage', () => {
      const root = fixture()
      write(
        root,
        'packages/app/frameworks/binding/src/translate.ts',
        [
          '/**',
          ' * @example',
          " * <h1>{{ t('welcome.title', { name: 'User' }) }}</h1>",
          ' */',
          "// t('greeting.hello')",
          "export const label = t('bondless.other')",
          '',
        ].join('\n'),
      )
      // The code line in the same file still counts.
      expect(analyzeParity(root).unowned).toEqual(['app::bondless.label', 'app::bondless.other'])
    })

    it('reports a key that no bond sharing its namespace defines', () => {
      // Two bonds own `shared.*`; neither defines shared.missing, so it is missing
      // whichever bond should hold it. shared.inSecond is defined by one, so it is not.
      const root = fixture()
      write(
        root,
        'packages/app/locales/first/src/en.ts',
        "export const en = {\n  'shared.a': 'A',\n}\n",
      )
      write(
        root,
        'packages/app/locales/second/src/en.ts',
        "export const en = {\n  'shared.inSecond': 'B',\n}\n",
      )
      write(
        root,
        'packages/app/frameworks/kit/src/kit.ts',
        "t('shared.inSecond')\nt('shared.missing')\n",
      )
      expect(analyzeParity(root).missing).toEqual([
        'app/first|app/second::shared.missing',
        'app/owned::owned.subtitle',
      ])
    })

    it('owns an API key only through an API bond', () => {
      // The app bond defines owned.title, but an API package cannot load an app bond.
      const root = fixture()
      write(root, 'packages/api/resources/widget/src/handler.ts', "t('owned.title')\n")
      expect(analyzeParity(root).unowned).toEqual(['api::owned.title', 'app::bondless.label'])
    })

    it('reads keys from Svelte and Vue single-file components', () => {
      const root = fixture()
      write(
        root,
        'packages/app/frameworks/svelte-ui/src/Banner.svelte',
        "<button>{t('bondless.svelte', {}, { defaultValue: 'Retry' })}</button>\n",
      )
      write(
        root,
        'packages/app/frameworks/vue-ui/src/Banner.vue',
        "<template><button>{{ t('bondless.vue') }}</button></template>\n",
      )
      expect(analyzeParity(root).unowned).toEqual([
        'app::bondless.label',
        'app::bondless.svelte',
        'app::bondless.vue',
      ])
    })

    it('stops reporting the namespace once a bond defines it', () => {
      const root = fixture()
      write(
        root,
        'packages/app/locales/bondless/src/en.ts',
        "export const en = {\n  'bondless.label': 'Label',\n}\n",
      )
      expect(analyzeParity(root).unowned).toEqual([])
    })
  })

  it('is actually invoked by the CI build job — not merely defined as an npm script', () => {
    const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
    expect(runnableLines(ci)).toMatch(/run:\s*npm run check:i18n-parity\b/)
  })

  it('is invoked by the husky pre-commit hook', () => {
    const hookPath = join(ROOT, '.husky', 'pre-commit')
    expect(existsSync(hookPath)).toBe(true)
    // The hook runs it on the tree the commit carries (run-on-index.mjs), not
    // the shared worktree; the script and its --check flag must both be there.
    expect(hookIndexCommands(readFileSync(hookPath, 'utf8'))).toContain(
      'scripts/check-i18n-parity.js --check',
    )
  })
})
